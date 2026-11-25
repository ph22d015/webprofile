import type {
  SolverFormValues,
  OpticalResponsePoint,
  SweepParameter,
  LayerMaterialProperties,
  DispersiveDataPoint,
} from './optistack-types';

// Complex Number Utilities
type Complex = { re: number; im: number };

function complex(re: number, im: number = 0): Complex {
  return { re, im };
}
const C_ZERO = complex(0, 0);
const C_ONE = complex(1, 0);
const C_I = complex(0, 1);
const C_I_NEG = complex(0, -1);

function cadd(a: Complex, b: Complex): Complex {
  return complex(a.re + b.re, a.im + b.im);
}
function csub(a: Complex, b: Complex): Complex {
  return complex(a.re - b.re, a.im - b.im);
}
function cmul(a: Complex, b: Complex): Complex {
  return complex(a.re * b.re - a.im * b.im, a.re * b.im + a.im * b.re);
}
function cdiv(a: Complex, b: Complex): Complex {
  const denom_abs_sq = b.re * b.re + b.im * b.im;
  if (denom_abs_sq === 0) return complex(NaN, NaN);
  return complex(
    (a.re * b.re + a.im * b.im) / denom_abs_sq,
    (a.im * b.re - a.re * b.im) / denom_abs_sq,
  );
}
function cabsSq(a: Complex): number {
  return a.re * a.re + a.im * a.im;
}
function cmulReal(a: Complex, r: number): Complex {
  return complex(a.re * r, a.im * r);
}
function cexp(z: Complex): Complex {
  const expRe = Math.exp(z.re);
  return complex(expRe * Math.cos(z.im), expRe * Math.sin(z.im));
}

const PI = Math.PI;
const NUM_POINTS = 200;
const FP_TOLERANCE = 1e-9;

function interpolateNK(
  targetWavelength: number,
  dispersiveData: DispersiveDataPoint[],
): Complex {
  if (!dispersiveData || dispersiveData.length === 0) {
    return complex(1.0, 0.0);
  }

  const sortedData = dispersiveData; // Assumed sorted from form submission

  if (sortedData.length === 1) {
    return complex(sortedData[0].n, sortedData[0].k);
  }

  if (targetWavelength <= sortedData[0].wavelength) {
    return complex(sortedData[0].n, sortedData[0].k);
  }
  if (targetWavelength >= sortedData[sortedData.length - 1].wavelength) {
    return complex(
      sortedData[sortedData.length - 1].n,
      sortedData[sortedData.length - 1].k,
    );
  }

  let i = 0;
  while (
    i < sortedData.length - 1 &&
    sortedData[i + 1].wavelength < targetWavelength
  ) {
    i++;
  }
  const wl1 = sortedData[i].wavelength;
  const n1 = sortedData[i].n;
  const k1 = sortedData[i].k;
  const wl2 = sortedData[i + 1].wavelength;
  const n2 = sortedData[i + 1].n;
  const k2 = sortedData[i + 1].k;

  if (Math.abs(wl1 - wl2) < FP_TOLERANCE) {
    return complex(n1, k1);
  }

  const factor = (targetWavelength - wl1) / (wl2 - wl1);
  const interpolatedN = n1 + factor * (n2 - n1);
  const interpolatedK = k1 + factor * (k2 - k1);

  return complex(interpolatedN, interpolatedK);
}

type Matrix2x2C = [[Complex, Complex], [Complex, Complex]];
const M_IDENTITY: Matrix2x2C = [
  [C_ONE, C_ZERO],
  [C_ZERO, C_ONE],
];
function mmul2x2c(A: Matrix2x2C, B: Matrix2x2C): Matrix2x2C {
  return [
    [
      cadd(cmul(A[0][0], B[0][0]), cmul(A[0][1], B[1][0])),
      cadd(cmul(A[0][0], B[0][1]), cmul(A[0][1], B[1][1])),
    ],
    [
      cadd(cmul(A[1][0], B[0][0]), cmul(A[1][1], B[1][0])),
      cadd(cmul(A[1][0], B[0][1]), cmul(A[1][1], B[1][1])),
    ],
  ];
}

export function calculateOpticalResponse(params: SolverFormValues): {
  data: OpticalResponsePoint[];
  sweepParameter: SweepParameter;
} {
  const results: OpticalResponsePoint[] = [];
  const sweepParameter = params.sweepType;
  const polarization = params.polarization;

  const materialLibraryMap = new Map<string, LayerMaterialProperties>();
  params.materialLibrary.forEach((mat) =>
    materialLibraryMap.set(mat.id, mat.properties),
  );

  const internal_layer_thicknesses_nm = params.thickness.map((t) =>
    t < 0 ? 0 : t,
  );

  let sweepVariableValues: number[] = [];
  let fixedAngleRad_for_wavelength_sweep: number | undefined = undefined;
  let fixedWavelengthNm_for_angle_sweep: number | undefined = undefined;

  if (params.sweepType === 'wavelength') {
    for (let pointIdx = 0; pointIdx < NUM_POINTS; pointIdx++) {
      let val =
        params.minWavelength +
        (pointIdx * (params.maxWavelength - params.minWavelength)) /
          (NUM_POINTS > 1 ? NUM_POINTS - 1 : 1);
      if (val <= FP_TOLERANCE) val = FP_TOLERANCE;
      sweepVariableValues.push(val);
    }
    fixedAngleRad_for_wavelength_sweep =
      ((params.angleOfIncidence ?? 0) * PI) / 180.0;
  } else {
    for (let pointIdx = 0; pointIdx < NUM_POINTS; pointIdx++) {
      let val =
        params.minAngle +
        (pointIdx * (params.maxAngle - params.minAngle)) /
          (NUM_POINTS > 1 ? NUM_POINTS - 1 : 1);
      sweepVariableValues.push((val * PI) / 180.0);
    }
    fixedWavelengthNm_for_angle_sweep = params.wavelength;
    if (fixedWavelengthNm_for_angle_sweep <= FP_TOLERANCE)
      fixedWavelengthNm_for_angle_sweep = FP_TOLERANCE;
  }

  for (const currentSweepValue of sweepVariableValues) {
    let current_wavelength_nm: number;
    let incident_angle_rad: number;
    let currentXValueForPoint: number;

    if (params.sweepType === 'wavelength') {
      current_wavelength_nm = currentSweepValue;
      incident_angle_rad = fixedAngleRad_for_wavelength_sweep!;
      currentXValueForPoint = current_wavelength_nm;
    } else {
      current_wavelength_nm = fixedWavelengthNm_for_angle_sweep!;
      incident_angle_rad = currentSweepValue;
      currentXValueForPoint = (incident_angle_rad * 180) / PI;
    }

    let calculationSucceeded = true;
    let tir_occurred_this_point = false;

    const incidentMediumProps = materialLibraryMap.get(
      params.incidentMediumMaterialId,
    );
    const substrateMediumProps = materialLibraryMap.get(
      params.substrateMediumMaterialId,
    );

    if (!incidentMediumProps || !substrateMediumProps) {
      results.push({
        xValue: currentXValueForPoint,
        reflectance: 0.0,
        transmittance: 0.0,
        absorptance: 0.0,
      });
      continue; // Should be caught by Zod validation
    }

    let n_incident_medium_complex: Complex;
    if (incidentMediumProps.type === 'constant') {
      n_incident_medium_complex = complex(
        incidentMediumProps.n,
        incidentMediumProps.k,
      );
    } else {
      n_incident_medium_complex = interpolateNK(
        current_wavelength_nm,
        incidentMediumProps.data,
      );
    }

    let n_substrate_medium_complex: Complex;
    if (substrateMediumProps.type === 'constant') {
      n_substrate_medium_complex = complex(
        substrateMediumProps.n,
        substrateMediumProps.k,
      );
    } else {
      n_substrate_medium_complex = interpolateNK(
        current_wavelength_nm,
        substrateMediumProps.data,
      );
    }

    const n_list_complex_full: Complex[] = [n_incident_medium_complex];
    for (let i = 0; i < params.numLayers; i++) {
      const layerSelection = params.layerMaterials[i];
      if (!layerSelection || !layerSelection.materialId) {
        calculationSucceeded = false;
        break;
      }
      const materialProps = materialLibraryMap.get(layerSelection.materialId);
      if (!materialProps) {
        calculationSucceeded = false;
        break;
      }
      if (materialProps.type === 'constant') {
        n_list_complex_full.push(complex(materialProps.n, materialProps.k));
      } else {
        n_list_complex_full.push(
          interpolateNK(current_wavelength_nm, materialProps.data),
        );
      }
    }
    if (!calculationSucceeded) {
      results.push({
        xValue: currentXValueForPoint,
        reflectance: 0.0,
        transmittance: 0.0,
        absorptance: 0.0,
      });
      continue;
    }
    n_list_complex_full.push(n_substrate_medium_complex);

    const d_list_nm_full: number[] = [
      Infinity,
      ...internal_layer_thicknesses_nm,
      Infinity,
    ];

    const angles_rad_real: number[] = [incident_angle_rad];
    if (isNaN(incident_angle_rad)) {
      calculationSucceeded = false;
    }

    if (calculationSucceeded) {
      for (let i = 1; i < n_list_complex_full.length; i++) {
        const n_prev_real = n_list_complex_full[i - 1].re;
        const n_curr_real = n_list_complex_full[i].re;
        let angle_i_rad: number;

        if (isNaN(angles_rad_real[i - 1])) {
          angle_i_rad = NaN;
        } else {
          const sin_theta_prev = Math.sin(angles_rad_real[i - 1]);
          if (Math.abs(n_curr_real) < FP_TOLERANCE) {
            angle_i_rad =
              Math.abs(n_prev_real * sin_theta_prev) < FP_TOLERANCE ? 0 : NaN;
          } else {
            let arg_asin = (n_prev_real / n_curr_real) * sin_theta_prev;
            if (isNaN(arg_asin)) {
              angle_i_rad = NaN;
            } else if (Math.abs(arg_asin) > 1.0 + FP_TOLERANCE) {
              tir_occurred_this_point = true;
              angle_i_rad = NaN;
            } else {
              arg_asin = Math.max(-1.0, Math.min(1.0, arg_asin));
              angle_i_rad = Math.asin(arg_asin);
            }
          }
        }

        if (isNaN(angle_i_rad)) {
          calculationSucceeded = false;
          break;
        }
        angles_rad_real.push(angle_i_rad);
      }
    }

    if (!calculationSucceeded) {
      results.push({
        xValue: currentXValueForPoint,
        reflectance: tir_occurred_this_point ? 1.0 : 0.0,
        transmittance: 0.0,
        absorptance: tir_occurred_this_point ? 0.0 : 0.0,
      });
      continue;
    }

    const r_coeffs_complex: Complex[] = [];
    const t_coeffs_complex: Complex[] = [];

    for (let i = 0; i < n_list_complex_full.length - 1; i++) {
      const n1_complex = n_list_complex_full[i];
      const n2_complex = n_list_complex_full[i + 1];
      const theta1_real = angles_rad_real[i];
      const theta2_real = angles_rad_real[i + 1];

      if (isNaN(theta1_real) || isNaN(theta2_real)) {
        calculationSucceeded = false;
        break;
      }

      const cos_theta1 = Math.cos(theta1_real);
      const cos_theta2 = Math.cos(theta2_real);

      let r_ij: Complex, t_ij: Complex;

      if (polarization === 'TM') {
        const n1_cos_t2 = cmul(n1_complex, complex(cos_theta2));
        const n2_cos_t1 = cmul(n2_complex, complex(cos_theta1));
        const den_rt = cadd(n1_cos_t2, n2_cos_t1);
        if (cabsSq(den_rt) < FP_TOLERANCE * FP_TOLERANCE) {
          calculationSucceeded = false;
          break;
        }
        r_ij = cdiv(csub(n2_cos_t1, n1_cos_t2), den_rt);
        const num_t = cmulReal(cmul(n1_complex, complex(cos_theta1)), 2);
        t_ij = cdiv(num_t, den_rt);
      } else {
        const n1_cos_t1 = cmul(n1_complex, complex(cos_theta1));
        const n2_cos_t2 = cmul(n2_complex, complex(cos_theta2));
        const den_rt = cadd(n1_cos_t1, n2_cos_t2);
        if (cabsSq(den_rt) < FP_TOLERANCE * FP_TOLERANCE) {
          calculationSucceeded = false;
          break;
        }
        r_ij = cdiv(csub(n1_cos_t1, n2_cos_t2), den_rt);
        t_ij = cdiv(cmulReal(n1_cos_t1, 2), den_rt);
      }

      if (
        isNaN(r_ij.re) ||
        isNaN(r_ij.im) ||
        isNaN(t_ij.re) ||
        isNaN(t_ij.im)
      ) {
        calculationSucceeded = false;
        break;
      }
      r_coeffs_complex.push(r_ij);
      t_coeffs_complex.push(t_ij);
    }

    if (!calculationSucceeded) {
      results.push({
        xValue: currentXValueForPoint,
        reflectance: tir_occurred_this_point ? 1.0 : 0.0,
        transmittance: 0.0,
        absorptance: tir_occurred_this_point ? 0.0 : 0.0,
      });
      continue;
    }

    const delta_phases_complex: Complex[] = [C_ZERO];
    for (let i = 1; i < d_list_nm_full.length - 1; i++) {
      const d_nm_layer = d_list_nm_full[i];
      if (d_nm_layer < 0) {
        calculationSucceeded = false;
        break;
      }
      if (Math.abs(d_nm_layer) < FP_TOLERANCE) {
        delta_phases_complex.push(C_ZERO);
        continue;
      }

      const N_layer_complex = n_list_complex_full[i];
      const theta_layer_real = angles_rad_real[i];
      if (isNaN(theta_layer_real)) {
        calculationSucceeded = false;
        break;
      }

      const cos_theta_layer = Math.cos(theta_layer_real);
      const term_N_cos_d = cmulReal(
        cmul(N_layer_complex, complex(cos_theta_layer)),
        d_nm_layer,
      );
      const num = cmulReal(term_N_cos_d, 2 * PI);
      if (Math.abs(current_wavelength_nm) < FP_TOLERANCE) {
        calculationSucceeded = false;
        break;
      }
      const delta_i = cdiv(num, complex(current_wavelength_nm));

      if (isNaN(delta_i.re) || isNaN(delta_i.im)) {
        calculationSucceeded = false;
        break;
      }
      delta_phases_complex.push(delta_i);
    }

    if (!calculationSucceeded) {
      results.push({
        xValue: currentXValueForPoint,
        reflectance: tir_occurred_this_point ? 1.0 : 0.0,
        transmittance: 0.0,
        absorptance: tir_occurred_this_point ? 0.0 : 0.0,
      });
      continue;
    }

    let M_total: Matrix2x2C = [[...M_IDENTITY[0]], [...M_IDENTITY[1]]];

    for (let k_idx = 0; k_idx < r_coeffs_complex.length; k_idx++) {
      const r_i = r_coeffs_complex[k_idx];
      const delta_i_complex =
        k_idx < delta_phases_complex.length
          ? delta_phases_complex[k_idx]
          : C_ZERO;

      if (
        isNaN(r_i.re) ||
        isNaN(r_i.im) ||
        isNaN(delta_i_complex.re) ||
        isNaN(delta_i_complex.im)
      ) {
        calculationSucceeded = false;
        break;
      }

      const exp_neg_i_delta = cexp(cmul(C_I_NEG, delta_i_complex));
      const exp_pos_i_delta = cexp(cmul(C_I, delta_i_complex));

      const P_matrix: Matrix2x2C = [
        [exp_neg_i_delta, cmul(r_i, exp_neg_i_delta)],
        [cmul(r_i, exp_pos_i_delta), exp_pos_i_delta],
      ];
      M_total = mmul2x2c(M_total, P_matrix);
      if (isNaN(M_total[0][0].re) || isNaN(M_total[0][0].im)) {
        calculationSucceeded = false;
        break;
      }
    }

    if (!calculationSucceeded) {
      results.push({
        xValue: currentXValueForPoint,
        reflectance: tir_occurred_this_point ? 1.0 : 0.0,
        transmittance: 0.0,
        absorptance: tir_occurred_this_point ? 0.0 : 0.0,
      });
      continue;
    }

    let t_product_complex = C_ONE;
    t_coeffs_complex.forEach((tc) => {
      if (isNaN(tc.re) || isNaN(tc.im)) {
        calculationSucceeded = false;
      }
      t_product_complex = cmul(t_product_complex, tc);
    });
    if (
      !calculationSucceeded ||
      isNaN(t_product_complex.re) ||
      isNaN(t_product_complex.im)
    ) {
      results.push({
        xValue: currentXValueForPoint,
        reflectance: tir_occurred_this_point ? 1.0 : 0.0,
        transmittance: 0.0,
        absorptance: tir_occurred_this_point ? 0.0 : 0.0,
      });
      continue;
    }

    const M00_abs_sq = cabsSq(M_total[0][0]);
    const M00_is_effectively_zero =
      M00_abs_sq < FP_TOLERANCE * FP_TOLERANCE * FP_TOLERANCE;

    let R_val_calc_raw: number;
    if (
      M00_is_effectively_zero ||
      isNaN(M_total[1][0].re) ||
      isNaN(M_total[0][0].re)
    ) {
      R_val_calc_raw = NaN;
    } else {
      R_val_calc_raw = cabsSq(cdiv(M_total[1][0], M_total[0][0]));
    }

    const n_inc_val_real = n_list_complex_full[0].re;
    const n_sub_val_real =
      n_list_complex_full[n_list_complex_full.length - 1].re;
    const theta_inc_real = angles_rad_real[0];
    const theta_sub_real = angles_rad_real[angles_rad_real.length - 1];

    let power_transfer_ratio_real = NaN;
    const cos_theta_inc_real = isNaN(theta_inc_real)
      ? NaN
      : Math.cos(theta_inc_real);
    const cos_theta_sub_real = isNaN(theta_sub_real)
      ? NaN
      : Math.cos(theta_sub_real);

    if (
      isNaN(cos_theta_inc_real) ||
      isNaN(n_inc_val_real) ||
      Math.abs(n_inc_val_real) < FP_TOLERANCE ||
      cos_theta_inc_real < FP_TOLERANCE
    ) {
      power_transfer_ratio_real = 0.0;
    } else {
      if (
        isNaN(cos_theta_sub_real) ||
        isNaN(n_sub_val_real) ||
        Math.abs(n_sub_val_real) < FP_TOLERANCE ||
        cos_theta_sub_real < FP_TOLERANCE
      ) {
        power_transfer_ratio_real = 0.0;
      } else {
        const n_incident_eff_real = n_inc_val_real * cos_theta_inc_real;
        const n_substrate_eff_real = n_sub_val_real * cos_theta_sub_real;
        if (Math.abs(n_incident_eff_real) < FP_TOLERANCE) {
          power_transfer_ratio_real = 0.0;
        } else {
          power_transfer_ratio_real =
            n_substrate_eff_real / n_incident_eff_real;
        }
      }
    }
    power_transfer_ratio_real =
      isNaN(power_transfer_ratio_real) || power_transfer_ratio_real < 0
        ? 0
        : power_transfer_ratio_real;

    let T_val_calc_raw: number;
    if (
      M00_is_effectively_zero ||
      isNaN(t_product_complex.re) ||
      isNaN(M_total[0][0].re)
    ) {
      T_val_calc_raw = NaN;
    } else {
      T_val_calc_raw =
        power_transfer_ratio_real *
        cabsSq(cdiv(t_product_complex, M_total[0][0]));
    }

    let R_calc: number, T_calc: number, A_calc: number;

    if (tir_occurred_this_point) {
      R_calc = 1.0;
      T_calc = 0.0;
    } else {
      R_calc = isNaN(R_val_calc_raw) ? 0.0 : R_val_calc_raw;
      T_calc = isNaN(T_val_calc_raw) ? 0.0 : T_val_calc_raw;
    }

    R_calc = Math.max(0, Math.min(1, R_calc));
    T_calc = Math.max(0, Math.min(1, T_calc));

    if (R_calc + T_calc > 1.0 + FP_TOLERANCE) {
      if (R_calc >= 1.0 - FP_TOLERANCE) {
        T_calc = 0.0;
        R_calc = 1.0;
      } else {
        T_calc = 1.0 - R_calc;
      }
    }

    A_calc = 1.0 - R_calc - T_calc;
    A_calc = Math.max(0, Math.min(1, A_calc));

    T_calc = 1.0 - R_calc - A_calc;
    T_calc = Math.max(0, Math.min(1, T_calc));

    if (tir_occurred_this_point) {
      R_calc = 1.0;
      T_calc = 0.0;
      A_calc = 0.0;
    }

    results.push({
      xValue: currentXValueForPoint,
      reflectance: R_calc,
      transmittance: T_calc,
      absorptance: A_calc,
    });
  }
  return { data: results, sweepParameter };
}
