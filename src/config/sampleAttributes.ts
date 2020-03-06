export const freeFormTypes = ['Wet Vac', 'Robot', 'Aggressive Air'];

export const predefinedBoxTypes = ['Sponge', 'Micro Vac', 'Swab'];

export type SampleType =
  | 'Sponge'
  | 'Micro Vac'
  | 'Wet Vac'
  | 'Robot'
  | 'Aggressive Air'
  | 'Swab';

export type SimpleSelectType = {
  value: string;
  label: string;
};

export const SampleSelectOptions: SimpleSelectType[] = [
  { value: 'Sponge', label: 'Sponge' },
  { value: 'Micro Vac', label: 'Micro Vac' },
  { value: 'Wet Vac', label: 'Wet Vac' },
  { value: 'Robot', label: 'Robot' },
  { value: 'Aggressive Air', label: 'Aggressive Air' },
  { value: 'Swab', label: 'Swab' },
];

type SampleProperties =
  | 'OBJECTID'
  | 'GLOBALID'
  | 'TYPE'
  | 'SA'
  | 'TTPK'
  | 'TTC'
  | 'TTA'
  | 'TTPS'
  | 'LOD_P'
  | 'LOD_NON'
  | 'MCPS'
  | 'TCPS'
  | 'WVPS'
  | 'WWPS'
  | 'ALC'
  | 'AMC'
  | 'NOTES'
  | 'AA'
  | 'AC'
  | 'ITER'
  | 'CFU';

type Attributes = {
  [key in SampleType]: {
    [key in SampleProperties]: string | null;
  };
};

const sampleAttributes: Attributes = {
  Sponge: {
    OBJECTID: '-1',
    GLOBALID: null,
    TYPE: 'Sponge',
    SA: '100',
    TTPK: '0.12',
    TTC: '0.09',
    TTA: '0.7',
    TTPS: '0.99',
    LOD_P: '14',
    LOD_NON: '0',
    MCPS: '46.87',
    TCPS: '343.03',
    WVPS: '0',
    WWPS: '4.3',
    ALC: '118',
    AMC: '239',
    NOTES: '239',
    AA: '0',
    AC: '0',
    ITER: '0',
    CFU: null,
  },
  'Micro Vac': {
    OBJECTID: '-1',
    GLOBALID: null,
    TYPE: 'Micro Vac',
    SA: '144',
    TTPK: '0.18',
    TTC: '0.15',
    TTA: '0.8',
    TTPS: '1.21',
    LOD_P: '105',
    LOD_NON: '0',
    MCPS: '34.28',
    TCPS: '395.84',
    WVPS: '0',
    WWPS: '4.3',
    ALC: '151',
    AMC: '288',
    NOTES: '',
    AA: '0',
    AC: '0',
    ITER: '0',
    CFU: null,
  },
  'Wet Vac': {
    OBJECTID: '-1',
    GLOBALID: null,
    TYPE: 'Wet Vac',
    SA: '28800',
    TTPK: '0.33',
    TTC: '0.13',
    TTA: '0.5',
    TTPS: '1.07',
    LOD_P: '105',
    LOD_NON: '40',
    MCPS: '167',
    TCPS: '220',
    WVPS: '5',
    WWPS: '28.5',
    ALC: '151',
    AMC: '200',
    NOTES: '',
    AA: '0',
    AC: '0',
    ITER: '0',
    CFU: null,
  },
  Robot: {
    OBJECTID: '-1',
    GLOBALID: null,
    TYPE: 'Robot',
    SA: '144000',
    TTPK: '0.17',
    TTC: '0.6',
    TTA: '0.5',
    TTPS: '1.12',
    LOD_P: '105',
    LOD_NON: '140',
    MCPS: '207',
    TCPS: '267',
    WVPS: '0.5',
    WWPS: '10.5',
    ALC: '200',
    AMC: '288',
    NOTES: '',
    AA: '0',
    AC: '0',
    ITER: '0',
    CFU: null,
  },
  'Aggressive Air': {
    OBJECTID: '-1',
    GLOBALID: null,
    TYPE: 'Aggressive Air',
    SA: '12000',
    TTPK: '0.17',
    TTC: '0.6',
    TTA: '0.5',
    TTPS: '1.12',
    LOD_P: '105',
    LOD_NON: '140',
    MCPS: '207',
    TCPS: '267',
    WVPS: '0.5',
    WWPS: '10.5',
    ALC: '118',
    AMC: '239',
    NOTES: '',
    AA: '0',
    AC: '0',
    ITER: '0',
    CFU: null,
  },
  Swab: {
    OBJECTID: '-1',
    GLOBALID: null,
    TYPE: 'Swab',
    SA: '4',
    TTPK: '0.12',
    TTC: '0.07',
    TTA: '0.7',
    TTPS: '0.89',
    LOD_P: '25',
    LOD_NON: '0',
    MCPS: '21',
    TCPS: '219',
    WVPS: '0',
    WWPS: '0',
    ALC: '118',
    AMC: '239',
    NOTES: '',
    AA: '0',
    AC: '0',
    ITER: '0',
    CFU: null,
  },
};

export { sampleAttributes };
