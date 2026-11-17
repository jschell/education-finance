import { targetReserve } from "./binomial-reserve.js?v=0.13.0";
import { samplingInterval } from "./probability.js?v=0.13.0";
export const VERIFICATION_TRIALS = 5000;
const Z = 1.6448536269514722;
export function savingsReserve(
  fitTrials = 20000,
  verifyTrials = VERIFICATION_TRIALS,
) {
  const epsilon = (n) => Math.sqrt(Math.log(4 / 0.05) / (2 * n));
  const wilsonDistance =
    Z / (2 * Math.sqrt(verifyTrials + Z * Z)) +
    (Z * Z) / (2 * (verifyTrials + Z * Z));
  return epsilon(fitTrials) + epsilon(verifyTrials) + wilsonDistance;
}
export function legacySavingsFitProbability(target, fitTrials = 20000) {
  return Math.min(1, target + savingsReserve(fitTrials));
}
export const savingsFitProbability = (target, fitTrials=20000) => targetReserve(target,fitTrials).fitProbability;
export function savingsConfirmation(passed, trials, target, fitTrials = 20000) {
  const probability = passed / trials;
  const lowerBound = samplingInterval(probability, trials, Z).low;
  const rule = targetReserve(target,fitTrials,trials);
  return {
    trials,
    probability,
    lowerBound,
    meets: lowerBound >= target,
    confidence: 0.95,
    sided: "one-sided",
    requestedProbability: target,
    fitProbability: savingsFitProbability(target, fitTrials),
    reserve: rule.fitProbability-target,
    toleranceRank: rule.rank,
    verificationPower: 0.975,
    fitConfidence: 0.975,
    reserveCapped: !rule.available,
    reserveRule: "target-binomial-tolerance-v1",
  };
}
