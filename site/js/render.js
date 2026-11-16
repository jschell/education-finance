import { samplingRangeText, targetStatus } from "./probability.js?v=0.10.0";
import { resolveScenario } from "./domain.js?v=0.10.0";
import { attendanceCalendar } from "./planning.js?v=0.10.0";
import { gaugeColor } from "./gauge-colors.js?v=0.10.0";
import { PROFILES } from "./history-config.js?v=0.10.0";
import { annualRows, compile, runPath } from "./engine.js?v=0.10.0";
export const money = (x) =>
  x === null
    ? "—"
    : Number.isFinite(x)
      ? new Intl.NumberFormat("en-US", {
          style: "currency",
          currency: "USD",
          maximumFractionDigits: 0,
        }).format(x)
      : "Not attainable";
const pct = (x) =>
  `${(x * 100).toLocaleString("en-US", { maximumFractionDigits: 1 })}%`;
export function el(tag, text = "", className = "") {
  const node = document.createElement(tag);
  if (text !== null) node.textContent = text;
  if (className) node.className = className;
  return node;
}
export function table(caption, headers, rows) {
  const wrap = el("div", "", "table-wrap"),
    t = el("table"),
    cap = el("caption", caption),
    thead = el("thead"),
    tr = el("tr");
  headers.forEach((h) => {
    const th = el("th", h);
    th.scope = "col";
    tr.append(th);
  });
  thead.append(tr);
  t.append(cap, thead);
  const body = el("tbody");
  rows.forEach((row) => {
    const tr = el("tr");
    row.forEach((v, i) => {
      const cell = el(i === 0 ? "th" : "td", String(v));
      if (i === 0) cell.scope = "row";
      tr.append(cell);
    });
    body.append(tr);
  });
  t.append(body);
  wrap.append(t);
  return wrap;
}
function section(title, tag) {
  const s = el("section", "", "result-section"),
    heading = el("div", "", "result-title");
  heading.append(el("h2", title));
  if (tag) heading.append(el("span", tag, "tag"));
  s.append(heading);
  return s;
}
function stats(items) {
  const group = el("div", "", "stats");
  for (const [label, value, note] of items) {
    const n = el("div", "", "stat");
    n.append(el("span", label), el("strong", value));
    if (note) n.append(el("span", note));
    group.append(n);
  }
  return group;
}
function callout(text, warning = false) {
  return el("p", text, `callout${warning ? " warning" : ""}`);
}
function chart(bands) {
  const ns = "http://www.w3.org/2000/svg",
    svg = document.createElementNS(ns, "svg");
  svg.setAttribute("viewBox", "0 0 620 240");
  svg.classList.add("chart");
  svg.setAttribute("role", "img");
  const title = document.createElementNS(ns, "title");
  title.textContent =
    "Savings balance range: 10th to 90th percentile with median. Values are also in the following table.";
  svg.append(title);
  const max = Math.max(1, ...bands.map((x) => x.p90)),
    x = (i) => 65 + (i / Math.max(1, bands.length - 1)) * 535,
    y = (v) => 185 - (v / max) * 155;
  const add = (tag, attrs, text) => {
    const n = document.createElementNS(ns, tag);
    for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, String(v));
    if (text) n.textContent = text;
    svg.append(n);
  };
  for (const frac of [0, 0.5, 1]) {
    const yy = y(max * frac);
    add("line", { x1: 65, y1: yy, x2: 600, y2: yy, stroke: "#dce5dd" });
    add("text", { x: 57, y: yy + 4, "text-anchor": "end" }, money(max * frac));
  }
  const points = [
    ...bands.map((b, i) => `${x(i)},${y(b.p90)}`),
    ...bands.map((b, i) => `${x(i)},${y(b.p10)}`).reverse(),
  ].join(" ");
  add("polygon", { points, fill: "#d9e9df" });
  add("polyline", {
    points: bands.map((b, i) => `${x(i)},${y(b.p50)}`).join(" "),
    fill: "none",
    stroke: "#397e68",
    "stroke-width": 3,
  });
  const ticks = [
    ...new Set([0, Math.floor((bands.length - 1) / 2), bands.length - 1]),
  ];
  for (const i of ticks)
    add(
      "text",
      {
        x: x(i),
        y: 215,
        "text-anchor":
          i === 0 ? "start" : i === bands.length - 1 ? "end" : "middle",
      },
      bands[i].date,
    );
  return svg;
}
export function deterministicView(plan, student, scenario, result) {
  scenario = resolveScenario(student, scenario);
  const c = compile(plan, student, scenario),
    only = runPath(compile(plan, student, scenario, "savings")),
    withC = runPath(compile(plan, student, scenario, "contributions"));
  const s = section(
    `${student.alias} · ${scenario.name}`,
    "Fixed-rate reference",
  );
  s.append(
    el(
      "p",
      `${scenario.path} · ${scenario.living} · enrollment ${student.enrollment} · ${scenario.years} attendance years`,
      "hint",
    ),
  );
  if (!result.total)
    s.append(
      callout(
        "Savings growth only: add annual college costs to assess the funding gap.",
      ),
    );
  if (scenario.stress)
    s.append(
      callout(
        "Stress case: includes a one-time 25% market loss before enrollment (or at valuation if already enrolled).",
        true,
      ),
    );
  const firstYear = c.rows
    .filter(
      (r, i) =>
        i >= Math.max(0, c.enrollmentIndex) && i < c.enrollmentIndex + 12,
    )
    .reduce((v, r) => v + r.total, 0);
  s.append(
    stats([
      [
        "Savings at university entry",
        money(result.enrollmentBalance),
        result.enrollmentBalance === null
          ? "Already enrolled at valuation"
          : "Before the entry month’s growth and bills",
      ],
      [
        "First attendance year",
        money(firstYear),
        c.enrollmentIndex < 0
          ? "Remaining costs only"
          : "Projected tuition + all other costs",
      ],
      [
        "Unfunded covered expenses",
        result.total ? money(result.shortfall) : "—",
        result.total
          ? result.success
            ? "All covered bills paid"
            : "Includes timing shortfalls"
          : "Add annual costs to assess the gap",
      ],
    ]),
  );
  const years = Math.max(0, c.enrollmentIndex) / 12;
  s.append(
    callout(
      `Savings and costs grow separately over ${years.toFixed(1)} years to entry. Current savings alone reach ${money(only.enrollmentBalance)} at entry. Total remaining attendance cost: ${money(result.total)} (${money(c.rows.reduce((v, r) => v + r.total / r.discount, 0))} in ${plan.valuation} purchasing power).`,
    ),
  );
  s.append(
    table(
      "How funding changes the gap",
      ["Funding included", "Unpaid covered bills", "Funds left after college"],
      [
        ["Current savings only", money(only.shortfall), money(only.ending)],
        [
          "Savings + contributions & gifts",
          money(withC.shortfall),
          money(withC.ending),
        ],
        [
          "All planned funding + income",
          money(result.shortfall),
          money(result.ending),
        ],
      ],
    ),
  );
  s.append(
    el(
      "p",
      `Coverage goal: ${scenario.coverage === "tuition" ? "tuition and fees" : scenario.coverage === "percent" ? pct(scenario.share) + " of net full cost" : "full attendance cost"}, after grants. Covered obligation: ${money(result.obligation)} (${result.obligation ? (((result.obligation - result.shortfall) / result.obligation) * 100).toFixed(0) : "100"}% funded in this projection). Grants applied: ${money(result.grants)}. Unused income is not deposited. ${result.firstShortfall ? "First shortfall: " + result.firstShortfall + "." : "No missed covered payment in this projection."}`,
      "hint",
    ),
  );
  const assumptions = el("details");
  assumptions.append(el("summary", "Assumptions used in this projection"));
  const a = scenario.assumptions;
  assumptions.append(
    table(
      "Annual nominal assumptions",
      ["Stage / item", "Compound annual growth"],
      [
        ["Early saving", pct(a.returnRate)],
        [`Final ${a.transitionYears} years`, pct(a.lateReturn)],
        ["During attendance", pct(a.attendanceReturn)],
        ["Tuition cost growth", pct(a.tuitionGrowth)],
        ["Other cost growth", pct(a.livingGrowth)],
        ["General inflation", pct(a.inflation)],
      ],
    ),
  );
  if (scenario.history.allocations.length)
    assumptions.append(
      table(
        "Dated allocation changes used in this reference",
        ["From", "Stocks", "Bonds", "Cash", "Annual reference rate"],
        scenario.history.allocations.map((a) => [
          a.date,
          pct(a.stocks),
          pct(a.bonds),
          pct(a.cash),
          a.referenceRate === null
            ? "Custom stage rates"
            : pct(a.referenceRate),
        ]),
      ),
    );
  assumptions.append(
    el(
      "p",
      `Costs: ${scenario.source} · checked ${scenario.sourceDate} · baseline ${scenario.baseline}. Return assumptions: ${scenario.assumptionsStatus}, as of ${scenario.assumptionsDate}. No recommended investment allocation or aid eligibility is inferred.`,
      "hint",
    ),
  );
  s.append(assumptions);
  return s;
}
export function annualFundingView(plan, student, scenario, result) {
  const sectionNode = section("Year-by-year funding", "Fixed-rate reference");
  sectionNode.classList.add("annual-funding");
  sectionNode.append(
    el(
      "p",
      `Tuition: ${scenario.billing.calendar === "quarter" ? "thirds at enrollment, three months and six months later" : "halves at enrollment and five months later"}. Living costs and income support: ${scenario.billing.livingMonths} monthly payments per school year. Grants follow tuition dates.`,
      "hint",
    ),
  );
  sectionNode.append(
    table(
      "Calendar-year savings flow · nominal dollars",
      [
        "Year",
        "Opening",
        "Growth",
        "Deposits",
        "Withdrawals",
        "Unpaid",
        "Ending",
      ],
      annualRows(result).map((row) => [
        row.year,
        ...[
          "opening",
          "earned",
          "contribution",
          "withdrawal",
          "shortfall",
          "balance",
        ].map((k) => money(row[k])),
      ]),
    ),
  );
  sectionNode.append(
    el(
      "p",
      "Opening savings + investment growth + deposits − withdrawals = ending savings. Deposits include contributions and gifts. Grants and direct income reduce the college bill before withdrawals. Unpaid bills are recorded separately; investments never go below zero. Displayed dollars are rounded; the underlying ledger retains cents. This reference schedule is not a median simulated path.",
      "hint",
    ),
  );
  const detail = el("details");
  detail.append(
    el("summary", "Annual costs, grants and direct income"),
    table(
      "Annual college budget and coverage",
      [
        "Year",
        "College costs",
        "Grants",
        "Covered obligation",
        "Income used",
        "Withdrawals",
        "Unpaid",
      ],
      annualRows(result).map((row) => [
        row.year,
        ...[
          "total",
          "grant",
          "obligation",
          "income",
          "withdrawal",
          "shortfall",
        ].map((k) => money(row[k])),
      ]),
    ),
  );
  sectionNode.append(detail);
  return sectionNode;
}
export function familyCalendarView(plan) {
  const wrapper = el("div");
  wrapper.append(
    table(
      "Calendar-year attendance · remaining plan",
      [
        "Year",
        "Peak simultaneous students",
        ...plan.students.map((s) => s.alias),
      ],
      attendanceCalendar(plan).map((row) => [
        row.year,
        row.peak,
        ...plan.students.map((s) =>
          row.counts[s.id] ? `${row.counts[s.id]} months` : "—",
        ),
      ]),
    ),
  );
  wrapper.append(
    el(
      "p",
      "Assumes nine academic months per school year from each student’s enrollment month. Counts show attendance months within each calendar year; peak overlap counts students in the same month. Summer living costs can continue separately. Joint household funding results appear in the assessment when multiple students are present.",
      "hint",
    ),
  );
  return wrapper;
}
function distributionView(sim) {
  const wrapper = el("section", "", "outcome-distribution");
  wrapper.append(el("h3", "Range of possible outcomes"));
  const select = el("select"),
    label = el("label", "Show outcome");
  label.className = "distribution-select";
  for (const [value, text] of [
    ["gap", "Funding gap"],
    ["enrollment", "Savings at university entry"],
    ["cost", "Total college expenses"],
  ]) {
    if (
      sim.distributions[value].total &&
      (sim.cost || value === "enrollment")
    ) {
      const option = el("option", text);
      option.value = value;
      select.append(option);
    }
  }
  if (!select.options.length) {
    wrapper.append(
      el(
        "p",
        "Enter college costs to see the distribution of funding outcomes.",
        "hint",
      ),
    );
    return wrapper;
  }
  label.append(select);
  wrapper.append(label);
  const body = el("div");
  wrapper.append(body);
  function render() {
    const key = select.value,
      distribution = sim.distributions[key];
    const rows = distribution.bins.map((bin) => {
      const range =
        bin.kind === "funded"
          ? "All covered bills paid"
          : bin.kind === "point"
            ? money(bin.lower)
            : `${money(bin.lower)} – ${bin.last ? "" : "< "}${money(bin.upper)}`;
      const frequency = el("div", "", "probability-cell"),
        bar = el("span", "", "probability-bar"),
        value = el(
          "strong",
          `${(bin.probability * 100).toLocaleString("en-US", { maximumFractionDigits: 0 })}%`,
        );
      bar.style.width = `${bin.probability * 100}%`;
      bar.setAttribute("aria-hidden", "true");
      frequency.append(bar, value);
      return { range, frequency, count: bin.count };
    });
    const tableWrapper = table(
      `${key === "gap" ? "Funding outcomes" : key === "cost" ? "Total college expenses" : "Savings at entry"} · nominal dollars`,
      ["Outcome range", "Share of simulated paths", "Paths"],
      rows.map((r) => [r.range, "", r.count.toLocaleString()]),
    );
    tableWrapper
      .querySelectorAll("tbody tr")
      .forEach((row, i) => row.children[1].append(rows[i].frequency));
    body.replaceChildren(
      tableWrapper,
      el(
        "p",
        `Based on ${distribution.total.toLocaleString()} simulated paths. Bar lengths show the actual share in each range; empty dollar bands are omitted. ${key === "gap" ? "Lower gaps are favorable. Each gap uses the investment returns and expenses from the same path." : key === "cost" ? "Lower expenses are favorable." : "Higher savings are favorable."}`,
        "hint",
      ),
    );
  }
  select.addEventListener("change", render);
  render();
  return wrapper;
}
// Presentation only: the gauge uses the existing all-bills-paid simulation frequency.
export function successGauge(sim, sensitivity = null, cases = null) {
  const hasBudget = sim.cost > 0,
    p = hasBudget ? Math.max(0, Math.min(1, sim.probability)) : 0;
  const other = sensitivity?.probability ?? p,
    low = cases
      ? Math.min(...cases.map((c) => c.probability))
      : Math.min(p, other),
    high = cases
      ? Math.max(...cases.map((c) => c.probability))
      : Math.max(p, other);
  const meets = hasBudget && low >= sim.threshold;
  const rangeText =
    Math.round(low * 100) === Math.round(high * 100)
      ? `${Math.round(low * 100)}%`
      : `${Math.round(low * 100)}–${Math.round(high * 100)}%`;
  const status = !hasBudget
    ? "Add a college budget"
    : low < sim.threshold && high >= sim.threshold
      ? cases
        ? "Assumption-sensitive"
        : "History-sensitive"
      : targetStatus(low, sim.trials, sim.threshold);
  const probabilityText = `${(p * 100).toLocaleString("en-US", { maximumFractionDigits: 0 })}%`;
  const card = el(
    "div",
    "",
    "success-gauge " +
      (!hasBudget ? "neutral" : meets ? "on-course" : "below-target"),
  );
  if (hasBudget)
    card.style.setProperty("--gauge-color", gaugeColor(p, sim.threshold));
  card.append(
    el(
      "h3",
      cases
        ? "Funding range across economic cases"
        : "Historical funding range",
    ),
    el(
      "p",
      cases
        ? "Cautious, central and favorable assumptions · no confidence level"
        : "Sensitivity across both historical periods",
      "gauge-subtitle",
    ),
  );
  const visual = el("div", "", "gauge-visual");
  const ns = "http://www.w3.org/2000/svg",
    svg = document.createElementNS(ns, "svg");
  svg.setAttribute("viewBox", "0 0 360 220");
  svg.setAttribute("aria-hidden", "true");
  const add = (tag, attrs, text) => {
    const n = document.createElementNS(ns, tag);
    for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, String(v));
    if (text !== undefined) n.textContent = text;
    svg.append(n);
    return n;
  };
  const arc = {
    d: "M30 184 A150 150 0 0 1 330 184",
    fill: "none",
    "stroke-width": 15,
    "stroke-linecap": "round",
    pathLength: 100,
  };
  add("path", { ...arc, class: "gauge-track" });
  if (hasBudget) {
    if (p > 0)
      add("path", {
        ...arc,
        stroke: gaugeColor(p, sim.threshold),
        "stroke-dasharray": `${p * 100} 100`,
        class: "gauge-fill",
      });
    const angle = Math.PI * (1 - p),
      target = Math.PI * (1 - sim.threshold);
    add("line", {
      x1: 180 + 137 * Math.cos(target),
      y1: 184 - 137 * Math.sin(target),
      x2: 180 + 164 * Math.cos(target),
      y2: 184 - 164 * Math.sin(target),
      class: "gauge-target",
    });
    add("circle", {
      cx: 180 + 150 * Math.cos(angle),
      cy: 184 - 150 * Math.sin(angle),
      r: 12,
      class: "gauge-marker-outline",
    });
    add("circle", {
      cx: 180 + 150 * Math.cos(angle),
      cy: 184 - 150 * Math.sin(angle),
      r: 9,
      class: "gauge-marker",
      "stroke-width": 5,
    });
  }
  add("text", { x: 30, y: 214, "text-anchor": "middle" }, "0%");
  add("text", { x: 330, y: 214, "text-anchor": "middle" }, "100%");
  visual.append(svg);
  const reading = el("div", "", "gauge-reading");
  reading.append(
    el("strong", hasBudget ? rangeText : "—", "gauge-value"),
    el("span", status, "gauge-badge"),
  );
  visual.append(reading);
  if (hasBudget) {
    visual.setAttribute("role", "meter");
    visual.setAttribute(
      "aria-label",
      cases
        ? "Central economic-case funding frequency"
        : "Selected historical-period funding frequency",
    );
    visual.setAttribute("aria-valuemin", "0");
    visual.setAttribute("aria-valuemax", "100");
    visual.setAttribute("aria-valuenow", String(p * 100));
    visual.setAttribute(
      "aria-valuetext",
      `${rangeText} across ${cases ? "economic cases" : "histories"}; ${sim.period} ${probabilityText}; ${status}; target ${pct(sim.threshold)}`,
    );
  }
  card.append(visual);
  if (hasBudget) {
    if (cases)
      card.append(
        el(
          "p",
          "Case range, not a confidence interval. The cases have no assigned probabilities; economic validation remains limited. Arc and detailed outcomes use the central case.",
          "hint",
        ),
      );
    card.append(
      el(
        "p",
        `Arc and marker: ${sim.period} · ${probabilityText}`,
        "gauge-target-note",
      ),
    );
    if (sensitivity)
      card.append(
        el(
          "p",
          `${sensitivity.period}: ${Math.round(other * 100)}%. The displayed range compares two historical models; it is not a confidence interval.`,
          "hint",
        ),
      );
  }
  card.append(
    el(
      "p",
      hasBudget
        ? `Target ${pct(sim.threshold)} · tick mark on the arc`
        : "Enter annual costs to assess funding.",
      "gauge-target-note",
    ),
  );
  if (hasBudget) {
    const legend = el("div", "", "gauge-color-key");
    for (const [text, kind] of [
      ["45% · yellow", "approaching"],
      ["60% · light green", "improving"],
      [`${pct(sim.threshold)} target · dark green`, "met"],
    ])
      legend.append(el("span", text, kind));
    card.append(legend);
  }
  if (hasBudget) {
    card.append(
      el(
        "p",
        `${cases ? "Central-case" : "Selected-period"} sampling interval ${samplingRangeText(p, sim.trials)}. This measures sample noise and excludes model uncertainty. The arc reaches yellow at 45%, light green at 60%, and dark green at your target. Target status is shown separately.`,
        "hint",
      ),
    );
  }
  card.append(
    el(
      "p",
      hasBudget
        ? `Every covered bill paid when due in ${Math.round(p * sim.trials).toLocaleString()} of ${sim.trials.toLocaleString()} simulated paths.`
        : "The gauge will use the same Calculate action.",
      "hint",
    ),
  );
  return card;
}
export function simulationView(sim, sensitivity = null, cases = null) {
  const s = section(
    "Funding outlook",
    `${sim.trials.toLocaleString()} ${cases ? "paths per economic case" : "historical paths"}`,
  );
  const overview = el("div", "", "funding-summary");
  overview.append(
    successGauge(sim, sensitivity, cases),
    stats([
      ["Median funding gap", money(sim.gap.p50), "Unpaid covered expenses"],
      [
        "Higher funding gap",
        money(sim.gap.p90),
        "90th percentile · adverse outcome",
      ],
    ]),
  );
  s.append(overview);
  s.append(
    el(
      "p",
      `${sim.period} · ${sim.blockYears}-year blocks · ${PROFILES[sim.profile].name}. ${sim.costMode === "historical" ? (sim.calibrationCase ? (sim.economicState ? (sim.robustHistory ? "Investment and inflation paths use the full 1954–2023 history; college costs use a separate matched donor history." : "Source years jointly carry equity, price and rate innovations; central-state conditioning and persistent expectation draws alter future paths.") : "Market months and published annual cost changes stay paired within sampled source years.") : "Investment returns and expense-growth deviations use the same historical months.") : "Investment returns vary; expense-growth rates are fixed."}`,
      "hint",
    ),
  );
  s.append(
    el(
      "p",
      sim.calibrationCase && sim.costMode !== "fixed"
        ? sim.costModel === "fixed"
          ? `Validation-selected cost model: 4% tuition and 3% on-campus housing nominal trends, with paired historical annual deviations.${sim.costCorrectionActive ? (sim.robustHistory ? " An origin-fitted cost-error correction, shrunk by unique target-year count and selected across multiple periods, is also applied." : " A persistent tuition/housing forecast-error correction, fitted through 2016 and gated on 2024–25, is also applied.") : ""} Economic cases shift those trends using observed five-year growth variation. CPI applies to other expenses and off-campus/at-home housing. The entered fixed-growth fields are not used in variable-cost mode.`
          : "Published sector tuition and on-campus room/board are modeled relative to inflation. Other expenses and off-campus/at-home housing use CPI. Joint annual blocks retain observed market/cost associations; the sector cost trend also varies between paths. Grants remain separate."
        : sim.costMode === "fixed"
          ? `Fixed expense growth: tuition ${pct(sim.tuitionTrend)} per year; living costs use the entered fixed rate. Historical investment returns still vary.`
          : sim.tuitionBasis === "published"
            ? `Published-price planning: tuition uses your ${pct(sim.tuitionTrend)} annual trend, with historical tuition-index deviations as an imperfect variability proxy. The index mean is removed because it includes some aid adjustments. Grants remain separate.`
            : "Tuition-index planning: uses the observed BLS tuition index, including some aid-adjusted prices. It is not a pure published-price series.",
      "hint",
    ),
  );
  s.append(
    el(
      "p",
      "The percentage is a frequency under the selected model. Historical blocks cannot capture every future event; aid, attendance length and household support stay fixed unless changed in a scenario.",
      "hint",
    ),
  );
  s.append(representativePathsView(sim));
  s.append(distributionView(sim));
  const ranges = el("details");
  ranges.append(el("summary", "Independent percentile ranges & balance bands"));
  ranges.append(
    table(
      "Percentile summary · nominal dollars",
      ["Outcome", "10th percentile", "Median", "90th percentile"],
      [
        [
          "Savings at university entry",
          money(sim.enrollment.p10),
          money(sim.enrollment.p50),
          money(sim.enrollment.p90),
        ],
        [
          "Total college expenses",
          money(sim.costRange.p10),
          money(sim.costRange.p50),
          money(sim.costRange.p90),
        ],
        [
          "Tuition & fees",
          money(sim.tuitionRange.p10),
          money(sim.tuitionRange.p50),
          money(sim.tuitionRange.p90),
        ],
        [
          "Funding gap",
          money(sim.gap.p10),
          money(sim.gap.p50),
          money(sim.gap.p90),
        ],
        [
          "Funds left after college",
          money(sim.ending.p10),
          money(sim.ending.p50),
          money(sim.ending.p90),
        ],
      ],
    ),
  );
  ranges.append(
    el(
      "p",
      "Each percentile column ranks every row independently; it is not one combined scenario. Each funding gap is calculated from that path’s expenses and available funds together. A higher expense or gap is adverse; higher savings are favorable. Percentiles describe ranges, not minimum or maximum outcomes.",
      "hint",
    ),
  );
  ranges.append(el("h3", "Savings through the plan"), chart(sim.bands));
  const legend = el("div", "", "legend");
  legend.append(el("span", "10th–90th percentile"), el("span", "Median"));
  ranges.append(legend);
  s.append(ranges);
  const solver = el("div", "", "callout");
  solver.append(
    el(
      "strong",
      `${sim.calibrationCase ? "Central-case" : "Selected-period"} monthly savings · ${pct(sim.threshold)} target${sim.confirmation && !sim.confirmation.meets ? " · provisional" : ""}`,
    ),
  );
  if (!sim.cost)
    solver.append(
      el("p", "Enter annual college costs to estimate a savings target."),
    );
  else if (sim.infeasible)
    solver.append(
      el(
        "p",
        `No estimate within ${money(sim.ceiling)}/month satisfies the fit target including its sampling reserve and contribution dates. Adjust the schedule, available funding, or coverage goal.`,
      ),
    );
  else {
    solver.append(
      el(
        "p",
        `${money(sim.contribution)}/month total base contribution (${money(sim.additional)} above the current plan), using your contribution dates and annual increase.`,
      ),
    );
    const check = sim.confirmation;
    if (check?.fitProbability)
      solver.append(
        el(
          "p",
          `The requested target stays ${pct(sim.threshold)}. The solver fits ${pct(check.fitProbability)} with a sampling reserve, then checks separate paths. This reserve addresses simulation noise only.${check.reserveCapped ? " The reserve reaches the maximum sampled quantile; its full cushion is unavailable, so rely on the independent check." : ""}`,
          "hint",
        ),
      );
    solver.append(
      el(
        "p",
        `Independent seeded check: ${pct(check.probability)} across ${check.trials.toLocaleString()} paths.${check.lowerBound !== undefined ? " One-sided 95% lower sampling bound: " + pct(check.lowerBound) + "." : ""} ${check.meets ? "The lower sampling bound meets the requested target." : "The independent check did not confirm the target. Review a larger contribution."}`,
      ),
    );
  }
  s.append(solver);
  const details = el("details");
  details.append(el("summary", "More outcome detail"));
  details.append(
    table(
      "In valuation-month purchasing power",
      ["Outcome", "10th percentile", "Median", "90th percentile"],
      [
        [
          "College expenses",
          money(sim.realCostRange.p10),
          money(sim.realCostRange.p50),
          money(sim.realCostRange.p90),
        ],
        [
          "Funding gap",
          money(sim.realGap.p10),
          money(sim.realGap.p50),
          money(sim.realGap.p90),
        ],
        [
          "Gap among unsuccessful paths",
          money(sim.conditionalGap.p10),
          money(sim.conditionalGap.p50),
          money(sim.conditionalGap.p90),
        ],
      ],
    ),
  );
  details.append(
    table(
      "End-of-month savings ranges",
      ["Date", "10th percentile", "Median", "90th percentile"],
      sim.bands.map((b) => [b.date, money(b.p10), money(b.p50), money(b.p90)]),
    ),
  );
  details.append(
    el(
      "p",
      `${sim.failedCount.toLocaleString()} paths missed a covered payment. Pointwise bands do not represent one possible trajectory. Seed ${sim.seed}; ${sim.prngVersion}. Sampling standard error ${(sim.samplingSE * 100).toFixed(1)} percentage points describes simulation noise only.`,
      "hint",
    ),
  );
  s.append(details);
  return s;
}
export function historyContextView(result) {
  const {
    simulation: sim,
    historicalReplay: replay,
    sensitivity,
    dataset,
  } = result;
  const s = section("Historical comparisons", "Included in this calculation");
  const rows = [
    [
      "Sampled blocks · " + sim.period,
      sim.trials.toLocaleString(),
      sim.cost ? pct(sim.probability) : "—",
      money(sim.gap.p50),
      money(sim.gap.p90),
    ],
    [
      "Sampled blocks · " + sensitivity.period,
      sensitivity.trials.toLocaleString(),
      sim.cost ? pct(sensitivity.probability) : "—",
      money(sensitivity.gap.p50),
      money(sensitivity.gap.p90),
    ],
  ];
  if (replay.windows)
    rows.push([
      "Actual consecutive periods · " + replay.period,
      String(replay.windows),
      sim.cost ? pct(replay.passRate) : "—",
      money(replay.gap.p50),
      money(replay.gap.p90),
    ]);
  s.append(
    table(
      "Sensitivity to the history used",
      [
        "Historical basis",
        "Paths / periods",
        "Funded",
        "Median gap",
        "90th gap",
      ],
      rows,
    ),
  );
  if (replay.windows)
    s.append(
      el(
        "p",
        `The actual-period comparison applies your plan to ${replay.windows} complete historical windows. The largest nominal gap was ${money(replay.worstGap)}, starting ${replay.worstStart} and ending ${replay.worstEnd}. Overlapping historical windows are not independent future probabilities.`,
        "hint",
      ),
    );
  else
    s.append(
      el(
        "p",
        "No complete actual historical window fits this plan’s length and selected period. Block sampling remains available.",
        "hint",
      ),
    );
  s.append(
    el(
      "p",
      "Both historical-period simulations use the same trial count. Their difference reflects model sensitivity as well as sampling noise; it is not a confidence interval.",
      "hint",
    ),
  );
  if (result.robustness)
    s.append(robustnessView(result.robustness, sim.cost > 0));
  const info = el("details");
  info.append(el("summary", "Historical data & assumptions"));
  info.append(
    el(
      "p",
      `${dataset.observations} matched monthly observations, ${dataset.start} through ${dataset.end}. Snapshot ${dataset.id}, prepared ${dataset.asOf}. Profile rebalances monthly; annual fee ${pct(sim.fee)}.`,
    ),
  );
  info.append(
    table(
      "Stocks / bonds / cash allocation",
      ["Stage", "Stocks", "Bonds", "Cash"],
      PROFILES[sim.profile].stages.map((w, i) => [
        ["Early saving", "Final saving years", "During university"][i],
        ...w.map(pct),
      ]),
    ),
  );
  if (sim.allocations?.length)
    info.append(
      table(
        "Dated allocation overrides",
        ["From", "Stocks", "Bonds", "Cash"],
        sim.allocations.map((a) => [
          a.date,
          pct(a.stocks),
          pct(a.bonds),
          pct(a.cash),
        ]),
      ),
    );
  for (const source of dataset.sources) {
    const p = el("p"),
      a = el("a", source.name);
    a.href = source.url;
    p.append(a, el("span", " · " + source.transform));
    info.append(p);
  }
  for (const note of dataset.notes) info.append(el("p", note, "hint"));
  info.append(el("p", `Observation checksum: ${dataset.hash}`, "hash-note"));
  s.append(info);
  return s;
}

export function comparisonView(results) {
  const s = section("Scenario comparison", "Same random draws");
  s.append(
    table(
      "Same student · independently assessed alternatives",
      [
        "Scenario",
        "Median cost",
        "Reference gap",
        "Simulated success",
        "Median gap",
        "90th gap",
        "Monthly at target",
      ],
      results.map((r) => [
        r.name,
        money(r.simulation.cost),
        money(r.deterministic.shortfall),
        r.simulation.cost ? pct(r.simulation.probability) : "—",
        money(r.simulation.gap.p50),
        money(r.simulation.gap.p90),
        money(r.simulation.contribution),
      ]),
    ),
  );
  s.append(
    el(
      "p",
      "These are alternatives for one student. Do not add their costs or interpret individual probabilities as family-wide success. Every education scenario uses the same student savings, contributions, coverage goal and investment settings. School-specific aid and education costs can differ.",
      "hint",
    ),
  );
  return s;
}
export function csvText(rows) {
  return rows
    .map((row) =>
      row
        .map((v) => {
          let s = String(v ?? "");
          if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
          return '"' + s.replaceAll('"', '""') + '"';
        })
        .join(","),
    )
    .join("\r\n");
}

export function representativePathsView(sim) {
  const wrap = el("section");
  wrap.append(el("h3", "Three complete simulated outcomes"));
  const selector = el("select"),
    label = el("label", "View a simulated path");
  for (const [i, path] of sim.representativePaths.entries()) {
    const option = el("option", path.label);
    option.value = i;
    selector.append(option);
  }
  selector.value = "1";
  label.append(selector);
  wrap.append(label);
  const body = el("div");
  wrap.append(body);
  function render() {
    const path = sim.representativePaths[Number(selector.value)];
    body.replaceChildren(
      stats([
        ["Savings at entry", money(path.enrollmentBalance)],
        ["Total college costs", money(path.total)],
        ["Unpaid covered bills", money(path.shortfall)],
        ["Funds remaining", money(path.ending)],
      ]),
      table(
        "One path · annual cash flow · nominal dollars",
        [
          "Year",
          "Opening",
          "Growth",
          "Deposits",
          "Costs",
          "Withdrawals",
          "Unpaid",
          "Ending",
        ],
        path.annual.map((row) => [
          row.year,
          ...[
            "opening",
            "earned",
            "contribution",
            "total",
            "withdrawal",
            "shortfall",
            "balance",
          ].map((k) => money(row[k])),
        ]),
      ),
    );
  }
  selector.onchange = render;
  render();
  wrap.append(
    el(
      "p",
      "Actual paths near the 10th, 50th and 90th percentiles of ending funds minus unpaid bills. All values in each example belong to the same investment-and-cost sequence. These examples are not the marginal percentile rows below. Opening + growth + deposits − withdrawals = ending; grants and income reduce bills before withdrawals.",
      "hint",
    ),
  );
  return wrap;
}
function robustnessView(checks, hasBudget) {
  const detail = el("details");
  detail.append(
    el("summary", "Model sensitivity, stress cases & historical testing"),
  );
  detail.append(
    table(
      "Block-length sensitivity · 1,000 paths each",
      ["Block length", "Bills paid", "Median gap", "90th gap"],
      checks.blocks.map((r) => [
        `${r.blockYears} years`,
        hasBudget ? pct(r.probability) : "—",
        money(r.gap.p50),
        money(r.gap.p90),
      ]),
    ),
  );
  detail.append(
    table(
      "Planning stress cases · matched baseline paths",
      [
        "Changed assumption",
        "Bills paid",
        "Change vs baseline",
        "Median gap",
        "90th gap",
      ],
      [
        [
          "Unchanged plan · same 1,000 paths",
          hasBudget ? pct(checks.baseline.probability) : "—",
          "—",
          money(checks.baseline.gap.p50),
          money(checks.baseline.gap.p90),
        ],
        ...checks.stresses.map((r) => [
          r.name,
          r.unavailable ? "Unavailable" : hasBudget ? pct(r.probability) : "—",
          r.unavailable
            ? "—"
            : `${r.deltaProbability > 0 ? "+" : ""}${(r.deltaProbability * 100).toFixed(1)} pp`,
          r.unavailable ? r.unavailable : money(r.gap.p50),
          r.unavailable ? "—" : money(r.gap.p90),
        ]),
      ],
    ),
  );
  detail.append(
    el(
      "p",
      "The combined stress uses fixed tuition and living growth two percentage points above the reference plus a 25% investment loss at entry. Grant loss removes all remaining grants. An extra year adds the current budget and does not extend awards or contributions automatically. Each stress uses the same seeds, trial count and calendar blocks as its displayed baseline; an unchanged no-aid assumption produces exactly zero change. Stresses are alternatives, not additions to the main probability. The housing case raises the annual housing/food budget by 20%. School-specific prices still require your own scenarios.",
      "hint",
    ),
  );
  const v = checks.validation;
  if (v.folds.length) {
    detail.append(
      table(
        "Walk-forward diagnostic · fit history ends before each test",
        [
          "Training through",
          "Held-out period",
          "Predicted funded",
          "Proxy replay funded",
          "Proxy cost inside P10–P90",
        ],
        v.folds.map((f) => [
          f.trainEnd,
          `${f.start}–${f.end}`,
          hasBudget ? pct(f.predicted) : "—",
          hasBudget ? (f.actual ? "Yes" : "No") : "—",
          f.costInRange ? "Yes" : "No",
        ]),
      ),
    );
    detail.append(
      el(
        "p",
        `${v.folds.length} historical tests, ${v.pathsPerFold} simulations per test. Proxy cost-range coverage: ${pct(v.coverage)}; funding Brier score ${v.brier.toFixed(3)} (lower is better). Training starts with at least 15 years. Held-out windows can overlap and samples are small. Held-out costs are reconstructed from the same cost proxies, not observed school prices. This diagnostic does not establish future calibration.`,
        "hint",
      ),
    );
  } else
    detail.append(
      el(
        "p",
        "Not enough history for a 15-year training sample followed by this plan’s complete horizon. No out-of-sample validation score is claimed.",
        "hint",
      ),
    );
  return detail;
}
export function householdView(h) {
  const wrap = section("Household funding", "Shared economic paths");
  wrap.append(
    el(
      "p",
      h.students
        .map((s) => `${s.alias}: ${s.scenario} (${s.coverage} coverage)`)
        .join(" · "),
      "hint",
    ),
  );
  wrap.append(
    stats([
      [
        "All students’ covered bills paid",
        h.probability === null ? "—" : pct(h.probability),
        `${h.trials.toLocaleString()} joint paths`,
      ],
      ["Combined median gap", money(h.gap.p50)],
      ["Combined higher gap", money(h.gap.p90), "90th percentile"],
    ]),
  );
  if (h.cases)
    wrap.append(
      table(
        "Household economic-case sensitivity",
        ["Case", "All students funded"],
        h.cases.map((c) => [
          c.name,
          c.probability === null ? "—" : pct(c.probability),
        ]),
      ),
    );
  const annual = el("details");
  annual.append(el("summary", "Annual household costs & savings deposits"));
  annual.append(
    table(
      "Household annual needs · marginal ranges · nominal dollars",
      [
        "Year",
        "College costs P10",
        "Median costs",
        "Costs P90",
        "Median need after grants/income",
        "Savings deposits",
      ],
      h.annual.map((r) => [
        r.year,
        money(r.cost.p10),
        money(r.cost.p50),
        money(r.cost.p90),
        money(r.need.p50),
        money(r.contributions.p50),
      ]),
    ),
  );
  wrap.append(annual);
  wrap.append(
    el(
      "p",
      `Uses ${h.period}, ${h.blockYears}-year blocks for every student, matching this assessment’s history settings. Students retain their own allocations, fees, budgets and coverage. Success requires every student’s selected goal to be funded on the same path. Funds stay earmarked; no transfers between students are assumed. Unallocated shared savings (${money(h.unallocatedPool)}) are excluded.`,
      "hint",
    ),
  );
  wrap.append(
    el(
      "p",
      h.monthlyLimit === null
        ? `No household savings-deposit limit set. Peak planned deposits: ${money(h.peakMonthlyContribution)}/month.`
        : `Monthly savings-deposit limit ${money(h.monthlyLimit)}; peak deposits ${money(h.peakMonthlyContribution)}. When requested deposits exceed the limit, each student receives a proportional share. Gifts and direct college payments from income are outside this limit.`,
      "hint",
    ),
  );
  if (h.missingBudgets.length)
    wrap.append(
      el(
        "p",
        `Add budgets for ${h.missingBudgets.join(", ")} before a household percentage can be shown. Dollar totals include only entered expenses.`,
        "hint",
      ),
    );
  return wrap;
}

export function calibrationContextView(result) {
  const c = result.calibration,
    sim = result.simulation;
  const wrap = section(
    "Economic assumptions & observed-price checks",
    "Assumptions as of " + c.asOf,
  );
  wrap.append(
    table(
      "Named assumptions · annual nominal anchors before fees",
      [
        "Case",
        "Stocks",
        c.economicState ? "Long-run Treasury yield proxy" : "Treasury proxy",
        "Cash",
        "Inflation",
        "Covered bills funded",
      ],
      c.cases.map((k) => [
        k.name,
        pct(k.anchors.stocks),
        pct(k.anchors.bonds),
        pct(k.anchors.cash),
        pct(k.anchors.inflation),
        sim.cost ? pct(k.probability) : "—",
      ]),
    ),
  );
  wrap.append(
    el(
      "p",
      `SPF common vintage ${c.macro.commonVintage}: stocks and cash are annual-average return forecasts; ${c.economicState ? "the bond input is a long-run yield level for Treasury repricing, with the ten-year SPF yield used as a provisional five-year level proxy" : "the bond input is a Treasury yield used provisionally as a return anchor"}. Equity expectations are a broad-market proxy. Ten-year anchors are held constant beyond ten years. Forecaster quartiles measure disagreement, not predictive bounds. The cautious stock anchor also uses the lower end of Vanguard’s published equity outlook. Cases have no probability weights.`,
      "hint",
    ),
  );
  if (c.validation.funding) wrap.append(wholePlanValidationView(c.validation));
  if (c.economicState) wrap.append(economicProcessView(c));
  const comparison = c.validation.comparison;
  if (comparison) {
    if (c.economicState) {
      const older = el("details");
      older.append(
        el("summary", "Previous cost-model comparison · v0.7.0"),
        costModelComparisonView(c),
      );
      wrap.append(older);
    } else wrap.append(costModelComparisonView(c));
  }
  const current = c.validation.results.filter(
    (r) => r.sector === c.sector.replace("out", ""),
  );
  const legacy = el("details");
  legacy.append(
    el("summary", "Earlier sector-aggregate diagnostic · separate dataset"),
  );
  legacy.append(
    table(
      "Published-price back-test · " + c.sector,
      [
        "Horizon",
        "Year-cutoff folds",
        "P10–P90 coverage",
        "Non-overlapping periods",
        "Median forecast MAPE",
        "Fixed 4%/3% MAPE",
      ],
      current.map((r) => [
        r.horizon + " years",
        String(r.folds.length),
        r.coverage === null ? "Unavailable" : pct(r.coverage),
        String(r.nonoverlapping),
        r.mape === null ? "—" : pct(r.mape),
        r.baselineMape === null ? "—" : pct(r.baselineMape),
      ]),
    ),
  );
  legacy.append(
    el("p", c.validation.method + " " + c.validation.limitations, "hint"),
  );
  wrap.append(legacy);
  wrap.append(
    el(
      "p",
      `Price data: ${c.source.name}, through 2023–24. Sector proxy ${c.sector}; public in-state and out-of-state tuition now use separate fixed-institution histories. Custom paths use public four-year in-state growth; forecasts remain sector proxies for individual schools. Off-campus/at-home housing uses CPI. Your entered budget sets the starting price; the dataset supplies growth, not a replacement budget.`,
      "hint",
    ),
  );
  for (const note of c.notes) wrap.append(el("p", note, "hint"));
  const details = el("details");
  details.append(el("summary", "Source snapshot & reproducibility"));
  details.append(
    el(
      "p",
      `${c.id} · SHA-256 ${c.hash}. History transitions ${c.panel ? "2001–2023" : "2000–2023"}, jointly sampled in ${sim.blockYears}-year blocks. Source aggregates may be revised. Changing model assumptions can materially change funding frequencies.`,
      "hint",
    ),
  );
  for (const [label, url] of [
    ["NCES price data", c.source.url],
    [
      "Philadelphia Fed forecasts",
      "https://www.philadelphiafed.org/surveys-and-data/real-time-data-research/survey-of-professional-forecasters",
    ],
    ["Vanguard equity cross-check", c.macro.equityCrosscheck.url],
  ]) {
    const a = el("a", label);
    a.href = url;
    details.append(a, el("br"));
  }
  wrap.append(details);
  return wrap;
}

const costModelName = (id) =>
  ({
    fixed: "4% tuition / 3% housing + historical deviations",
    recent10: "Recent ten-year trend",
    damped5: "Damped five-year trend",
    regime: "Changing historical growth regime",
  })[id] || id;
export function costModelComparisonView(c) {
  const report = c.validation.comparison,
    wrap = el("div", "", "cost-model-comparison");
  wrap.append(el("h3", "College-cost model comparison"));
  wrap.append(
    el(
      "p",
      `Selected: ${costModelName(report.liveModel)}. Models were selected using targets through 2019, then checked against reserved 2020–2023 targets. ${report.gatePassed ? "The selection passed the predeclared score comparison with the recent-trend model." : "The selected candidate failed the release gate; recent10 was retained."} This does not establish adequate interval coverage.`,
      "hint",
    ),
  );
  const active = report.holdout.find((r) => r.model === report.liveModel),
    rows = active.rows.filter((r) => r.series === c.sector);
  wrap.append(
    table(
      "Reserved-period results · " + c.sector,
      [
        "Horizon",
        "Origin clusters",
        "P10–P90 index coverage",
        "Index median MAPE",
        "School-level coverage",
        "Non-overlapping periods",
      ],
      rows.map((r) => [
        r.horizon + " years",
        String(r.folds.length),
        r.coverage === null ? "Unavailable" : pct(r.coverage),
        r.mape === null ? "—" : pct(r.mape),
        r.schoolCoverage === null ? "—" : pct(r.schoolCoverage),
        String(r.nonoverlapping),
      ]),
    ),
  );
  const counts = c.panel.counts[c.sector];
  wrap.append(
    el(
      "p",
      `Fixed panels: ${counts.tuitionInstitutions} tuition institutions, ${counts.housingInstitutions} on-campus housing institutions; ${counts.jointInstitutions} have both for school-level tests. ${counts.excludedUnstableOrAbsent} institutions were absent in some years or changed sector. Among stable institutions, ${counts.excludedTuitionMissing} lack a complete positive tuition history and ${counts.excludedHousingMissing} lack a complete positive housing history. School counts do not increase the number of independent economic periods.`,
      "hint",
    ),
  );
  const all = el("details");
  all.append(el("summary", "Compare all tested models"));
  all.append(
    table(
      "Average 2/5-year scores across five price series",
      [
        "Model",
        "Development interval score",
        "Reserved interval score",
        "Reserved index coverage",
        "Reserved median MAPE",
      ],
      report.holdout.map((m) => {
        const included = m.rows.filter(
          (r) => r.folds.length && [2, 5].includes(r.horizon),
        );
        return [
          costModelName(m.model),
          report.development.find((d) => d.model === m.model).score.toFixed(3),
          m.score.toFixed(3),
          pct(included.reduce((a, r) => a + r.coverage, 0) / included.length),
          pct(included.reduce((a, r) => a + r.mape, 0) / included.length),
        ];
      }),
    ),
  );
  for (const note of report.limitations) all.append(el("p", note, "hint"));
  all.append(
    el(
      "p",
      "The reserved years were held out from candidate selection in this comparison, not a prospective experiment; earlier aggregate diagnostics had already examined these economic years. Lower interval scores are better. No parameter was retuned after the reserved scores were evaluated.",
      "hint",
    ),
  );
  wrap.append(all);
  return wrap;
}

export function economicProcessView(c) {
  if (c.validation.robustness) return broadHistoryView(c);
  const state = c.economicState,
    wrap = el("div", "", "cost-model-comparison");
  wrap.append(el("h3", "Economic process & new validation"));
  wrap.append(
    el(
      "p",
      `Starting observations ${state.rateDate}: five-year Treasury yield ${pct(state.initial.long)}; three-month bill bank-discount quote ${pct(state.initial.short)}. Treasury total returns now combine coupon accrual and repricing; cash accrues from the bill-price convention and reinvests at simulated rates. The old fixed Treasury total-return anchor is not used.`,
      "hint",
    ),
  );
  wrap.append(
    el(
      "p",
      "Central-case inflation/rate states weight the source blocks. All cases and students use the same source-year sequence and matched random numbers; their yield and inflation levels can differ. Each path also draws persistent joint expectation deviations from rolling ten-year historical windows. The detailed outcome range includes that assumption uncertainty. These are historical regime variations, not independently calibrated confidence bounds.",
      "hint",
    ),
  );
  const correction = c.validation.correction;
  const priceCheck = table(
    "New 2024–25 price check · one independent target year",
    ["Cost model", "Normalized interval score", "Checks inside P10–P90"],
    [
      [
        "Without residual correction",
        correction.baselineScore.toFixed(3),
        `${Math.round(correction.baselineCoverage * correction.final.length)} / ${correction.final.length}`,
      ],
      [
        "With earlier residual correction",
        correction.adjustedScore.toFixed(3),
        `${Math.round(correction.adjustedCoverage * correction.final.length)} / ${correction.final.length}`,
      ],
    ],
  );
  priceCheck.classList.add("cost-check-summary");
  wrap.append(priceCheck);
  wrap.append(
    el(
      "p",
      `Residual adjustment ${correction.active ? "enabled" : "not enabled"} by the frozen score gate (lower scores are better). Fitting targets stop at ${correction.fit.cutoff}; the final price target is 2024–25, absent from the preceding release. Sector/horizon checks share one economic year, so their count is not an independent sample size. Earlier 2020–2023 scores below describe the preceding model.`,
      "hint",
    ),
  );
  const process = c.validation.processValidation;
  const processDetails = el("details");
  processDetails.append(
    el("summary", "Investment & inflation hindcast · mixed coverage"),
  );
  processDetails.append(
    table(
      "Investment process hindcast · final targets 2020–2023",
      [
        "Horizon",
        "Outcome",
        "Origin folds",
        "Non-overlapping periods",
        "P10–P90 coverage",
      ],
      process.summary
        .filter(
          (r) =>
            r.split === "final" &&
            ["stocks", "treasury", "cash", "inflation", "portfolio"].includes(
              r.metric,
            ),
        )
        .map((r) => [
          `${r.horizon} ${r.horizon === 1 ? "year" : "years"}`,
          {
            stocks: "Stocks",
            treasury: "Repriced Treasury proxy",
            cash: "Bill accrual proxy",
            inflation: "Inflation",
            portfolio: "60/30/10 portfolio",
          }[r.metric],
          String(r.folds),
          String(r.nonoverlapping),
          r.coverage === null ? "Unavailable" : pct(r.coverage),
        ]),
    ),
  );
  for (const note of process.limitations)
    processDetails.append(el("p", note, "hint"));
  wrap.append(
    el(
      "p",
      "Investment-process coverage is mixed: inflation coverage was 25% at one year and 50% at three/five years in four final target years. These sparse tests do not establish reliable funding probabilities.",
      "hint",
    ),
    processDetails,
  );
  const details = el("details");
  details.append(el("summary", "Process assumptions & cost check details"));
  details.append(
    table(
      "2024–25 residual correction checks · " + c.sector,
      [
        "Horizon",
        "Unadjusted score",
        "Adjusted score",
        "Unadjusted covered",
        "Adjusted covered",
      ],
      correction.final
        .filter((r) => r.series === c.sector)
        .map((r) => [
          `${r.horizon} ${r.horizon === 1 ? "year" : "years"}`,
          r.baseline.intervalScore.toFixed(3),
          r.adjusted.intervalScore.toFixed(3),
          r.baseline.coverage ? "Yes" : "No",
          r.adjusted.coverage ? "Yes" : "No",
        ]),
    ),
  );
  for (const note of [...state.limitations, ...correction.limits])
    details.append(el("p", note, "hint"));
  details.append(
    el(
      "p",
      "Treasury maturity: five years, rolled monthly, semiannual coupon pricing. Rate bounds: 0–25%; annual inflation gross bounds: 0.8–1.3. These are numerical model limits. The fixed reference uses the first shock-free model year for asset rates and the mean earlier cost-error correction; it is a separate illustration. Long-run yield/inflation targets and volatility relationships remain uncertain.",
      "hint",
    ),
  );
  for (const source of state.sources) {
    const a = el("a", source.name);
    a.href = source.url;
    details.append(a, el("br"));
  }
  wrap.append(details);
  return wrap;
}

export function broadHistoryView(c) {
  const r = c.validation.robustness,
    wrap = el("div", "", "cost-model-comparison");
  wrap.append(el("h3", "Historical coverage & model selection"));
  wrap.append(
    table(
      "Separate histories · current model",
      ["Component", "Years", "Use"],
      [
        [
          "Investments, rates and inflation",
          "1954–2023 · 70 years",
          "Joint macro paths and fitted persistence",
        ],
        [
          "College costs",
          "2000–2023 · 24 price levels",
          "Fixed institution panels and cost donors",
        ],
        [
          "Expectation uncertainty",
          "7 disjoint ten-year windows",
          "Persistent joint variation between paths",
        ],
      ],
    ),
  );
  wrap.append(
    el(
      "p",
      `Default macro policy: ${r.marketPolicy}. Persistence estimates are shrunk toward fixed priors. Cost policy: ${r.costPolicy}. Every historical correction is fitted using error targets through its forecast origin, then shrunk toward zero by the number of unique target years. The former 2014-origin/2016-error look-ahead is removed.`,
      "hint",
    ),
  );
  const market = table(
    "Investment sampling · multi-period interval scores",
    [
      "Period",
      "Uniform benchmark",
      "Conditioned candidate",
      "Selected coverage",
    ],
    r.marketSummary
      .filter((x) => x.policy === "uniform")
      .map((base) => {
        const alt = r.marketSummary.find(
            (x) => x.policy === "conditioned" && x.era === base.era,
          ),
          selected = r.marketPolicy === "conditioned" ? alt : base;
        return [
          base.era,
          base.score.toFixed(3),
          alt.score.toFixed(3),
          pct(selected.coverage),
        ];
      }),
  );
  wrap.append(market);
  wrap.append(
    table(
      "Cost correction · rolling origin comparisons",
      [
        "Target period",
        "Unadjusted benchmark",
        "Origin-fitted shrunk correction",
        "Selected coverage",
      ],
      r.costSummary
        .filter((x) => x.policy === "baseline")
        .map((base) => {
          const alt = r.costSummary.find(
              (x) => x.policy === "adjusted" && x.era === base.era,
            ),
            selected = r.costGate.passed ? alt : base;
          return [
            base.era,
            base.score.toFixed(3),
            alt.score.toFixed(3),
            pct(selected.coverage),
          ];
        }),
    ),
  );
  wrap.append(
    el(
      "p",
      `Lower scores are better. The fixed release rule requires overall improvement and no period more than 10% worse. Macro gate: ${r.marketGate.passed ? "passed" : "failed; uniform benchmark retained"}. Cost gate: ${r.costGate.passed ? "passed" : "failed; unadjusted benchmark retained"}. The 2024 price year is one row in the rolling evidence, rather than the sole gate.`,
      "hint",
    ),
  );
  const details = el("details");
  details.append(el("summary", "Sampling and validation details"));
  details.append(
    el(
      "p",
      "Earlier macro years use inflation-conditioned cost-block donors from the shorter school-price history. Observed year matches are retained when available. Tuition/housing pairs and household paths remain shared; pre-2000 college prices are not invented.",
      "hint",
    ),
  );
  for (const note of r.limitations) details.append(el("p", note, "hint"));
  details.append(
    el(
      "p",
      `Instrument definitions and initial yields remain: monthly-rolled five-year Treasury repricing and three-month bill accrual, with observed starting rates from ${c.economicState.rateDate}. Longer coverage and regularization address the sample restriction; future probabilities remain conditional on these economic assumptions.`,
      "hint",
    ),
  );
  wrap.append(details);
  return wrap;
}

function wholePlanValidationView(validation) {
  const f = validation.funding,
    r = validation.critique,
    wrap = el("div");
  wrap.append(el("h3", "Whole-plan historical checks"));
  wrap.append(
    table(
      "Synthetic plans · production simulation and bill ledger",
      [
        "Years until university",
        "Distinct start years",
        "Funding Brier score ↓",
        "Nominal 80% cost-band coverage",
      ],
      f.summary.map((x) => [
        x.wait,
        x.originYears,
        x.brier.toFixed(3),
        pct(x.costCoverage),
      ]),
    ),
  );
  wrap.append(
    el(
      "p",
      "Cost coverage is weak for longer waits. These historical checks do not establish calibrated future funding probabilities. Each plan includes four attendance years; starts and sectors share overlapping economic outcomes. A 50% funding guess scores 0.250. There are no eligible complete 18-year-wait checks.",
      "hint",
    ),
  );
  const details = el("details");
  details.append(
    el("summary", "Whole-plan methods and cost uncertainty comparison"),
  );
  details.append(
    table(
      "Funding frequency comparison · dependent synthetic cases",
      [
        "Predicted band",
        "Cases",
        "Start years",
        "Mean prediction",
        "Observed funded",
      ],
      f.reliability.map((x) => [
        x.band,
        x.cases,
        x.originYears,
        x.predicted === null ? "Unavailable" : pct(x.predicted),
        x.observed === null ? "Unavailable" : pct(x.observed),
      ]),
    ),
  );
  details.append(
    el(
      "p",
      `Cost uncertainty candidate ${r.spreadGate.passed ? "enabled" : "rejected; existing cost process retained"}. Equal-period interval score ${r.spreadGate.baseline.score.toFixed(3)} → ${r.spreadGate.expanded.score.toFixed(3)} (lower is better); coverage ${pct(r.spreadGate.baseline.coverage)} → ${pct(r.spreadGate.expanded.coverage)}. The candidate must improve distance from 80% coverage without increasing the score by more than 10%.`,
      "hint",
    ),
  );
  for (const note of [...f.limitations, ...r.limitations])
    details.append(el("p", note, "hint"));
  wrap.append(details);
  return wrap;
}
