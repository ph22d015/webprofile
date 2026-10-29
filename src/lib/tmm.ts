// Normal-incidence thin-film optics by the characteristic (transfer) matrix method.
//
// Convention (H. A. Macleod, "Thin-Film Optical Filters", ch. 2):
//   complex index N = n − i k  (k ≥ 0 is absorption), time dependence e^{+iωt}
//   phase thickness  δ_j = 2π N_j d_j / λ
//   layer matrix     M_j = [[cos δ_j, i sin δ_j / η_j], [i η_j sin δ_j, cos δ_j]],  η_j = N_j (units of free-space admittance)
//   [B, C]^T = (Π_j M_j) · [1, η_s]^T
//   r = (η_0 B − C) / (η_0 B + C),  R = |r|²
//   T = 4 η_0 Re(η_s) / |η_0 B + C|²
//   A = 4 η_0 Re(B C* − η_s) / |η_0 B + C|²   (equivalently 1 − R − T)
// Valid for a semi-infinite, non-absorbing incident medium and a semi-infinite substrate
// (no back-surface reflection from the substrate).

export type C = { re: number; im: number };
const c = (re: number, im = 0): C => ({ re, im });
const add = (a: C, b: C): C => c(a.re + b.re, a.im + b.im);
const sub = (a: C, b: C): C => c(a.re - b.re, a.im - b.im);
const mul = (a: C, b: C): C => c(a.re * b.re - a.im * b.im, a.re * b.im + a.im * b.re);
const div = (a: C, b: C): C => {
  const d = b.re * b.re + b.im * b.im;
  return c((a.re * b.re + a.im * b.im) / d, (a.im * b.re - a.re * b.im) / d);
};
const conj = (a: C): C => c(a.re, -a.im);
const abs2 = (a: C): number => a.re * a.re + a.im * a.im;
const cos = (z: C): C => c(Math.cos(z.re) * Math.cosh(z.im), -Math.sin(z.re) * Math.sinh(z.im));
const sin = (z: C): C => c(Math.sin(z.re) * Math.cosh(z.im), Math.cos(z.re) * Math.sinh(z.im));
const I = c(0, 1);

export type Layer = { n: number; k: number; d: number }; // d in nm
export type RTA = { R: number; T: number; A: number };

/** R, T, A of a stack at wavelength λ (nm). n0: incident medium index (real). substrate: N_s = n_s − i k_s. */
export function rta(lambda: number, layers: Layer[], n0: number, sub_n: number, sub_k = 0): RTA {
  const eta0 = c(n0);
  const etaS = c(sub_n, -sub_k);
  // Running product, starting from the identity.
  let m11 = c(1), m12 = c(0), m21 = c(0), m22 = c(1);
  for (const L of layers) {
    const N = c(L.n, -L.k);
    const delta = mul(c((2 * Math.PI * L.d) / lambda), N);
    const cd = cos(delta), sd = sin(delta);
    const a11 = cd, a12 = div(mul(I, sd), N), a21 = mul(mul(I, N), sd), a22 = cd;
    [m11, m12, m21, m22] = [
      add(mul(m11, a11), mul(m12, a21)),
      add(mul(m11, a12), mul(m12, a22)),
      add(mul(m21, a11), mul(m22, a21)),
      add(mul(m21, a12), mul(m22, a22)),
    ];
  }
  const B = add(m11, mul(m12, etaS));
  const Cc = add(m21, mul(m22, etaS));
  const den = add(mul(eta0, B), Cc);
  const r = div(sub(mul(eta0, B), Cc), den);
  const R = abs2(r);
  const T = (4 * eta0.re * etaS.re) / abs2(den);
  const A = (4 * eta0.re * (mul(B, conj(Cc)).re - etaS.re)) / abs2(den);
  return { R, T, A };
}
