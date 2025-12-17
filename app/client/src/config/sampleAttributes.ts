export type PolygonSymbol = {
  type: 'simple-fill';
  color: number[];
  outline: {
    color: number[];
    width: number;
  };
};

export type DefaultSymbolsType = {
  symbols: { [key: string]: PolygonSymbol };
  editCount: number;
};

export type SelectedSampleType = {
  PERMANENT_IDENTIFIER: string;
  DECISIONUNITUUID: string;
  selection_method: 'row-click' | 'sample-click';
  graphic: __esri.Graphic;
};

export type AttributeItems = {
  OBJECTID: number | string | null;
  PERMANENT_IDENTIFIER: string | null;
  GLOBALID: string | null;
  TYPEUUID: string;
  TYPE: string;
  ShapeType: string;
  POINT_STYLE: string;
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
  DECISIONUNITSORT: number;
};

export type DeconAttributeItems = {
  id: number;
  OBJECTID: number | string | null;
  PERMANENT_IDENTIFIER: string | null;
  GLOBALID: string | null;
  TYPEUUID: string;
  TYPE: string;
  DECON_TECH_UUID: string;
  DECON_TECH: string;
  APPLICATION_MAX_AREA: number | null;
  APPLICATION_METHOD: 'Surface' | 'Volumetric';
  SETUP_TIME: number | null;
  BREAKDOWN_TIME: number | null;
  APPLICATION_TIME: number | null;
  RESIDENCE_TIME: number | null;
  FIXED_COSTS: number | null;
  SIZE_BASED_COSTS: number | null;
  SIZE_BASED_COSTS_UNITS: string | null;
  SIZE_BASED_RATE_GALLONSPERSQFT: number | null;
  SIZE_BASED_RATE_M3PERM2: number | null;
  Notes: string | null;
  CREATEDDATE: string | null;
  UPDATEDDATE: null;
  USERNAME: string | null;
  MATERIAL_SPECIFIC_PARAMS: {
    [key: string]: {
      CONTAM_REMOVAL_FACTOR: number | null;
      DECON_TECH_UUID: string | null;
      DESTRUCTIVENESS: 'Low' | 'Moderate' | 'High' | 'Uncertain';
      id: number;
      LOG_REDUCTION: number | null;
      MATERIAL: string | null;
    };
  };
  SURFACE_SPECIFIC_PARAMS: {
    [key: string]: {
      AQUEOUS_WASTE_MASS: number | null;
      AQUEOUS_WASTE_VOLUME: number | null;
      CONTAM_REMOVAL_FACTOR: number | null;
      DECON_TECH_UUID: string | null;
      id: number;
      LOG_REDUCTION: number | null;
      SOLID_WASTE_MASS: number | null;
      SOLID_WASTE_VOLUME: number | null;
      SURFACE: string | null;
    };
  };
};

export type Attributes = {
  [key: string]: {
    status: 'add' | 'edit' | 'delete' | 'published' | 'published-ago';
    serviceId: string;
    attributes: AttributeItems;
  };
};

export type UserDefinedConfig = {
  [key: string]: {
    attributes: AttributeItems;
    symbol: PolygonSymbol;
  };
};

export type UserDefinedAttributes = {
  editCount: number;
  sampleTypes: Attributes;
};

export type SampleIssues = {
  areaOutOfTolerance: boolean;
  attributeMismatch: boolean;
  attributesWithMismatch: string[];
  difference: number;
  graphic: __esri.Graphic | null;
};

export type SampleIssuesOutput = {
  areaOutOfTolerance: boolean;
  attributeMismatch: boolean;
  samplesWithIssues: SampleIssues[];
};

export type SampleSelectType = {
  value: string;
  label: string;
  isInnovative?: boolean;
  isPredefined: boolean;
};
