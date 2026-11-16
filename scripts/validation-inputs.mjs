import { fitEconomy, billGross } from "../site/js/economy.js";
const mean = (xs) => xs.reduce((a, b) => a + b, 0) / xs.length;
export function historicalInputs(
  base,
  origin,
  correction = null,
  spread = null,
) {
  if (
    (correction &&
      (correction.cutoff > origin ||
        correction.folds.some((f) => f.target > origin))) ||
    (spread &&
      (spread.cutoff > origin || spread.targetYears.some((y) => y > origin)))
  )
    throw Error("Future error targets cannot enter a historical origin.");
  const b = structuredClone(base);
  b.economy.macroYears = b.economy.macroYears.filter((y) => y.year < origin);
  b.economy.productionYears = b.economy.productionYears?.filter(
    (y) => y.year < origin,
  );
  b.annual = b.annual.filter((y) => y.year < origin);
  b.prices = Object.fromEntries(
    Object.entries(b.prices).map(([s, p]) => [
      s,
      p.filter((x) => x.year <= origin),
    ]),
  );
  const f = fitEconomy(b.economy.macroYears, b.economy.fitting),
    last = b.economy.macroYears.at(-1);
  const anchors = {
    stocks: mean(b.economy.macroYears.map((y) => Math.exp(y.stockLog))) - 1,
    bonds: f.long.center,
    cash: mean(
      b.economy.macroYears.flatMap((y) =>
        y.rates.map((r) => billGross(r[2]) ** 12 - 1),
      ),
    ),
    inflation: Math.expm1(f.inflation.center),
  };
  b.economy.initial = {
    long: last.rates.at(-1)[1],
    short: last.rates.at(-1)[3],
  };
  b.macro.cases = b.macro.cases.map((c) => ({
    ...c,
    anchors: { ...anchors },
    costShift: 0,
  }));
  b.costCorrection = correction;
  b.costUncertainty = spread;
  return b;
}
