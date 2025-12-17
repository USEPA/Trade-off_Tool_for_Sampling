import {
  AttributeItems,
  DeconAttributeItems,
  SampleSelectType,
} from 'config/sampleAttributes';
import React, { createContext, ReactNode, useContext } from 'react';
// utils
import { fetchCheck } from 'utils/fetchUtils';
// types
import { LayerProps } from 'types/Misc';
// config
import { isDecon } from 'config/navigation';

type State = {
  lookupFiles: LookupFiles;
  setLookupFiles: Function;
  sampleAttributes: SampleAttributes;
  setSampleAttributes: Function;
  sampleTypes: SampleTypes | null;
  setSampleTypes: Function;
};

const LookupFilesContext = createContext<State>({
  lookupFiles: { status: 'idle', data: {} },
  setLookupFiles: () => {},
  sampleAttributes: { status: 'idle', data: {} },
  setSampleAttributes: () => {},
  sampleTypes: null,
  setSampleTypes: () => {},
});

type Props = {
  children: ReactNode;
};

function LookupFilesProvider({ children }: Props) {
  const [lookupFiles, setLookupFiles] = React.useState<LookupFiles>({
    status: 'idle',
    data: {},
  });
  const [sampleAttributes, setSampleAttributes] =
    React.useState<SampleAttributes>({
      status: 'idle',
      data: {},
    });
  const [sampleTypes, setSampleTypes] = React.useState<SampleTypes | null>(
    null,
  );

  return (
    <LookupFilesContext.Provider
      value={{
        lookupFiles,
        setLookupFiles,
        sampleAttributes,
        setSampleAttributes,
        sampleTypes,
        setSampleTypes,
      }}
    >
      {children}
    </LookupFilesContext.Provider>
  );
}

// Custom hook for loading lookup files
let lookupFilesInitialized = false; // global var for ensuring fetch only happens once
function useLookupFiles() {
  const { lookupFiles, setLookupFiles, setSampleTypes } =
    useContext(LookupFilesContext);

  if (!lookupFilesInitialized) {
    lookupFilesInitialized = true;

    const parseBoolean = (value: string) => {
      if (value === undefined || value === null) return value;
      return ['1', 'true', 't'].includes(value.toLowerCase()) ? true : false;
    };
    const parseNumeric = (value: string) => {
      if (value === undefined || value === null) return value;
      return parseFloat(value);
    };

    const getData = async () => {
      const { VITE_SERVER_URL } = import.meta.env;
      const baseUrl = VITE_SERVER_URL || window.location.origin;
      try {
        const data = (await fetchCheck(
          `${baseUrl}/api/lookupFiles`,
        )) as ContentLookupFiles;

        let sampleAttributes: any = {};

        // get building factors
        const buildingFactors: DeconBuildingFactorsType = {};
        data.deconBuildingClassFactors.forEach((record) => {
          const primOcc = record.PRIM_OCC;
          buildingFactors[primOcc] = {
            PRIM_OCC: primOcc.includes('Unclassified')
              ? 'Unclassified'
              : primOcc,
            OCC_CLS: record.OCC_CLS,
            SOC: record.SOC,
            Brick: parseNumeric(record.Brick),
            Concrete: parseNumeric(record.Concrete),
            Steel: parseNumeric(record.Steel),
            Wood: parseNumeric(record.Wood),
            Other: parseNumeric(record.Other),
          };
        });
        data.technologyTypes.deconBuildingFactors = buildingFactors;

        const deconAttributes: any = {};
        data.deconTechFactors.forEach((record) => {
          const MATERIAL_SPECIFIC_PARAMS: any = {};
          data.deconMaterialFactors.forEach((f) => {
            if (f.DECON_TECH_UUID === record.DECON_TECH_UUID) {
              MATERIAL_SPECIFIC_PARAMS[f.MATERIAL] = {
                ...f,
                CONTAM_REMOVAL_FACTOR: parseNumeric(f.CONTAM_REMOVAL_FACTOR),
                LOG_REDUCTION: parseNumeric(f.LOG_REDUCTION),
              };
            }
          });

          const SURFACE_SPECIFIC_PARAMS: any = {};
          data.deconBuildingFactors.forEach((f) => {
            if (f.DECON_TECH_UUID === record.DECON_TECH_UUID) {
              SURFACE_SPECIFIC_PARAMS[
                f.SURFACE.replace('Soil', 'Soil/Vegetation')
              ] = {
                ...f,
                CONTAM_REMOVAL_FACTOR: parseNumeric(f.CONTAM_REMOVAL_FACTOR),
                LOG_REDUCTION: parseNumeric(f.LOG_REDUCTION),
                AQUEOUS_WASTE_MASS: parseNumeric(f.AQUEOUS_WASTE_MASS),
                AQUEOUS_WASTE_VOLUME: parseNumeric(f.AQUEOUS_WASTE_VOLUME),
                SOLID_WASTE_MASS: parseNumeric(f.SOLID_WASTE_MASS),
                SOLID_WASTE_VOLUME: parseNumeric(f.SOLID_WASTE_VOLUME),
              };
            }
          });

          deconAttributes[record.DECON_TECH_UUID] = {
            ...record,
            APPLICATION_TIME: parseNumeric(record.APPLICATION_TIME),
            TYPEUUID: record.DECON_TECH_UUID,
            TYPE: record.DECON_TECH,
            FIXED_COSTS: parseNumeric(record.FIXED_COSTS),
            SIZE_BASED_COSTS: parseNumeric(record.SIZE_BASED_COSTS),
            SIZE_BASED_RATE_GALLONSPERSQFT: parseNumeric(
              record.SIZE_BASED_RATE_GALLONSPERSQFT,
            ),
            SIZE_BASED_RATE_M3PERM2: parseNumeric(
              record.SIZE_BASED_RATE_M3PERM2,
            ),
            OBJECTID: '-1',
            PERMANENT_IDENTIFIER: null,
            GLOBALID: null,
            Notes: '',
            CREATEDDATE: null,
            UPDATEDDATE: null,
            USERNAME: null,
            MATERIAL_SPECIFIC_PARAMS,
            SURFACE_SPECIFIC_PARAMS,
          };
        });

        data.technologyTypes.deconAttributes = deconAttributes;

        const deconWasteFactors: any = {};
        data.deconWasteFactors.forEach((record) => {
          deconWasteFactors[record.FACTOR_UUID] = {
            ...record,
            VALUE: parseNumeric(record.VALUE),
          };
        });
        data.technologyTypes.deconWasteFactors = deconWasteFactors;

        if (isDecon()) {
          sampleAttributes = data.technologyTypes.deconAttributes;
        } else {
          data.sampleMetadata.forEach((record) => {
            sampleAttributes[record.TYPE] = {
              ...record,
              AA: null,
              ALC: parseNumeric(record.ALC),
              AMC: parseNumeric(record.AMC),
              CONTAMTYPE: null,
              CONTAMUNIT: null,
              CONTAMVAL: null,
              CREATEDDATE: null,
              DECISIONUNIT: null,
              DECISIONUNITSORT: 0,
              DECISIONUNITUUID: null,
              ENABLED: parseBoolean(record.ENABLED),
              GLOBALID: null,
              INNOVATIVE: parseBoolean(record.INNOVATIVE),
              LOD_NON: parseNumeric(record.LOD_NON),
              LOD_P: parseNumeric(record.LOD_P),
              MCPS: parseNumeric(record.MCPS),
              Notes: '',
              OBJECTID: -1,
              ORGANIZATION: null,
              PERMANENT_IDENTIFIER: null,
              POINT_STYLE: record.Point_Style,
              SA: parseNumeric(record.SA),
              ShapeType: record.ShapeType.toLowerCase(),
              TCPS: parseNumeric(record.TCPS),
              TTA: parseNumeric(record.TTA),
              TTC: parseNumeric(record.TTC),
              TTPK: parseNumeric(record.TTPK),
              TTPS: parseNumeric(record.TTPS),
              TYPEUUID: record.TYPE,
              UPDATEDDATE: null,
              USERNAME: null,
              WVPS: parseNumeric(record.WVPS),
              WWPS: parseNumeric(record.WWPS),
            };
            delete sampleAttributes[record.TYPE].Point_Style;
          });

          data.technologyTypes.sampleAttributes = sampleAttributes;
        }

        const sampleSelectOptions: SampleSelectType[] = [];
        Object.keys(sampleAttributes).forEach((key) => {
          if (!isDecon() && !sampleAttributes[key].ENABLED) return;
          const value = sampleAttributes[key].TYPEUUID;
          const label = sampleAttributes[key].TYPE;
          const isInnovative = sampleAttributes[key].INNOVATIVE;
          sampleSelectOptions.push({
            value,
            label,
            isInnovative,
            isPredefined: true,
          });
        });
        const newValue = { ...(data.technologyTypes as SampleTypes) };
        newValue['sampleSelectOptions'] = sampleSelectOptions;
        setSampleTypes(newValue);

        setLookupFiles({
          status: 'success',
          data: {
            ...data,
            deconBuildingClassFactors: undefined,
            deconBuildingFactors: undefined,
            deconMaterialFactors: undefined,
            deconTechFactors: undefined,
            deconWasteFactors: undefined,
          },
        });
      } catch (err) {
        console.error(err);
        window.logErrorToGa(err);
        setLookupFiles({ status: 'failure', data: {} });
      }
    };

    getData();
  }

  return lookupFiles;
}

export { LookupFilesContext, LookupFilesProvider, useLookupFiles };

/*
 * TYPES
 */

type AttributesType = { [key: string]: AttributeItems | DeconAttributeItems };

type ContentLookupFiles = {
  deconBuildingClassFactors: DeconBuildingFactorType[];
  deconBuildingFactors: {
    AQUEOUS_WASTE_MASS: string;
    AQUEOUS_WASTE_VOLUME: string;
    CONTAM_REMOVAL_FACTOR: string;
    DECON_TECH_UUID: string;
    id: number;
    LOG_REDUCTION: string;
    SOLID_WASTE_MASS: string;
    SOLID_WASTE_VOLUME: string;
    SURFACE: string;
  }[];
  deconMaterialFactors: {
    CONTAM_REMOVAL_FACTOR: string;
    DECON_TECH_UUID: string;
    DESTRUCTIVENESS: string;
    id: number;
    LOG_REDUCTION: string;
    MATERIAL: string;
  }[];
  deconTechFactors: {
    APPLICATION_MAX_AREA: number;
    APPLICATION_METHOD: 'Surface' | 'Volumetric';
    APPLICATION_TIME: string;
    BREAKDOWN_TIME: number;
    DECON_TECH: string;
    DECON_TECH_UUID: string;
    FIXED_COSTS: string;
    id: number;
    RESIDENCE_TIME: number;
    SETUP_TIME: number;
    SIZE_BASED_COSTS: string;
    SIZE_BASED_COSTS_UNITS: string;
    SIZE_BASED_RATE_GALLONSPERSQFT: string;
    SIZE_BASED_RATE_M3PERM2: string;
  }[];
  deconWasteFactors: {
    FACTOR: string | null;
    FACTOR_UUID: string;
    id: number;
    SOURCE: string | null;
    UNIT: string | null;
    VALUE: string;
  }[];
  defaultGsg: string;
  layerProps: LayerProps;
  notifications: {
    backgroundColor: string;
    color: string;
    message: string;
  };
  services: {
    governmentLands: string;
    gpServerInputMaxRecordCount: number;
    parcel: string;
    proxyUrl: string;
    structures: string;
    suitability: string;
    totsGPServer: string;
    totsTestGPServer: string;
    useProxyForGPServer: boolean;
    radarDatasets: {
      sampleMetadata: string;
    };
    googleAnalyticsMapping: {
      name: string;
      urlLookup: string;
      wildcardUrl: string;
    };
  };
  sampleMetadata: RadarSampleMetadata[];
  technologyTypes: SampleTypesS3;
};

type Content = {
  defaultGsg: string;
  layerProps: LayerProps;
  notifications: {
    backgroundColor: string;
    color: string;
    message: string;
  };
  services: {
    governmentLands: string;
    gpServerInputMaxRecordCount: number;
    parcel: string;
    proxyUrl: string;
    structures: string;
    suitability: string;
    totsGPServer: string;
    totsTestGPServer: string;
    useProxyForGPServer: boolean;
    todsUserGuideVisible: boolean;
    radarDatasets: {
      sampleMetadata: string;
    };
    googleAnalyticsMapping: {
      name: string;
      urlLookup: string;
      wildcardUrl: string;
    };
  };
  sampleMetadata: RadarSampleMetadata[];
  technologyTypes: SampleTypesS3;
};

type LookupFiles =
  | { status: 'idle'; data: Record<string, never> }
  | { status: 'pending'; data: Record<string, never> }
  | { status: 'success'; data: Content }
  | { status: 'failure'; data: Record<string, never> };

type RadarSampleMetadata = {
  ALC: string;
  AMC: string;
  ENABLED: string;
  INNOVATIVE: string;
  LOD_NON: string;
  LOD_P: string;
  MCPS: string;
  Point_Style: string;
  SA: string;
  ShapeType: string;
  TCPS: string;
  TTA: string;
  TTC: string;
  TTPK: string;
  TTPS: string;
  TYPE: string;
  WVPS: string;
  WWPS: string;
  id: number;
};

type SampleAttributes =
  | { status: 'idle'; data: Record<string, never> }
  | { status: 'pending'; data: Record<string, never> }
  | { status: 'success'; data: AttributesType }
  | { status: 'failure'; data: Record<string, never> };

export type SampleTypes = SampleTypesS3 & {
  sampleSelectOptions: SampleSelectType[];
};

export type DeconBuildingFactorType = {
  id: number;
  PRIM_OCC: string;
  OCC_CLS: string;
  SOC: string;
  Brick: string;
  Concrete: string;
  Steel: string;
  Wood: string;
  Other: string;
};

export type DeconBuildingFactorsType = {
  [key: string]: {
    PRIM_OCC: string;
    OCC_CLS: string;
    SOC: string;
    Brick: number;
    Concrete: number;
    Steel: number;
    Wood: number;
    Other: number;
  };
};

export type DeconWastFactorType = {
  FACTOR: string | null;
  FACTOR_UUID: string;
  id: number;
  SOURCE: string | null;
  UNIT: string | null;
  VALUE: number;
};

export type SampleTypesS3 = {
  areaTolerance: number;
  attributesToCheck: string[];
  deconAttributes: { [key: string]: DeconAttributeItems };
  deconBuildingFactors: DeconBuildingFactorsType;
  deconWasteFactors: { [key: string]: DeconWastFactorType };
  limitOfDetection: number;
  sampleAttributes: AttributesType;
  todsSampleRenderer: any;
};
