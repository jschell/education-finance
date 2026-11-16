const KEY = "education-finance-session-seed-v1";
function browserStorage() {
  try {
    return globalThis.sessionStorage;
  } catch {
    return null;
  }
}
const valid = (n) => Number.isInteger(n) && n >= 0 && n <= 4294967295;
const generate = () => crypto.getRandomValues(new Uint32Array(1))[0];
export function sessionSeed(storage = browserStorage(), randomSeed = generate) {
  try {
    const text = storage?.getItem(KEY);
    if (typeof text === "string" && /^\d+$/.test(text) && valid(Number(text)))
      return Number(text);
  } catch {}
  const seed = randomSeed();
  if (!valid(seed)) throw Error("Invalid generated seed.");
  return updateSessionSeed(seed, storage);
}
export function updateSessionSeed(seed, storage = browserStorage()) {
  if (!valid(seed))
    throw Error("Seed must be a whole number from 0 to 4294967295.");
  try {
    storage?.setItem(KEY, String(seed));
  } catch {}
  return seed;
}
