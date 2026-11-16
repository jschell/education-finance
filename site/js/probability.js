// Wilson interval measures Monte Carlo sampling uncertainty, not model error.
export function samplingInterval(probability, trials, z = 1.96) {
  const n = trials,
    p = probability,
    z2 = z * z,
    center = (p + z2 / (2 * n)) / (1 + z2 / n),
    half = (z * Math.sqrt((p * (1 - p)) / n + z2 / (4 * n * n))) / (1 + z2 / n);
  return { low: Math.max(0, center - half), high: Math.min(1, center + half) };
}
export function targetStatus(probability, trials, target) {
  const interval = samplingInterval(probability, trials);
  return interval.low <= target && interval.high >= target
    ? "Near target"
    : probability >= target
      ? "Target met"
      : "Below target";
}

export function samplingRangeText(probability, trials) {
  const { low, high } = samplingInterval(probability, trials),
    format = (x) => x.toLocaleString("en-US", { maximumFractionDigits: 1 });
  return `${format(Math.floor(low * 1000) / 10)}%–${format(Math.ceil(high * 1000) / 10)}%`;
}
