export type CalculateResultsDataType = {
  'Total Number of User-Defined Samples': number;
  'Total Number of Samples': number;
  'Total Cost': number;
  'Total Time': number;
  'Limiting Time Factor': 'Sampling' | 'Analysis' | '';
  'Total Sampled Area': number;
  'User Specified Total AOI': number | null;
  'Percent of Area Sampled': number | null;
  'User Specified Number of Available Teams for Sampling': number;
  'User Specified Personnel per Sampling Team': number;
  'User Specified Sampling Team Hours per Shift': number;
  'User Specified Sampling Team Shifts per Day': number;
  'User Specified Surface Area': number;
  'Total Required Sampling Time': number;
  'Sampling Hours per Day': number;
  'Sampling Personnel hours per Day': number;
  'User Specified Sampling Team Labor Cost': number;
  'Time to Prepare Kits': number;
  'Time to Collect': number;
  'Material Cost': number;
  'Sampling Personnel Labor Cost': number;
  'Time to Complete Sampling': number;
  'Total Sampling Labor Cost': number;
  'User Specified Number of Available Labs for Analysis': number;
  'User Specified Analysis Lab Hours per Day': number;
  'Time to Complete Analyses': number;
  'Time to Analyze': number;
  'Analysis Labor Cost': number;
  'Analysis Material Cost': number;
  'Waste Volume': number;
  'Waste Weight': number;
};

export type CalculateResultsType = {
  status:
    | 'none'
    | 'no-graphics'
    | 'no-layer'
    | 'fetching'
    | 'success'
    | 'failure';
  panelOpen: boolean;
  data: CalculateResultsDataType | null;
};
