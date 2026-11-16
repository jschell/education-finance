import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { canonical } from "../site/js/calibration.js";
const read = (f) => JSON.parse(readFileSync(f, "utf8"));
const previous = read("site/data/calibration-panel.json"),
  economy = read("site/data/economy.json"),
  correction = read("site/data/cost-correction.json");
const processValidation = read("site/data/economy-validation.json");
if (
  economy.panelHash !== previous.panel.hash ||
  correction.panelHash !== previous.panel.hash
)
  throw Error("Panel identities differ");
const body = {
  ...previous,
  id: "us-state-economic-calibration-2026-11-16-v3",
  economy,
  costCorrection: correction.active ? correction.fit : null,
  costValidationHash: createHash("sha256")
    .update(canonical(correction))
    .digest("hex"),
  processValidationHash: createHash("sha256")
    .update(canonical(processValidation))
    .digest("hex"),
  correctionGate: {
    passed: correction.gatePassed,
    baselineScore: correction.baselineScore,
    adjustedScore: correction.adjustedScore,
    independentTargetYears: 1,
  },
  notes: [
    ...previous.notes,
    "Investment simulation now starts at observed five-year and bill yields (" +
      economy.rateDate +
      "); Treasury returns are repriced and bill accrual reinvests at simulated rates.",
    "Central-case state-conditioned source blocks are shared across cases and students; each path also draws persistent joint expectation deviations from observed rolling-ten-year regimes.",
    "Cost correction " +
      (correction.active ? "enabled" : "not enabled") +
      " by a frozen 2024–25 score gate. One new independent target-year shock cannot establish probability calibration.",
  ],
};
delete body.sha256;
body.sha256 = createHash("sha256").update(canonical(body)).digest("hex");
writeFileSync(
  "site/data/calibration-economic.json",
  JSON.stringify(body) + "\n",
);
console.log(
  JSON.stringify({
    id: body.id,
    hash: body.sha256,
    costCorrection: !!body.costCorrection,
    rateDate: economy.rateDate,
  }),
);
