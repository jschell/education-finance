import { samplingInterval } from "./probability.js?v=0.10.2";
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
export function savingsFitProbability(target, fitTrials = 20000) {
  return Math.min(1, target + savingsReserve(fitTrials));
}
export function savingsConfirmation(passed, trials, target, fitTrials = 20000) {
  const probability = passed / trials;
  const lowerBound = samplingInterval(probability, trials, Z).low;
  return {
    trials,
    probability,
    lowerBound,
    meets: lowerBound >= target,
    confidence: 0.95,
    sided: "one-sided",
    requestedProbability: target,
    fitProbability: savingsFitProbability(target, fitTrials),
    reserve: savingsReserve(fitTrials, trials),
    reserveCapped: target + savingsReserve(fitTrials, trials) > 1,
    reserveRule: "joint-DKW-plus-Wilson-distance-v1",
  };
}
