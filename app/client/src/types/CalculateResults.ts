import { JsonDownloadType } from 'contexts/Sketch';
import { ErrorType } from 'types/Misc';

export type CalculateResultsDataType = {
  NUM_USER_SAMPLES: number;
  NUM_SAMPLES: number;
  TOTAL_COST: number;
  TOTAL_TIME: number;
  LIMITING_TIME_FACTOR: 'Sampling' | 'Analysis' | '';
  TOTAL_SAMPLED_AREA: number;
  PCT_AREA_SAMPLED: number | null;
  TOTAL_SAMPLING_TIME: number;
  SAMPLING_HOURS: number;
  NUM_SAMPLING_HOURS: number;
  TTPK: number;
  TTC: number;
  SAMPLING_MATERIAL_COST: number;
  SAMPLING_LABOR_COST: number;
  TOTAL_SAMPLING_COST: number;
  SAMPLING_TIME: number;
  TOTAL_SAMPLING_LABOR_COST: number;
  LAB_ANALYSIS_TIME: number;
  TTA: number;
  ALC: number;
  AMC: number;
  TOTAL_LAB_COST: number;
  WASTE_VOLUME_SOLID: number;
  WASTE_VOLUME_SOLID_LITERS: number;
  WASTE_WEIGHT_SOLID: number;
  WASTE_WEIGHT_SOLID_POUNDS: number;
  'User Specified Total AOI': number | null;
  'User Specified Number of Available Teams for Sampling': number;
  'User Specified Personnel per Sampling Team': number;
  'User Specified Sampling Team Hours per Shift': number;
  'User Specified Sampling Team Shifts per Day': number;
  'User Specified Surface Area': number;
  'User Specified Sampling Team Labor Cost': number;
  'User Specified Number of Available Labs for Analysis': number;
  'User Specified Analysis Lab Hours per Day': number;
};

export type CalculateResultsDeconDataType = {
  TOTAL_COST: number;
  TOTAL_TIME: number;
  'Solid Waste Volume': number;
  'Liquid Waste Volume': number;
  'Solid Waste Mass': number;
  'Liquid Waste Mass': number;
  WASTE_VOLUME_TOTAL: number;
  WASTE_WEIGHT_TOTAL: number;
  'Contamination Type': string;
  resultsTable: JsonDownloadType[];
};

export type CalculateResultsType = {
  status:
    | 'none'
    | 'no-graphics'
    | 'no-layer'
    | 'no-scenario'
    | 'fetching'
    | 'success'
    | 'failure';
  panelOpen: boolean;
  data: CalculateResultsDataType | null;
};

export type CalculateResultsDeconType = {
  status:
    | 'none'
    | 'no-contamination-graphics'
    | 'no-graphics'
    | 'no-layer'
    | 'no-map'
    | 'no-scenario'
    | 'fetching'
    | 'success'
    | 'failure';
  panelOpen: boolean;
  data: CalculateResultsDeconDataType | null;
  error?: ErrorType;
};
