import { DECISION_VERSION, assessDecisionScenarios } from './decision-scenarios.js?v=0.15.0';
import { assessDepositPolicies } from './deposit-policy.js?v=0.15.0';
import { ACTIVE_CALIBRATION_FILE } from "./release.js?v=0.15.0";
import {
  assessCalibrated,
  verifyCalibration,
  snapshotHash,
} from "./calibration.js?v=0.13.0";
import { assessHousehold } from "./household.js?v=0.13.0";
import { validatePlan } from "./domain.js?v=0.13.0";
import { assessHistorical, verifyHistory } from "./history.js?v=0.13.0";
let dataPromise, calibrationPromise;
async function calibrationData(history) {
  return (calibrationPromise ??= Promise.all(
    [
      ACTIVE_CALIBRATION_FILE,
      "current-calibration.json",
      "decision-validation.json",
      "prospective-validation.json",
      "foundation-validation.json",
      "hierarchy-validation.json",
      "calibration-validation.json",
      "cost-model-comparison.json",
      "economy-validation.json",
      "cost-correction.json",
      "robustness-validation.json",
      "critique-validation.json",
      "funding-validation.json",
    ].map((name) =>
      fetch(new URL("../data/" + name, import.meta.url)).then((r) => {
        if (!r.ok) throw Error("Calibration data could not be loaded.");
        return r.json();
      }),
    ),
  ).then(
    async ([
      bundle,
      currentCalibration,
      decisionEvidence,
      prospective,
      foundation,
      hierarchy,
      validation,
      comparison,
      processValidation,
      correction,
      robustness,
      critique,
      funding,
    ]) => {
      await verifyCalibration(bundle, history);
      for(const report of [currentCalibration,prospective,decisionEvidence]){
        const {sha256,...body}=report;
        if(report.bundleHash!==bundle.sha256 || await snapshotHash(body)!==sha256)
          throw Error("Current calibration evidence identity mismatch.");
      }
      if (decisionEvidence.method !== DECISION_VERSION) throw Error("Decision evidence methodology mismatch.");
      const {sha256: foundationHash, ...foundationBody} = foundation;
      if (foundation.bundleHash !== bundle.sha256 ||
          await snapshotHash(foundationBody) !== foundationHash)
        throw Error("Foundation validation identity mismatch.");
      const {sha256: hierarchyHash,...hierarchyBody}=hierarchy;
      if(hierarchy.bundleHash !== bundle.sha256 || await snapshotHash(hierarchyBody)!==hierarchyHash)
        throw Error("Cost candidate evaluation identity mismatch.");
      if (
        comparison.panelHash !== bundle.panel.hash ||
        comparison.liveModel !== bundle.costModel
      )
        throw Error("Validation report does not match the economic snapshot.");
      if (
        processValidation.bundleHash !==
          (bundle.archivedEconomyHash || bundle.economy.sha256) ||
        (await snapshotHash(processValidation)) !==
          bundle.processValidationHash ||
        (await snapshotHash(correction)) !== bundle.costValidationHash ||
        correction.panelHash !== bundle.panel.hash ||
        (!bundle.robustness && correction.active !== !!bundle.costCorrection)
      )
        throw Error("Economic validation identities differ.");
      if (
        (await snapshotHash(robustness)) !== bundle.robustness.reportHash ||
        robustness.macroDataHash !== bundle.economy.sha256
      )
        throw Error("Broad-history validation identity mismatch.");
      if (
        (await snapshotHash(critique)) !== bundle.review.critiqueHash ||
        (await snapshotHash(funding)) !== bundle.review.fundingHash ||
        funding.critiqueHash !== bundle.review.critiqueHash ||
        critique.baseHash !== bundle.review.baseHash ||
        funding.baseHash !== bundle.review.baseHash ||
        critique.protocolHash !== bundle.review.protocolHash ||
        funding.protocolHash !== bundle.review.protocolHash
      )
        throw Error("Whole-plan validation identity mismatch.");
      return {
        bundle,
        validation: {
          ...validation,
          currentCalibration,
          decisionEvidence,
          prospective,
          foundation,
          hierarchy,
          comparison,
          processValidation,
          correction,
          robustness,
          critique,
          funding,
        },
      };
    },
  ));
}
function data() {
  return (dataPromise ??= fetch(
    new URL("../data/history.json", import.meta.url),
  )
    .then((r) => {
      if (!r.ok)
        throw Error("Historical data could not be loaded. Reload and retry.");
      return r.json();
    })
    .then(verifyHistory));
}
self.onmessage = async ({ data: input }) => {
  const { runId, studentId, scenarioId, settings, action } = input;
  try {
    const plan = validatePlan(input.plan),
      dataset = await data();
    const st = plan.students.find((s) => s.id === studentId);
    if (!st) throw Error("Student not found.");
    const progress = (p) => self.postMessage({ runId, type: "progress", ...p });
    const calibrated = settings.method !== "historical";
    const calibration = calibrated ? await calibrationData(dataset) : null;
    const assess = (plan, student, scenario, data, settings, progress) =>
      calibrated
        ? assessCalibrated(
            plan,
            student,
            scenario,
            data,
            calibration.bundle,
            calibration.validation,
            settings,
            progress,
          )
        : assessHistorical(plan, student, scenario, data, settings, progress);
    let result;
    if (action === "compare") {
      result = st.scenarios.map((scenario, i) => {
        progress({
          stage: `Scenario ${i + 1} of ${st.scenarios.length}`,
          done: i,
          total: st.scenarios.length,
        });
        return {
          id: scenario.id,
          name: scenario.name,
          ...assess(plan, st, scenario, dataset, settings, (p) =>
            progress({ ...p, scenario: scenario.name }),
          ),
        };
      });
    } else {
      const scenario = st.scenarios.find((s) => s.id === scenarioId);
      if (!scenario) throw Error("Scenario not found.");
      result = assess(plan, st, scenario, dataset, settings, progress);
    }
    progress({stage: "Attendance, support and deposit decisions", done: 0, total: 1});
    if (Array.isArray(result)) result.forEach((r) => {
      r.decisions = assessDecisionScenarios(plan, st, st.scenarios.find(s => s.id === r.id), dataset, settings, calibration?.bundle);
    });
    else result.decisions = assessDecisionScenarios(plan, st, st.scenarios.find(s => s.id === scenarioId), dataset, settings, calibration?.bundle);
    if (calibrated) {
      if (Array.isArray(result)) result.forEach(r => r.decisionEvidence = calibration.validation.decisionEvidence);
      else result.decisionEvidence = calibration.validation.decisionEvidence;
    }
    if (plan.students.length > 1 || plan.family.monthlyLimit !== null) {
      const chosen = st.scenarios.find((s) => s.id === scenarioId);
      let household = assessHousehold(
        plan,
        dataset,
        settings,
        chosen.history,
        progress,
        calibrated
          ? {
              bundle: calibration.bundle,
              assumptionCase: calibration.bundle.macro.cases[1],
            }
          : null,
      );
      if (calibrated) {
        household.cases = calibration.bundle.macro.cases.map(
          (assumptionCase) => ({
            name: assumptionCase.name,
            probability:
              assumptionCase.id === calibration.bundle.macro.cases[1].id
                ? household.probability
                : assessHousehold(
                    plan,
                    dataset,
                    settings,
                    chosen.history,
                    progress,
                    { bundle: calibration.bundle, assumptionCase },
                  ).probability,
          }),
        );
      }
      household.decisionPolicies = assessDepositPolicies(plan, dataset, settings, chosen.history, calibration?.bundle);
      if (Array.isArray(result))
        result.forEach((r) => (r.household = household));
      else result.household = household;
    }
    self.postMessage({ runId, type: "result", result });
  } catch (error) {
    self.postMessage({ runId, type: "error", message: error.message });
  }
};
