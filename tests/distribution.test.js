import test from "node:test";
import assert from "node:assert/strict";
import { outcomeDistribution } from "../site/js/distribution.js";
test("actual distribution reconciles funded paths and positive gaps without imposing symmetric probabilities", () => {
  const r = outcomeDistribution([100, 100, 100, 200, 300, 5000], {
    fundedCount: 4,
    total: 10,
    bands: 6,
  });
  assert.equal(
    r.bins.reduce((v, b) => v + b.count, 0),
    10,
  );
  assert.equal(r.bins[0].probability, 0.4);
  assert.deepEqual(
    r.bins.map((b) => b.count),
    [4, 5, 1],
  );
  assert.equal(
    r.bins.reduce((v, b) => v + b.probability, 0),
    1,
  );
});
test("constant outcomes and missing entry dates are represented without invented ranges", () => {
  assert.deepEqual(outcomeDistribution([100, 100, 100]).bins, [
    { kind: "point", lower: 100, upper: 100, count: 3, probability: 1 },
  ]);
  assert.equal(outcomeDistribution([]).bins.length, 0);
  assert.equal(
    outcomeDistribution([], { fundedCount: 10, total: 10 }).bins[0].probability,
    1,
  );
});
test("dollar bands allocate endpoints once, preserve all samples and reject invalid counts", () => {
  const samples = [0, 100, 200, 300, 400, 500, 600, 700],
    r = outcomeDistribution(samples);
  assert.equal(
    r.bins.reduce((v, b) => v + b.count, 0),
    samples.length,
  );
  assert.equal(r.bins.at(-1).upper, 700);
  assert.equal(r.bins.at(-1).count, 2);
  assert.throws(() => outcomeDistribution([1], { fundedCount: 1, total: 3 }));
  assert.throws(() => outcomeDistribution([Infinity]));
});
