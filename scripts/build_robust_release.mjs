import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { canonical } from "../site/js/calibration.js";
const read = (f) => JSON.parse(readFileSync(f, "utf8"));
const old = read("site/data/calibration-economic.json"),
  economy = read("site/data/economy-broad.json"),
  report = read("site/data/robustness-validation.json");
const body = {
  ...old,
  id: "us-broad-economic-calibration-2026-11-16-v4",
  economy,
  archivedEconomyHash: old.economy.sha256,
  costCorrection: report.liveCorrection,
  robustness: {
    reportHash: createHash("sha256").update(canonical(report)).digest("hex"),
    marketPolicy: report.marketPolicy,
    costPolicy: report.costPolicy,
    marketGate: report.marketGate,
    costGate: report.costGate,
    trainingSpan: report.marketHistory,
    macroYears: report.macroYears,
    expectationWindows: report.nonoverlappingExpectationWindows,
  },
  notes: [
    ...old.notes.filter(
      (n) =>
        !n.includes("2024–25 score gate") &&
        !n.includes("each path also draws persistent joint expectation") &&
        !n.startsWith("23 paired academic"),
    ),
    "Macro fitting uses 70 complete years, 1954–2023, with seven disjoint ten-year expectation windows and regularized persistence. College costs retain their separate 2000–2023 panel.",
    "Cost sources retain exact macro-year matching where available; earlier macro years use inflation-conditioned cost-block donors. This does not manufacture pre-2000 college price observations.",
    "Every cost-validation correction is fitted through its forecast origin and shrunk by unique target-year count. Multi-era score gates select the live policies.",
  ],
};
delete body.sha256;
body.sha256 = createHash("sha256").update(canonical(body)).digest("hex");
writeFileSync("site/data/calibration-robust.json", JSON.stringify(body) + "\n");
console.log(
  JSON.stringify({
    id: body.id,
    hash: body.sha256,
    marketPolicy: body.robustness.marketPolicy,
    costPolicy: body.robustness.costPolicy,
  }),
);
