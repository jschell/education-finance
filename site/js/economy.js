// Joint state-conditioned source blocks, explicit Treasury/bill instruments.
import { random } from "./random.js?v=0.10.2";
const mean = (xs) => xs.reduce((a, b) => a + b, 0) / xs.length;
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const variance = (xs) => mean(xs.map((x) => (x - mean(xs)) ** 2));
export function treasuryGross(previousYield, nextYield) {
  if (
    ![previousYield, nextYield].every(
      (y) => Number.isFinite(y) && y >= 0 && y <= 0.25,
    )
  )
    throw Error("Treasury yields must be between 0 and 25%.");
  const loss = -Math.expm1(-10 * Math.log1p(nextYield / 2)),
    discount = 1 - loss;
  const full =
    nextYield === 0
      ? 100 + 500 * previousYield
      : 100 * ((previousYield / nextYield) * loss + discount);
  // Dirty price after one month; remaining coupon dates are 5,11,...,59 months.
  return (full * (1 + nextYield / 2) ** (1 / 6)) / 100;
}
export function billGross(discountQuote) {
  if (
    !Number.isFinite(discountQuote) ||
    discountQuote < 0 ||
    discountQuote > 0.25
  )
    throw Error("Bill discount quote must be between 0 and 25%.");
  return (1 / (1 - (discountQuote * 91) / 360)) ** (365 / (91 * 12));
}
export const returnToBillQuote = (r) =>
  (360 / 91) * (1 - (1 + r) ** (-91 / 365));
function autoregression(pairs, prior = null) {
  const center = mean(pairs.flat()),
    den = pairs.reduce((v, [a]) => v + (a - center) ** 2, 0);
  const numerator = pairs.reduce(
    (v, [a, b]) => v + (a - center) * (b - center),
    0,
  );
  const penalty = prior ? prior.observations * variance(pairs.flat()) : 0;
  const phi = clamp(
    den + penalty
      ? (numerator + penalty * (prior?.phi || 0)) / (den + penalty)
      : 0,
    0,
    0.995,
  );
  return { center, phi };
}
export function fitEconomy(years, options = {}) {
  if (years.length < 10)
    throw Error("At least ten complete source years are required.");
  const inflation = autoregression(
    years.map((y) => [y.previousInflation, Math.log(y.inflation)]),
    options.regularized ? { phi: 0.5, observations: 10 } : null,
  );
  const long = autoregression(
    years.flatMap((y) => y.rates.map((r) => [r[0], r[1]])),
    options.regularized ? { phi: 0.95, observations: 120 } : null,
  );
  const short = autoregression(
    years.flatMap((y) => y.rates.map((r) => [r[2], r[3]])),
    options.regularized ? { phi: 0.95, observations: 120 } : null,
  );
  const windows = [];
  for (
    let i = 0;
    i + 10 <= years.length;
    i += options.nonoverlapping ? 10 : 1
  ) {
    const window = years.slice(i, i + 10);
    windows.push([
      mean(window.map((y) => y.stockLog - Math.log(y.inflation))),
      mean(window.map((y) => Math.log(y.inflation))),
      mean(window.flatMap((y) => y.rates.map((r) => r[0]))),
      mean(window.flatMap((y) => y.rates.map((r) => r[2]))),
    ]);
  }
  const centers = [0, 1, 2, 3].map((k) => mean(windows.map((w) => w[k])));
  const deviations = windows.map((w) => w.map((x, k) => x - centers[k]));
  const scales = [
    Math.sqrt(variance(years.map((y) => y.previousInflation))),
    Math.sqrt(variance(years.map((y) => y.rates[0][0]))),
    Math.sqrt(variance(years.map((y) => y.rates[0][2]))),
  ].map((x) => Math.max(0.005, x));
  return {
    inflation,
    long,
    short,
    deviations,
    scales,
    ...(options.nonoverlapping
      ? { windowCount: windows.length, windowOverlap: false }
      : {}),
  };
}
export function blockWeights(years, state, scales, blockYears) {
  return years.slice(0, years.length - blockYears + 1).map((y) => {
    const source = [y.previousInflation, y.rates[0][0], y.rates[0][2]];
    const distance =
      source.reduce((v, x, k) => v + ((state[k] - x) / scales[k]) ** 2, 0) / 3;
    return 0.25 + Math.exp(-distance / 2);
  });
}
const weightedIndex = (weights, u) => {
  let remaining = u * weights.reduce((a, b) => a + b, 0);
  for (let i = 0; i < weights.length; i++) {
    remaining -= weights[i];
    if (remaining < 0) return i;
  }
  return weights.length - 1;
};
export function economyPath(
  years,
  fit,
  initial,
  anchors,
  {
    seed,
    trial,
    blockYears = 3,
    length,
    uncertainty = true,
    conditioned = true,
    innovations = true,
    selectionAnchors = anchors,
  },
) {
  const rand = random((seed ^ Math.imul(trial + 1, 0x9e3779b9)) >>> 0);
  const u = random(
    (seed ^ Math.imul(trial + 1, 0x85ebca6b) ^ 0xc2b2ae35) >>> 0,
  )();
  const draw = uncertainty
    ? fit.deviations[
        Math.min(
          fit.deviations.length - 1,
          Math.floor(u * fit.deviations.length),
        )
      ]
    : [0, 0, 0, 0];
  const target = [
    clamp(
      Math.log1p(anchors.inflation) + draw[1],
      Math.log(0.8),
      Math.log(1.3),
    ),
    clamp(anchors.bonds + draw[2], 0, 0.25),
    clamp(returnToBillQuote(anchors.cash) + draw[3], 0, 0.25),
  ];
  let state = [Math.log1p(initial.inflation), initial.long, initial.short];
  const selectionState = [...state],
    selectionTarget = [
      clamp(
        Math.log1p(selectionAnchors.inflation) + draw[1],
        Math.log(0.8),
        Math.log(1.3),
      ),
      clamp(selectionAnchors.bonds + draw[2], 0, 0.25),
      clamp(returnToBillQuote(selectionAnchors.cash) + draw[3], 0, 0.25),
    ];
  const grossMean = mean(years.map((y) => Math.exp(y.stockLog))),
    stockScale =
      ((1 + anchors.stocks) / grossMean) ** (1 / 12) *
      Math.exp((draw[0] + draw[1]) / 12);
  const result = [];
  let source = 0,
    within = blockYears;
  while (result.length < length) {
    if (within === blockYears) {
      source = weightedIndex(
        conditioned
          ? blockWeights(years, selectionState, fit.scales, blockYears)
          : Array(years.length - blockYears + 1).fill(1),
        rand(),
      );
      within = 0;
    }
    const index = source + within++,
      row = years[index];
    const piInnovation = innovations
      ? Math.log(row.inflation) -
        fit.inflation.center -
        fit.inflation.phi * (row.previousInflation - fit.inflation.center)
      : 0;
    state[0] = clamp(
      target[0] + fit.inflation.phi * (state[0] - target[0]) + piInnovation,
      Math.log(0.8),
      Math.log(1.3),
    );
    selectionState[0] = clamp(
      selectionTarget[0] +
        fit.inflation.phi * (selectionState[0] - selectionTarget[0]) +
        piInnovation,
      Math.log(0.8),
      Math.log(1.3),
    );
    const inflation = Math.exp(state[0]),
      months = [],
      states = [];
    for (let m = 0; m < 12; m++) {
      const r = row.rates[m],
        previousLong = state[1],
        previousShort = state[2];
      const longInnovation = innovations
          ? r[1] - fit.long.center - fit.long.phi * (r[0] - fit.long.center)
          : 0,
        shortInnovation = innovations
          ? r[3] - fit.short.center - fit.short.phi * (r[2] - fit.short.center)
          : 0;
      state[1] = clamp(
        target[1] + fit.long.phi * (previousLong - target[1]) + longInnovation,
        0,
        0.25,
      );
      state[2] = clamp(
        target[2] +
          fit.short.phi * (previousShort - target[2]) +
          shortInnovation,
        0,
        0.25,
      );
      selectionState[1] = clamp(
        selectionTarget[1] +
          fit.long.phi * (selectionState[1] - selectionTarget[1]) +
          longInnovation,
        0,
        0.25,
      );
      selectionState[2] = clamp(
        selectionTarget[2] +
          fit.short.phi * (selectionState[2] - selectionTarget[2]) +
          shortInnovation,
        0,
        0.25,
      );
      months.push([
        innovations
          ? (1 + row.months[m][0]) * stockScale - 1
          : (1 + anchors.stocks) ** (1 / 12) - 1,
        treasuryGross(previousLong, state[1]) - 1,
        billGross(previousShort) - 1,
      ]);
      states.push([state[1], state[2]]);
    }
    result.push({
      index,
      sourceYear: row.year,
      sourceInflation: row.inflation,
      inflation,
      months,
      states,
      expectationDraw: draw,
    });
  }
  return result;
}
