// Beam-radius checks for the knife-edge fits. Run: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { erf, parseScan, performErfFit, performGaussianFit } from './knife-edge.ts';

// Synthetic scan of a Gaussian beam (1/e² radius w = 0.25 mm, centre 1 mm) with small fixed noise.
// 20 µm steps = ~6 points per σ; much coarser scans bias the smoothed Gaussian fit wide (see default SG window).
const W = 0.25;
let seed = 1;
const noise = () => ((seed = (seed * 16807) % 2147483647) / 2147483647 - 0.5) * 0.01;
const x = Array.from({ length: 151 }, (_, i) => i * 0.02);
const rising = x.map((v) => 0.1 + 2.5 * (1 + erf((Math.SQRT2 * (v - 1)) / W)) + noise());

const within1pct = (got: number) => assert.ok(Math.abs(got / W - 1) < 0.01, `w = ${got}, expected ${W}`);

test('erf fit recovers the beam radius for rising and falling scans', () => {
  for (const y of [rising, [...rising].reverse()]) {
    const e = performErfFit(x, y);
    assert.ok(e.success);
    within1pct(e.w);
    assert.equal(e.diameter, 2 * e.w);
  }
});

test('derivative Gaussian fit recovers the same beam radius', () => {
  const g = performGaussianFit(x, rising, 11, 3, 0);
  assert.ok(g.success);
  assert.notEqual(g.dySmooth, g.dy, 'Savitzky-Golay smoothing did not run');
  within1pct(g.w);
  assert.ok(Math.abs(g.x0 - 1) < 0.01);
});

test('scan file: header and quotes dropped, rows sorted by position, bad files rejected', () => {
  const scan = parseScan('"Position (mm)","Power (mW)"\n0.3;5\n0.1;1\n0.2,3\n0.5\t9\n0.4 7\n', 'scan.csv');
  assert.deepEqual(scan.x, [0.1, 0.2, 0.3, 0.4, 0.5]);
  assert.deepEqual(scan.y, [1, 3, 5, 7, 9]);
  const eu = parseScan('Position;Power\n0,1;1,5\n0,2;2,5\n0,3;3,5\n0,4;4,5\n0,5;5,5\n', 'eu.csv');
  assert.deepEqual(eu.x, [0.1, 0.2, 0.3, 0.4, 0.5]);
  assert.deepEqual(eu.y, [1.5, 2.5, 3.5, 4.5, 5.5]);
  assert.throws(() => parseScan('0,1\n1,2\n1,3\n2,4\n3,5', 'dup.csv'), /Duplicate positions/);
  assert.throws(() => parseScan('0,1\n1,1\n2,1\n3,1\n4,1', 'flat.csv'), /constant/);
  assert.throws(() => parseScan('0,1\n1,2', 'short.csv'), /five distinct/);
});
