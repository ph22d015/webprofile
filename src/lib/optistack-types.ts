export type SweepParameter = 'wavelength' | 'angle';
export interface DispersiveDataPoint {
  wavelength: number;
  n: number;
  k: number;
}
export type LayerMaterialProperties =
  | { type: 'constant'; n: number; k: number }
  | { type: 'dispersive'; data: DispersiveDataPoint[] };
export interface SolverFormValues {
  sweepType: SweepParameter;
  polarization: 'TE' | 'TM';
  incidentMediumMaterialId: string;
  substrateMediumMaterialId: string;
  materialLibrary: { id: string; properties: LayerMaterialProperties }[];
  thickness: number[];
  layerMaterials: { materialId: string }[];
  minWavelength: number;
  maxWavelength: number;
  angleOfIncidence: number;
  wavelength: number;
  minAngle: number;
  maxAngle: number;
}
export interface OpticalResponsePoint {
  xValue: number;
  reflectance: number;
  transmittance: number;
  absorptance: number;
}
