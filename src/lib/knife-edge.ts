import { levenbergMarquardt as LM } from 'ml-levenberg-marquardt';
import sggImport from 'ml-savitzky-golay';

// Node loads the package's CommonJS build, which nests the function under .default; bundlers use the ESM build.
const sgg = (sggImport as unknown as { default?: typeof sggImport }).default ?? sggImport;

const LM_OPTIONS = { damping: 1.5, maxIterations: 1000, errorTolerance: 1e-4 };

// Error function approximation
export function erf(x: number): number {
  const sign = x >= 0 ? 1 : -1;
  x = Math.abs(x);

  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;

  const t = 1.0 / (1.0 + p * x);
  const y =
    1.0 - ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);
  return sign * y;
}

export function rSquared(yMeas: number[], yPred: number[]): number {
  const mean = yMeas.reduce((a, b) => a + b, 0) / yMeas.length;
  const ssTot = yMeas.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0);
  const ssRes = yMeas.reduce(
    (acc, val, i) => acc + Math.pow(val - yPred[i], 2),
    0,
  );
  return ssTot === 0 ? 0 : 1 - ssRes / ssTot;
}

export function erfFitFunction([p0, A, x0, w]: number[]) {
  return (x: number) => p0 + (A / 2) * (1 + erf((Math.sqrt(2) * (x - x0)) / w));
}

export function gaussianFitFunction([A, x0, sigma, offset]: number[]) {
  return (x: number) =>
    A * Math.exp(-Math.pow(x - x0, 2) / (2 * Math.pow(sigma, 2))) + offset;
}

export function performErfFit(xData: number[], yData: number[]) {
  const low = Math.min(...yData),
    high = Math.max(...yData);
  const falling = yData[0] > yData[yData.length - 1];
  const p0Guess = falling ? high : low;
  const AGuess = falling ? low - high : high - low;
  const midpoint = p0Guess + AGuess / 2;

  // Find index closest to midpoint
  let minDiff = Infinity;
  let x0Guess = xData[0];
  for (let i = 0; i < yData.length; i++) {
    const diff = Math.abs(yData[i] - midpoint);
    if (diff < minDiff) {
      minDiff = diff;
      x0Guess = xData[i];
    }
  }

  const wGuess = (Math.max(...xData) - Math.min(...xData)) / 10;

  const initialValues = [p0Guess, AGuess, x0Guess, wGuess];

  try {
    const result = LM({ x: xData, y: yData }, erfFitFunction, { ...LM_OPTIONS, initialValues });
    const popt = result.parameterValues;
    if (!popt.every(Number.isFinite))
      throw new Error('Fit returned non-finite parameters.');
    const fitW = popt[3];
    const diameter = 2 * Math.abs(fitW);

    const yPred = xData.map(erfFitFunction(popt));
    const r2 = rSquared(yData, yPred);

    return {
      success: true as const,
      popt,
      x0: popt[2],
      w: Math.abs(fitW),
      diameter,
      r2,
      yPred,
    };
  } catch (e) {
    console.error('Erf fit failed', e);
    return { success: false as const, error: String(e) };
  }
}

export function performGaussianFit(
  xData: number[],
  yData: number[],
  windowSize: number,
  polyOrder: number,
  wGuess: number,
) {
  // Step 4a: Numerical derivative
  const dy: number[] = [];
  const xMid: number[] = [];
  for (let i = 0; i < xData.length - 1; i++) {
    const dx = xData[i + 1] - xData[i];
    if (dx === 0) continue; // avoid division by zero
    dy.push((yData[i + 1] - yData[i]) / dx);
    xMid.push((xData[i] + xData[i + 1]) / 2);
  }

  // Step 4b: Savitzky-Golay smoothing
  let window = Math.min(windowSize, dy.length);
  if (window % 2 === 0) window -= 1;
  let minWindow = polyOrder + 2;
  if (minWindow % 2 === 0) minWindow += 1;
  window = Math.max(window, minWindow);

  let dySmooth = dy;
  if (window <= dy.length) {
    try {
      // ml-savitzky-golay expects uniform spacing for derivative, but we use derivative: 0
      // deltaX doesn't matter for derivative 0
      dySmooth = sgg(dy, 1, {
        windowSize: window,
        polynomial: polyOrder,
        derivative: 0,
        pad: 'post',
        padValue: 'replicate',
      });
    } catch (e) {
      console.warn('SG filter failed, using raw derivative', e);
    }
  }

  // Step 4c: Gaussian fit
  let maxAbsDy = -1;
  let peakIdx = 0;
  for (let i = 0; i < dySmooth.length; i++) {
    if (Math.abs(dySmooth[i]) > maxAbsDy) {
      maxAbsDy = Math.abs(dySmooth[i]);
      peakIdx = i;
    }
  }

  const A_g_guess = dySmooth[peakIdx];
  const x0_g_guess = xMid[peakIdx];
  const sigma_guess = wGuess || (Math.max(...xData) - Math.min(...xData)) / 10;
  const off_guess =
    A_g_guess < 0 ? Math.max(...dySmooth) : Math.min(...dySmooth);

  const initialValues = [A_g_guess, x0_g_guess, sigma_guess, off_guess];

  try {
    const result = LM({ x: xMid, y: dySmooth }, gaussianFitFunction, { ...LM_OPTIONS, initialValues });
    const popt = result.parameterValues;
    if (!popt.every(Number.isFinite))
      throw new Error('Fit returned non-finite parameters.');
    const fitSigma = Math.abs(popt[2]);

    const fwhm = 2 * Math.sqrt(2 * Math.log(2)) * fitSigma;
    const wFromGauss = 2 * fitSigma; // 1/e² radius of a Gaussian intensity profile
    const diameterG = 2 * wFromGauss;

    const yPred = xMid.map(gaussianFitFunction(popt));
    const r2 = rSquared(dySmooth, yPred);

    // Calculate empirical noise from SG filter (RMS of residuals between raw and smoothed derivative)
    let noiseSumSq = 0;
    for (let i = 0; i < dy.length; i++) {
      noiseSumSq += Math.pow(dy[i] - dySmooth[i], 2);
    }
    const noiseRms = Math.sqrt(noiseSumSq / dy.length);

    // Calculate Signal-to-Noise Ratio (Peak Amplitude / RMS Noise)
    const snr = noiseRms > 0 ? Math.abs(popt[0]) / noiseRms : Infinity;

    return {
      success: true as const,
      popt,
      x0: popt[1],
      sigma: fitSigma,
      fwhm,
      w: wFromGauss,
      diameter: diameterG,
      r2,
      noiseRms,
      snr,
      dy,
      dySmooth,
      xMid,
      yPred,
    };
  } catch (e) {
    console.error('Gaussian fit failed', e);
    return { success: false as const, error: String(e), dy, dySmooth, xMid };
  }
}

// Reads an uploaded knife-edge scan (position, power) file.
export type Scan = { name: string; x: number[]; y: number[] };
export function parseScan(text: string, name: string): Scan {
  // Cells split on comma, semicolon, tab or spaces; quotes dropped.
  const rows = text
    .split(/\r?\n/)
    .filter((line) => line.trim())
    .map((line) => {
      line = line.replace(/"/g, '').trim();
      // Semicolon-separated files (European Excel) write decimals with a comma: "0,10;1,23".
      return line.includes(';')
        ? line.replace(/,/g, '.').split(/\s*;\s*/)
        : line.split(/\s*[,\t]\s*| +/);
    });
  if (
    rows.length &&
    rows[0].slice(0, 2).every((s) => s.trim() && !Number.isFinite(Number(s)))
  )
    rows.shift();
  const points = rows
    .map((r, i) => {
      if (
        r.length < 2 ||
        r.slice(0, 2).some((s) => !s.trim() || !Number.isFinite(Number(s)))
      )
        throw new Error(
          'Check position and power in data row ' + (i + 1) + '.',
        );
      return [Number(r[0]), Number(r[1])];
    })
    .sort((a, b) => a[0] - b[0]);
  if (points.length < 5)
    throw new Error('Both fits need at least five distinct positions.');
  if (points.some(([x], i) => i > 0 && x === points[i - 1][0]))
    throw new Error(
      'Duplicate positions prevent differentiation. Average repeated measurements at each position first.',
    );
  if (points.every((p) => p[1] === points[0][1]))
    throw new Error('The power is constant across this scan.');
  return { name, x: points.map((p) => p[0]), y: points.map((p) => p[1]) };
}
