export type PolygonSymbol = {
  type: 'simple-fill';
  color: number[];
  outline: {
    color: number[];
    width: number;
  };
};

export type Attributes = {
  [key: string]: {
    OBJECTID: string | null;
    PERMANENT_IDENTIFIER: string | null;
    GLOBALID: string | null;
    TYPE: string;
    ShapeType: string;
    Width: number;
    SA: number | null;
    AA: number | null;
    TTPK: number | null;
    TTC: number | null;
    TTA: number | null;
    TTPS: number | null;
    LOD_P: number | null;
    LOD_NON: number | null;
    MCPS: number | null;
    TCPS: number | null;
    WVPS: number | null;
    WWPS: number | null;
    ALC: number | null;
    AMC: number | null;
    Notes: string | null;
    CONTAMTYPE: string | null;
    CONTAMVAL: number | null;
    CONTAMUNIT: string | null;
    CREATEDDATE: string | null;
    UPDATEDDATE: null;
    USERNAME: string | null;
    ORGANIZATION: string | null;
    DECISIONUNITUUID: string | null;
    DECISIONUNIT: string | null;
    DECISIONUNITSORT: number | null;
  };
};

export type UserDefinedAttributes = {
  editCount: number;
  attributes: Attributes;
};

export const sampleAttributes: Attributes = {
  Sponge: {
    OBJECTID: '-1',
    PERMANENT_IDENTIFIER: null,
    GLOBALID: null,
    TYPE: 'Sponge',
    ShapeType: 'point',
    Width: 10,
    SA: 100,
    AA: null,
    TTPK: 0.12,
    TTC: 0.09,
    TTA: 0.7,
    TTPS: 0.99,
    LOD_P: 14,
    LOD_NON: 0,
    MCPS: 46.87,
    TCPS: 343.03,
    WVPS: 0.1,
    WWPS: 4.3,
    ALC: 118,
    AMC: 239,
    Notes: '',
    CONTAMTYPE: null,
    CONTAMVAL: null,
    CONTAMUNIT: null,
    CREATEDDATE: null,
    UPDATEDDATE: null,
    USERNAME: null,
    ORGANIZATION: null,
    DECISIONUNITUUID: null,
    DECISIONUNIT: null,
    DECISIONUNITSORT: null,
  },
  'Micro Vac': {
    OBJECTID: '-1',
    PERMANENT_IDENTIFIER: null,
    GLOBALID: null,
    TYPE: 'Micro Vac',
    ShapeType: 'point',
    Width: 12.2794,
    SA: 144,
    AA: null,
    TTPK: 0.18,
    TTC: 0.15,
    TTA: 0.8,
    TTPS: 1.21,
    LOD_P: 105,
    LOD_NON: 0,
    MCPS: 34.28,
    TCPS: 395.84,
    WVPS: 0.02,
    WWPS: 4.3,
    ALC: 151,
    AMC: 288,
    Notes: '',
    CONTAMTYPE: null,
    CONTAMVAL: null,
    CONTAMUNIT: null,
    CREATEDDATE: null,
    UPDATEDDATE: null,
    USERNAME: null,
    ORGANIZATION: null,
    DECISIONUNITUUID: null,
    DECISIONUNIT: null,
    DECISIONUNITSORT: null,
  },
  'Wet Vac': {
    OBJECTID: '-1',
    PERMANENT_IDENTIFIER: null,
    GLOBALID: null,
    TYPE: 'Wet Vac',
    ShapeType: 'polygon',
    Width: 169.9664,
    SA: 28800,
    AA: null,
    TTPK: 0.33,
    TTC: 0.13,
    TTA: 0.8,
    TTPS: 1.07,
    LOD_P: 105,
    LOD_NON: 40,
    MCPS: 167,
    TCPS: 220,
    WVPS: 5,
    WWPS: 28.5,
    ALC: 151,
    AMC: 200,
    Notes: '',
    CONTAMTYPE: null,
    CONTAMVAL: null,
    CONTAMUNIT: null,
    CREATEDDATE: null,
    UPDATEDDATE: null,
    USERNAME: null,
    ORGANIZATION: null,
    DECISIONUNITUUID: null,
    DECISIONUNIT: null,
    DECISIONUNITSORT: null,
  },
  Robot: {
    OBJECTID: '-1',
    PERMANENT_IDENTIFIER: null,
    GLOBALID: null,
    TYPE: 'Robot',
    ShapeType: 'polygon',
    Width: 379.80360065,
    SA: 144000,
    AA: null,
    TTPK: 0.33,
    TTC: 0.3,
    TTA: 0.7,
    TTPS: 1.12,
    LOD_P: 105,
    LOD_NON: 140,
    MCPS: 400,
    TCPS: 267,
    WVPS: 0.5,
    WWPS: 10.5,
    ALC: 200,
    AMC: 288,
    Notes: '',
    CONTAMTYPE: null,
    CONTAMVAL: null,
    CONTAMUNIT: null,
    CREATEDDATE: null,
    UPDATEDDATE: null,
    USERNAME: null,
    ORGANIZATION: null,
    DECISIONUNITUUID: null,
    DECISIONUNIT: null,
    DECISIONUNITSORT: null,
  },
  'Aggressive Air': {
    OBJECTID: '-1',
    PERMANENT_IDENTIFIER: null,
    GLOBALID: null,
    TYPE: 'Aggressive Air',
    ShapeType: 'polygon',
    Width: 109.7886,
    SA: 12000,
    AA: null,
    TTPK: 0.33,
    TTC: 0.6,
    TTA: 0.5,
    TTPS: 1.12,
    LOD_P: 105,
    LOD_NON: 140,
    MCPS: 207,
    TCPS: 267,
    WVPS: 0.1,
    WWPS: 5,
    ALC: 118,
    AMC: 239,
    Notes: '',
    CONTAMTYPE: null,
    CONTAMVAL: null,
    CONTAMUNIT: null,
    CREATEDDATE: null,
    UPDATEDDATE: null,
    USERNAME: null,
    ORGANIZATION: null,
    DECISIONUNITUUID: null,
    DECISIONUNIT: null,
    DECISIONUNITSORT: null,
  },
  Swab: {
    OBJECTID: '-1',
    PERMANENT_IDENTIFIER: null,
    GLOBALID: null,
    TYPE: 'Swab',
    ShapeType: 'point',
    Width: 2,
    SA: 4,
    AA: null,
    TTPK: 0.12,
    TTC: 0.07,
    TTA: 0.7,
    TTPS: 0.89,
    LOD_P: 25,
    LOD_NON: 0,
    MCPS: 21,
    TCPS: 219,
    WVPS: 0.01,
    WWPS: 2,
    ALC: 118,
    AMC: 239,
    Notes: '',
    CONTAMTYPE: null,
    CONTAMVAL: null,
    CONTAMUNIT: null,
    CREATEDDATE: null,
    UPDATEDDATE: null,
    USERNAME: null,
    ORGANIZATION: null,
    DECISIONUNITUUID: null,
    DECISIONUNIT: null,
    DECISIONUNITSORT: null,
  },
};

export type SampleSelectType = {
  value: string;
  label: string;
  isPredefined: boolean;
};

export const SampleSelectOptions: SampleSelectType[] = Object.values(
  sampleAttributes,
).map((item) => {
  const value = item.TYPE;
  return { value, label: value, isPredefined: true };
});
