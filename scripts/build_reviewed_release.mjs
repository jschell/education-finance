import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { canonical } from "../site/js/calibration.js";
const read = (f) => JSON.parse(readFileSync(f, "utf8"));
const base = read("site/data/calibration-robust.json"),
  critique = read("site/data/critique-validation.json"),
  funding = read("site/data/funding-validation.json");
const hash = (x) => createHash("sha256").update(canonical(x)).digest("hex");
const body = {
  ...base,
  id: "us-reviewed-economic-calibration-2026-11-16-v5",
  costUncertainty: critique.liveSpread,
  review: {
    baseHash: base.sha256,
    critiqueHash: hash(critique),
    fundingHash: hash(funding),
    protocolHash: critique.protocolHash,
    spreadGate: critique.spreadGate,
    savingsRuleHash: createHash("sha256")
      .update(readFileSync("docs/savings-reserve-rule.md"))
      .digest("hex"),
  },
  notes: [
    ...base.notes,
    "The assumption-case envelope has no confidence level or probability weights. Whole-plan historical diagnostics use the production ledger, origin-limited training and synthetic plans; they do not establish future funding calibration.",
    critique.liveSpread
      ? "Additional persistent paired price uncertainty is fitted from earlier target-year errors and passed the declared score/coverage comparison."
      : "The price uncertainty candidate failed its declared score/coverage comparison; the preceding cost process is retained.",
  ],
};
delete body.sha256;
body.sha256 = hash(body);
writeFileSync(
  "site/data/calibration-reviewed.json",
  JSON.stringify(body) + "\n",
);
console.log(
  JSON.stringify({
    id: body.id,
    hash: body.sha256,
    spreadActive: !!body.costUncertainty,
  }),
);
