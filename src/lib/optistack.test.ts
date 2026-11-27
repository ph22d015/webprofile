// Physics checks for the transfer-matrix solver. Run: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calculateOpticalResponse, dispersion } from './optistack.ts';

type Pol = 'TE' | 'TM';
// One sweep point at a fixed angle (degrees) and wavelength (nm). mats: id → [n, k]; 'i' incident, 's' substrate.
function at(pol: Pol, mats: Record<string, [number, number]>, layers: [string, number][], deg: number, wl: number) {
  return calculateOpticalResponse({
    sweepType: 'angle',
    polarization: pol,
    materialLibrary: Object.entries(mats).map(([id, [n, k]]) => ({ id, properties: { type: 'constant', n, k } })),
    incidentMediumMaterialId: 'i',
    substrateMediumMaterialId: 's',
    thickness: layers.map(([, d]) => d),
    layerMaterials: layers.map(([materialId]) => ({ materialId })),
    minWavelength: 1,
    maxWavelength: 2,
    angleOfIncidence: 0,
    wavelength: wl,
    minAngle: deg,
    maxAngle: deg + 1e-6,
  }).data[0];
}
const close = (a: number, b: number, tol = 1e-9) => assert.ok(Math.abs(a - b) < tol, `${a} vs ${b}`);

test('single film at normal incidence matches the Airy formula', () => {
  const [n0, n1, n2, d, wl] = [1, 2, 1.5, 100, 600];
  const r01 = (n0 - n1) / (n0 + n1), r12 = (n1 - n2) / (n1 + n2), c = Math.cos((4 * Math.PI * n1 * d) / wl);
  const R = (r01 ** 2 + r12 ** 2 + 2 * r01 * r12 * c) / (1 + r01 ** 2 * r12 ** 2 + 2 * r01 * r12 * c);
  const p = at('TE', { i: [n0, 0], f: [n1, 0], s: [n2, 0] }, [['f', d]], 0, wl);
  close(p.reflectance, R);
  close(p.transmittance, 1 - R);
});

test('lossless stack conserves energy at oblique incidence', () => {
  for (const pol of ['TE', 'TM'] as const) {
    const p = at(pol, { i: [1, 0], a: [2.2, 0], b: [1.45, 0], s: [1.5, 0] }, [['a', 120], ['b', 300], ['a', 80]], 50, 900);
    close(p.reflectance + p.transmittance, 1);
  }
});

test('frustrated total internal reflection through a thin air gap', () => {
  // glass | 100 nm air | glass at 60°, 1550 nm; reference from the complex-angle Fresnel formula.
  const p = at('TE', { i: [1.5, 0], g: [1, 0], s: [1.5, 0] }, [['g', 100]], 60, 1550);
  close(p.reflectance, 0.10592554179854, 1e-9);
  close(p.transmittance, 0.89407445820146, 1e-9);
  // A gap many wavelengths thick turns it back into total reflection.
  assert.ok(at('TE', { i: [1.5, 0], g: [1, 0], s: [1.5, 0] }, [['g', 5000]], 60, 1550).reflectance > 0.999999);
});

test('metal at oblique incidence is not forced to R = 1', () => {
  const p = at('TE', { i: [1, 0], s: [0.18, 10] }, [], 45, 1550);
  close(p.reflectance, 0.99498598780851, 1e-9);
});

test('Brewster angle gives zero TM reflection', () => {
  close(at('TM', { i: [1, 0], s: [1.5, 0] }, [], (Math.atan(1.5) * 180) / Math.PI, 600).reflectance, 0, 1e-12);
});

test('very thick absorber stays finite', () => {
  const p = at('TM', { i: [1, 0], m: [0.2, 10], s: [1.5, 0] }, [['m', 1e6]], 40, 1550);
  assert.ok(Number.isFinite(p.reflectance) && p.transmittance < 1e-12);
});

test('dispersion table: header, comments, mixed separators and unsorted rows are read and sorted', () => {
  const data = dispersion('﻿wavelength,n,k\n# comment\n800; 2.0; 0.1\n400\t1.5\t0\n600 1.8 0.05\n');
  assert.deepEqual(data, [
    { wavelength: 400, n: 1.5, k: 0 },
    { wavelength: 600, n: 1.8, k: 0.05 },
    { wavelength: 800, n: 2, k: 0.1 },
  ]);
  assert.throws(() => dispersion('400,1.5,0\n400,1.6,0'), /distinct wavelengths/);
  assert.throws(() => dispersion('400,1.5\n500,1.6'), /three columns/);
});
