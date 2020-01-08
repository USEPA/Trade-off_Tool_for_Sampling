export type SampleType =
  | 'Sponge'
  | 'Micro Vac'
  | 'Wet Vac'
  | 'Robot'
  | 'Aggressive Air'
  | 'Swab';

type SampleProperties =
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
  | 'WWPS';

type Attributes = {
  [key in SampleType]: {
    [key in SampleProperties]: string;
  };
};

const sampleAttributes: Attributes = {
  Sponge: {
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
  },
  'Micro Vac': {
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
  },
  'Wet Vac': {
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
  },
  Robot: {
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
  },
  'Aggressive Air': {
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
  },
  Swab: {
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
  },
};

export { sampleAttributes };
