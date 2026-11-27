import type {
  SolverFormValues,
  OpticalResponsePoint,
  LayerMaterialProperties,
  DispersiveDataPoint,
} from './optistack-types';

// Transfer-matrix method after S. J. Byrnes, "Multilayer optical calculations" (arXiv:1603.02720).
// Convention: complex index N = n + ik.

type Complex = { re: number; im: number };
type Matrix = [[Complex, Complex], [Complex, Complex]];

const complex = (re: number, im = 0): Complex => ({ re, im });
const cadd = (a: Complex, b: Complex) => complex(a.re + b.re, a.im + b.im);
const csub = (a: Complex, b: Complex) => complex(a.re - b.re, a.im - b.im);
const cmul = (a: Complex, b: Complex) =>
  complex(a.re * b.re - a.im * b.im, a.re * b.im + a.im * b.re);
const cdiv = (a: Complex, b: Complex) => {
  const d = b.re * b.re + b.im * b.im;
  return complex((a.re * b.re + a.im * b.im) / d, (a.im * b.re - a.re * b.im) / d);
};
const cabsSq = (a: Complex) => a.re * a.re + a.im * a.im;
const conj = (a: Complex) => complex(a.re, -a.im);
const cexp = (z: Complex) => {
  const m = Math.exp(z.re);
  return complex(m * Math.cos(z.im), m * Math.sin(z.im));
};
const csqrt = (z: Complex) => {
  const r = Math.hypot(z.re, z.im);
  const im = Math.sqrt((r - z.re) / 2);
  return complex(Math.sqrt((r + z.re) / 2), z.im < 0 ? -im : im);
};
const mmul = (A: Matrix, B: Matrix): Matrix => [
  [
    cadd(cmul(A[0][0], B[0][0]), cmul(A[0][1], B[1][0])),
    cadd(cmul(A[0][0], B[0][1]), cmul(A[0][1], B[1][1])),
  ],
  [
    cadd(cmul(A[1][0], B[0][0]), cmul(A[1][1], B[1][0])),
    cadd(cmul(A[1][0], B[0][1]), cmul(A[1][1], B[1][1])),
  ],
];

const NUM_POINTS = 200;
const FP_TOLERANCE = 1e-9;
// Above e^-35 a layer is opaque; capping Im(δ) keeps thick absorbers from overflowing the matrix product.
const MAX_LOSS = 35;
const ZERO = { reflectance: 0, transmittance: 0, absorptance: 0 };

function interpolateNK(wavelength: number, data: DispersiveDataPoint[]): Complex {
  if (data.length === 0) return complex(1);
  const last = data[data.length - 1];
  if (wavelength <= data[0].wavelength) return complex(data[0].n, data[0].k);
  if (wavelength >= last.wavelength) return complex(last.n, last.k);
  let i = 0;
  while (data[i + 1].wavelength < wavelength) i++;
  const a = data[i],
    b = data[i + 1];
  const f = (wavelength - a.wavelength) / (b.wavelength - a.wavelength);
  return complex(a.n + f * (b.n - a.n), a.k + f * (b.k - a.k));
}

// Complex Snell's law: cos θ in a medium of index N, from the conserved N₀·sin θ₀. Takes the
// forward branch (decaying, or right-moving if lossless), so evanescent waves and absorbers are exact.
function cosTheta(N: Complex, s0: Complex): Complex {
  const s = cdiv(s0, N);
  const cos = csqrt(csub(complex(1), cmul(s, s)));
  const q = cmul(N, cos);
  const forward = Math.abs(q.im) > 1e-12 * Math.abs(q.re) ? q.im > 0 : q.re > 0;
  return forward ? cos : complex(-cos.re, -cos.im);
}

function solvePoint(
  props: (LayerMaterialProperties | undefined)[],
  thickness: number[],
  wavelength: number,
  angle: number,
  polarization: 'TE' | 'TM',
): Omit<OpticalResponsePoint, 'xValue'> {
  if (props.some((p) => !p)) return ZERO;
  const N = props.map((p) =>
    p!.type === 'constant' ? complex(p!.n, p!.k) : interpolateNK(wavelength, p!.data),
  );
  const s0 = cmul(N[0], complex(Math.sin(angle)));
  const cos = N.map((n) => cosTheta(n, s0));
  const tm = polarization === 'TM';

  let M: Matrix = [
    [complex(1), complex(0)],
    [complex(0), complex(1)],
  ];
  let tProduct = complex(1);
  for (let j = 0; j < N.length - 1; j++) {
    // Fresnel coefficients at interface j → j+1.
    const a = tm ? cmul(N[j + 1], cos[j]) : cmul(N[j], cos[j]);
    const b = tm ? cmul(N[j], cos[j + 1]) : cmul(N[j + 1], cos[j + 1]);
    const r = cdiv(csub(a, b), cadd(a, b));
    const t = cdiv(cmul(complex(2), cmul(N[j], cos[j])), cadd(a, b));
    // Phase across layer j (none for the semi-infinite incident medium).
    let delta = complex(0);
    if (j > 0) {
      delta = cmul(cmul(N[j], cos[j]), complex((2 * Math.PI * thickness[j - 1]) / wavelength));
      if (delta.im > MAX_LOSS) delta = complex(delta.re, MAX_LOSS);
    }
    const back = cexp(complex(delta.im, -delta.re)); // e^{-iδ}
    const fwd = cexp(complex(-delta.im, delta.re)); // e^{+iδ}
    M = mmul(M, [
      [back, cmul(r, back)],
      [cmul(r, fwd), fwd],
    ]);
    tProduct = cmul(tProduct, t);
  }

  const last = N.length - 1;
  const R = cabsSq(cdiv(M[1][0], M[0][0]));
  const power = (i: number) => cmul(N[i], tm ? conj(cos[i]) : cos[i]).re;
  const T = (cabsSq(cdiv(tProduct, M[0][0])) * power(last)) / power(0);
  if (!Number.isFinite(R) || !Number.isFinite(T)) return ZERO;
  const reflectance = Math.min(1, Math.max(0, R));
  const transmittance = Math.min(1 - reflectance, Math.max(0, T));
  return { reflectance, transmittance, absorptance: 1 - reflectance - transmittance };
}

export function calculateOpticalResponse(params: SolverFormValues) {
  const library = new Map<string, LayerMaterialProperties>(
    params.materialLibrary.map((m) => [m.id, m.properties]),
  );
  // An unknown material yields undefined, and solvePoint then returns zeros.
  const props = [
    params.incidentMediumMaterialId,
    ...params.layerMaterials.map((l) => l.materialId),
    params.substrateMediumMaterialId,
  ].map((id) => library.get(id));
  const thickness = params.thickness.map((t) => Math.max(0, t));
  const wave = params.sweepType === 'wavelength';
  const [from, to] = wave
    ? [params.minWavelength, params.maxWavelength]
    : [params.minAngle, params.maxAngle];

  const data: OpticalResponsePoint[] = [];
  for (let i = 0; i < NUM_POINTS; i++) {
    const x = from + (i * (to - from)) / (NUM_POINTS - 1);
    const wavelength = Math.max(FP_TOLERANCE, wave ? x : params.wavelength);
    const angle = ((wave ? (params.angleOfIncidence ?? 0) : x) * Math.PI) / 180;
    data.push({
      xValue: wave ? wavelength : x,
      ...solvePoint(props, thickness, wavelength, angle, params.polarization),
    });
  }
  return { data };
}

// Form/file parsing for the OptiStack UI.
export function number(value: string, label: string, min = 0, max = Infinity) {
  const result = Number(value);
  if (!value.trim() || !Number.isFinite(result) || result < min || result > max)
    throw new Error('Check ' + label + '.');
  return result;
}

export function dispersion(table: string): DispersiveDataPoint[] {
  const lines = table
    .trim()
    .replace(/^\uFEFF/, '')
    .split(/\r?\n/)
    .filter((line) => line.trim() && !line.trim().startsWith('#'));
  if (
    /^(wavelength|lambda|λ|wl)\b/i.test(lines[0] || '') ||
    /^wavelength_/i.test(lines[0] || '')
  )
    lines.shift();
  const data = lines
    .map((line, i) => {
      const cells = line.trim().split(/\s*[,;\t]\s*| +/);
      if (cells.length !== 3)
        throw new Error(
          'Expected three columns in dispersion row ' + (i + 1) + '.',
        );
      return {
        wavelength: number(
          cells[0],
          'wavelength in row ' + (i + 1),
          Number.MIN_VALUE,
        ),
        n: number(cells[1], 'n in row ' + (i + 1), Number.MIN_VALUE),
        k: number(cells[2], 'k in row ' + (i + 1)),
      };
    })
    .sort((a, b) => a.wavelength - b.wavelength);
  if (
    data.length < 2 ||
    data.some((p, i) => i > 0 && p.wavelength === data[i - 1].wavelength)
  )
    throw new Error(
      'Enter at least two distinct wavelengths; each wavelength may appear once.',
    );
  return data;
}
