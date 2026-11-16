// Shared deterministic sampling utilities; the unused lognormal engine was removed.
export function random(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export function quantile(sorted, p) {
  if (!sorted.length) return null;
  const at = (sorted.length - 1) * p,
    low = Math.floor(at),
    w = at - low;
  if (w === 0 || low === sorted.length - 1) return sorted[low];
  if (!Number.isFinite(sorted[low + 1])) return Infinity;
  return sorted[low] * (1 - w) + sorted[low + 1] * w;
}
