type Attributes = {
  [key: string]: {
    OBJECTID: string | null;
    PERMANENT_IDENTIFIER: string | null;
    GLOBALID: string | null;
    TYPE: string;
    IsPoint: boolean;
    Width: number;
    SA: string | null;
    AA: string | null;
    OAA: string | null; // TODO: Delete this before release - original AA for debug
    TTPK: string | null;
    TTC: string | null;
    TTA: string | null;
    TTPS: string | null;
    LOD_P: string | null;
    LOD_NON: string | null;
    MCPS: string | null;
    TCPS: string | null;
    WVPS: string | null;
    WWPS: string | null;
    ALC: string | null;
    AMC: string | null;
    Notes: string | null;
    CONTAMTYPE: string | null;
    CONTAMVAL: string | null;
    CONTAMUNIT: string | null;
    CREATEDDATE: string | null;
    UPDATEDDATE: null;
    USERNAME: string | null;
    ORGANIZATION: string | null;
    ELEVATIONSERIES: string | null;
  };
};

const sampleAttributes: Attributes = {
  Sponge: {
    OBJECTID: '-1',
    PERMANENT_IDENTIFIER: null,
    GLOBALID: null,
    TYPE: 'Sponge',
    IsPoint: true,
    Width: 10,
    SA: '100',
    AA: '',
    OAA: '', // TODO: Delete this before release - original AA for debug
    TTPK: '0.12',
    TTC: '0.09',
    TTA: '0.7',
    TTPS: '0.99',
    LOD_P: '14',
    LOD_NON: '0',
    MCPS: '46.87',
    TCPS: '343.03',
    WVPS: '0.1',
    WWPS: '4.3',
    ALC: '118',
    AMC: '239',
    Notes: '',
    CONTAMTYPE: null,
    CONTAMVAL: null,
    CONTAMUNIT: null,
    CREATEDDATE: null,
    UPDATEDDATE: null,
    USERNAME: null,
    ORGANIZATION: null,
    ELEVATIONSERIES: null,
  },
  'Micro Vac': {
    OBJECTID: '-1',
    PERMANENT_IDENTIFIER: null,
    GLOBALID: null,
    TYPE: 'Micro Vac',
    IsPoint: true,
    Width: 12.2794,
    SA: '144',
    AA: '',
    OAA: '', // TODO: Delete this before release - original AA for debug
    TTPK: '0.18',
    TTC: '0.15',
    TTA: '0.8',
    TTPS: '1.21',
    LOD_P: '105',
    LOD_NON: '0',
    MCPS: '34.28',
    TCPS: '395.84',
    WVPS: '0.02',
    WWPS: '4.3',
    ALC: '151',
    AMC: '288',
    Notes: '',
    CONTAMTYPE: null,
    CONTAMVAL: null,
    CONTAMUNIT: null,
    CREATEDDATE: null,
    UPDATEDDATE: null,
    USERNAME: null,
    ORGANIZATION: null,
    ELEVATIONSERIES: null,
  },
  'Wet Vac': {
    OBJECTID: '-1',
    PERMANENT_IDENTIFIER: null,
    GLOBALID: null,
    TYPE: 'Wet Vac',
    IsPoint: false,
    Width: 169.9664,
    SA: '28800',
    AA: '',
    OAA: '', // TODO: Delete this before release - original AA for debug
    TTPK: '0.33',
    TTC: '0.13',
    TTA: '0.8',
    TTPS: '1.07',
    LOD_P: '105',
    LOD_NON: '40',
    MCPS: '167',
    TCPS: '220',
    WVPS: '5',
    WWPS: '28.5',
    ALC: '151',
    AMC: '200',
    Notes: '',
    CONTAMTYPE: null,
    CONTAMVAL: null,
    CONTAMUNIT: null,
    CREATEDDATE: null,
    UPDATEDDATE: null,
    USERNAME: null,
    ORGANIZATION: null,
    ELEVATIONSERIES: null,
  },
  Robot: {
    OBJECTID: '-1',
    PERMANENT_IDENTIFIER: null,
    GLOBALID: null,
    TYPE: 'Robot',
    IsPoint: false,
    Width: 379.80360065,
    SA: '144000',
    AA: '',
    OAA: '', // TODO: Delete this before release - original AA for debug
    TTPK: '0.33',
    TTC: '0.3',
    TTA: '0.7',
    TTPS: '1.12',
    LOD_P: '105',
    LOD_NON: '140',
    MCPS: '400',
    TCPS: '267',
    WVPS: '0.5',
    WWPS: '10.5',
    ALC: '200',
    AMC: '288',
    Notes: '',
    CONTAMTYPE: null,
    CONTAMVAL: null,
    CONTAMUNIT: null,
    CREATEDDATE: null,
    UPDATEDDATE: null,
    USERNAME: null,
    ORGANIZATION: null,
    ELEVATIONSERIES: null,
  },
  'Aggressive Air': {
    OBJECTID: '-1',
    PERMANENT_IDENTIFIER: null,
    GLOBALID: null,
    TYPE: 'Aggressive Air',
    IsPoint: false,
    Width: 109.7886,
    SA: '12000',
    AA: '',
    OAA: '', // TODO: Delete this before release - original AA for debug
    TTPK: '0.33',
    TTC: '0.6',
    TTA: '0.5',
    TTPS: '1.12',
    LOD_P: '105',
    LOD_NON: '140',
    MCPS: '207',
    TCPS: '267',
    WVPS: '0.1',
    WWPS: '5',
    ALC: '118',
    AMC: '239',
    Notes: '',
    CONTAMTYPE: null,
    CONTAMVAL: null,
    CONTAMUNIT: null,
    CREATEDDATE: null,
    UPDATEDDATE: null,
    USERNAME: null,
    ORGANIZATION: null,
    ELEVATIONSERIES: null,
  },
  Swab: {
    OBJECTID: '-1',
    PERMANENT_IDENTIFIER: null,
    GLOBALID: null,
    TYPE: 'Swab',
    IsPoint: true,
    Width: 2,
    SA: '4',
    AA: '',
    OAA: '', // TODO: Delete this before release - original AA for debug
    TTPK: '0.12',
    TTC: '0.07',
    TTA: '0.7',
    TTPS: '0.89',
    LOD_P: '25',
    LOD_NON: '0',
    MCPS: '21',
    TCPS: '219',
    WVPS: '0.01',
    WWPS: '2',
    ALC: '118',
    AMC: '239',
    Notes: '',
    CONTAMTYPE: null,
    CONTAMVAL: null,
    CONTAMUNIT: null,
    CREATEDDATE: null,
    UPDATEDDATE: null,
    USERNAME: null,
    ORGANIZATION: null,
    ELEVATIONSERIES: null,
  },
};

export type SampleSelectType = {
  value: string;
  label: string;
};

export const SampleSelectOptions: SampleSelectType[] = Object.values(
  sampleAttributes,
).map((item) => {
  const value = item.TYPE;
  return { value, label: value };
});

export { sampleAttributes };
