import test from "node:test";
import assert from "node:assert/strict";
import { sessionSeed, updateSessionSeed } from "../site/js/session-seed.js";
import { gaugeColor } from "../site/js/gauge-colors.js";
const memory = () => {
  const m = new Map();
  return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v) };
};
test("a tab session generates once, survives reload and accepts custom zero or maximum seed", () => {
  const storage = memory();
  let calls = 0;
  assert.equal(
    sessionSeed(storage, () => {
      calls++;
      return 123456789;
    }),
    123456789,
  );
  assert.equal(
    sessionSeed(storage, () => {
      calls++;
      return 42;
    }),
    123456789,
  );
  assert.equal(calls, 1);
  updateSessionSeed(0, storage);
  assert.equal(sessionSeed(storage), 0);
  updateSessionSeed(4294967295, storage);
  assert.equal(sessionSeed(storage), 4294967295);
  assert.equal(
    sessionSeed(memory(), () => 987654321),
    987654321,
  );
});
test("invalid saved seeds regenerate and restricted session storage leaves a usable seed", () => {
  const storage = memory();
  storage.setItem("education-finance-session-seed-v1", "-1");
  assert.equal(
    sessionSeed(storage, () => 7),
    7,
  );
  const blocked = {
    getItem() {
      throw Error("blocked");
    },
    setItem() {
      throw Error("blocked");
    },
  };
  assert.equal(
    sessionSeed(blocked, () => 8),
    8,
  );
  assert.equal(updateSessionSeed(9, blocked), 9);
  for (const n of [-1, 1.5, 4294967296, NaN])
    assert.throws(() => updateSessionSeed(n, storage));
});
test("the whole-arc color reaches yellow at 45%, light green at 60%, dark green at the selected target", () => {
  for (const target of [0.8, 0.9, 0.95]) {
    assert.equal(gaugeColor(0, target), "#8c3029");
    assert.equal(gaugeColor(0.45, target), "#edc84b");
    assert.equal(gaugeColor(0.6, target), "#a8cf8c");
    assert.equal(gaugeColor(target, target), "#195e50");
    assert.equal(gaugeColor(1, target), "#12493e");
    assert.notEqual(gaugeColor(0.3, target), gaugeColor(0.45, target));
    assert.notEqual(gaugeColor(0.6, target), gaugeColor(0.75, target));
  }
  assert.equal(gaugeColor(-1, 0.9), gaugeColor(0, 0.9));
  assert.equal(gaugeColor(2, 0.9), gaugeColor(1, 0.9));
  assert.throws(() => gaugeColor(0.5, 1));
});
