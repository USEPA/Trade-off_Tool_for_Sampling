/** @jsxImportSource @emotion/react */

import React, {
  createContext,
  Dispatch,
  ReactNode,
  SetStateAction,
  useContext,
  useEffect,
  useState,
} from 'react';
// contexts
import { LookupFilesContext, useLookupFiles } from 'contexts/LookupFiles';
// utils
import { getEnvironmentStringParam } from 'utils/arcGisRestUtils';
import { fetchCheck, retryCall } from 'utils/fetchUtils';
import { updatePointSymbol, updatePolygonSymbol } from 'utils/sketchUtils';
// types
import {
  AreaByMediaType,
  EditsType,
  LayerAoiAnalysisEditsType,
  ScenarioDeconEditsType,
  ScenarioEditsType,
} from 'types/Edits';
import { LayerType, PortalLayerType, UrlLayerType } from 'types/Layer';
import { ErrorType } from 'types/Misc';
import {
  DefaultSymbolsType,
  UserDefinedAttributes,
  SampleSelectType,
  SelectedSampleType,
  PolygonSymbol,
} from 'config/sampleAttributes';
// config
import { isDecon } from 'config/navigation';

export const hazardousOptions: { label: string; value: string }[] = [
  { label: 'Hazardous', value: 'hazardous' },
  { label: 'Non-Hazardous', value: 'non-hazardous' },
];

type HomeWidgetType = {
  '2d': __esri.Home;
  '3d': __esri.Home;
};

export type SketchViewModelType = {
  '2d': __esri.SketchViewModel;
  '3d': __esri.SketchViewModel;
};

export type AoiGraphics = {
  [planId: string]: __esri.Graphic[];
};

export type AoiDataType = {
  count: number;
  graphics: AoiGraphics | null;
};

export type JsonDownloadType = {
  contaminationScenario: string;
  decontaminationTechnology: string;
  solidWasteVolumeM3: number;
  solidWasteMassKg: number;
  liquidWasteVolumeM3: number;
  liquidWasteMassKg: number;
  decontaminationCost: number;
  decontaminationTimeDays: number;
  averageInitialContamination: number;
  averageFinalContamination: number;
  aboveDetectionLimit: boolean;
  pctAoi?: number;
  surfaceArea?: number;
  volume?: number;
  volumeContents?: number;
  numIterativeApplications: number;
  numTeams: number;
  removeContents?: boolean;
};

export type AoiCharacterizationData = {
  status: 'none' | 'fetching' | 'success' | 'failure';
  planGraphics: PlanGraphics;
  error?: ErrorType;
};

export type PlanGraphics = {
  [planId: string]: {
    graphics: __esri.Graphic[];
    imageGraphics: __esri.Graphic[];
    aoiArea: number;
    buildingFootprint: number;
    summary: {
      areaByMedia: AreaByMediaType[];
      totalAoiSqM: number;
      totalBuildingExtSqM: number;
      totalBuildingIntSqM: number;
      totalBuildingVolumeCubM: number;
      totalBuildingVolumeContentsCubM: number;
      totalBuildingFootprintSqM: number;
      totalBuildingFloorsSqM: number;
      totalBuildingSqM: number;
      totalBuildingExtWallsSqM: number;
      totalBuildingIntWallsSqM: number;
      totalBuildingRoofSqM: number;
      totalBuildingCeilingsSqM: number;
    };
    aoiPercentages: {
      numAois: number;
      asphalt: number;
      asphaltSqM: number;
      concrete: number;
      concreteSqM: number;
      soil: number;
      soilSqM: number;
    };
  };
};

export type GsgFile = {
  esriFileType: 'gsg';
  file: string | null;
  name: string;
  path: string;
};

export type GsgFiles = {
  files: GsgFile[];
  selectedIndex: number | null;
};

type BasemapWidget = {
  '2d': __esri.BasemapGallery;
  '3d': __esri.BasemapGallery;
};

type SketchType = {
  autoZoom: boolean;
  setAutoZoom: Dispatch<SetStateAction<boolean>>;
  basemapWidget: BasemapWidget | null;
  setBasemapWidget: Dispatch<SetStateAction<BasemapWidget | null>>;
  defaultSymbols: DefaultSymbolsType;
  setDefaultSymbols: Dispatch<SetStateAction<DefaultSymbolsType>>;
  setDefaultSymbolSingle: Function;
  resetDefaultSymbols: Function;
  edits: EditsType;
  setEdits: Dispatch<SetStateAction<EditsType>>;

  aoiCharacterizationData: AoiCharacterizationData;
  setAoiCharacterizationData: Dispatch<SetStateAction<AoiCharacterizationData>>;
  defaultDeconSelections: any[];
  setDefaultDeconSelections: Dispatch<SetStateAction<any[]>>;
  deconSelections: any[];
  setDeconSelections: Dispatch<SetStateAction<any[]>>;
  jsonDownload: JsonDownloadType[];
  setJsonDownload: Dispatch<SetStateAction<JsonDownloadType[]>>;

  homeWidget: HomeWidgetType | null;
  setHomeWidget: Dispatch<SetStateAction<HomeWidgetType | null>>;
  symbolsInitialized: boolean;
  setSymbolsInitialized: Dispatch<SetStateAction<boolean>>;
  layersInitialized: boolean;
  setLayersInitialized: Dispatch<SetStateAction<boolean>>;
  layers: LayerType[];
  setLayers: Dispatch<SetStateAction<LayerType[]>>;
  portalLayers: PortalLayerType[];
  setPortalLayers: Dispatch<SetStateAction<PortalLayerType[]>>;
  referenceLayers: any[];
  setReferenceLayers: Dispatch<SetStateAction<any[]>>;
  gsgFiles: GsgFiles;
  setGsgFiles: Dispatch<SetStateAction<GsgFiles>>;
  urlLayers: UrlLayerType[];
  setUrlLayers: Dispatch<SetStateAction<UrlLayerType[]>>;
  sketchLayer: LayerType | null;
  setSketchLayer: Dispatch<SetStateAction<LayerType | null>>;
  aoiSketchLayer: LayerType | null;
  setAoiSketchLayer: Dispatch<SetStateAction<LayerType | null>>;
  deconSketchLayer: LayerAoiAnalysisEditsType | null;
  setDeconSketchLayer: Dispatch<
    SetStateAction<LayerAoiAnalysisEditsType | null>
  >;
  deconOperation: LayerType | null;
  setDeconOperation: Dispatch<SetStateAction<LayerType | null>>;
  stagingAreaLayer: LayerType | null;
  setStagingAreaLayer: Dispatch<SetStateAction<LayerType | null>>;

  map: __esri.Map | null;
  setMap: Dispatch<SetStateAction<__esri.Map | null>>;
  mapView: __esri.MapView | null;
  setMapView: Dispatch<SetStateAction<__esri.MapView | null>>;
  sceneView: __esri.SceneView | null;
  setSceneView: Dispatch<SetStateAction<__esri.SceneView | null>>;
  sceneViewForArea: __esri.SceneView | null;
  setSceneViewForArea: Dispatch<SetStateAction<__esri.SceneView | null>>;
  selectedSampleIds: SelectedSampleType[];
  setSelectedSampleIds: Dispatch<SetStateAction<SelectedSampleType[]>>;
  selectedScenario: ScenarioEditsType | ScenarioDeconEditsType | null;
  setSelectedScenario: Dispatch<
    SetStateAction<ScenarioEditsType | ScenarioDeconEditsType | null>
  >;
  sketchVM: SketchViewModelType | null;
  setSketchVM: Dispatch<SetStateAction<SketchViewModelType | null>>;
  aoiSketchVM: __esri.SketchViewModel | null;
  setAoiSketchVM: Dispatch<SetStateAction<__esri.SketchViewModel | null>>;
  getGpMaxRecordCount: (() => Promise<number>) | null;
  userDefinedOptions: SampleSelectType[];
  setUserDefinedOptions: Dispatch<SetStateAction<SampleSelectType[]>>;
  userDefinedAttributes: UserDefinedAttributes;
  setUserDefinedAttributes: Dispatch<SetStateAction<UserDefinedAttributes>>;
  sampleAttributes: any[];
  setSampleAttributes: Dispatch<SetStateAction<any[]>>;
  sampleAttributesDecon: any[];
  setSampleAttributesDecon: Dispatch<SetStateAction<any[]>>;
  allSampleOptions: SampleSelectType[];
  setAllSampleOptions: Dispatch<SetStateAction<SampleSelectType[]>>;
  displayGeometryType: 'hybrid' | 'points' | 'polygons';
  setDisplayGeometryType: Dispatch<
    SetStateAction<'hybrid' | 'points' | 'polygons'>
  >;
  displayDimensions: '2d' | '3d';
  setDisplayDimensions: Dispatch<SetStateAction<'2d' | '3d'>>;
  terrain3dUseElevation: boolean;
  setTerrain3dUseElevation: Dispatch<SetStateAction<boolean>>;
  terrain3dVisible: boolean;
  setTerrain3dVisible: Dispatch<SetStateAction<boolean>>;
  viewUnderground3d: boolean;
  setViewUnderground3d: Dispatch<SetStateAction<boolean>>;

  resultsOpen: boolean;
  setResultsOpen: Dispatch<SetStateAction<boolean>>;
  efficacyResults: any;
  setEfficacyResults: Dispatch<SetStateAction<any>>;
  governmentLandsLayerVisible: boolean;
  setGovernmentLandsLayerVisible: Dispatch<SetStateAction<boolean>>;
  parcelLayerVisible: boolean;
  setParcelLayerVisible: Dispatch<SetStateAction<boolean>>;
  suitabilityLayerVisible: boolean;
  setSuitabilityLayerVisible: Dispatch<SetStateAction<boolean>>;
};

export const SketchContext = createContext<SketchType>({
  autoZoom: false,
  setAutoZoom: () => {},
  basemapWidget: null,
  setBasemapWidget: () => {},
  defaultSymbols: {
    symbols: {},
    editCount: 0,
  },
  setDefaultSymbols: () => {},
  setDefaultSymbolSingle: () => {},
  resetDefaultSymbols: () => {},
  edits: { count: 0, edits: [] },
  setEdits: () => {},

  aoiCharacterizationData: { status: 'none', planGraphics: {} },
  setAoiCharacterizationData: () => {},
  defaultDeconSelections: [],
  setDefaultDeconSelections: () => {},
  deconSelections: [],
  setDeconSelections: () => {},
  jsonDownload: [],
  setJsonDownload: () => {},

  homeWidget: null,
  setHomeWidget: () => {},
  symbolsInitialized: false,
  setSymbolsInitialized: () => {},
  layersInitialized: false,
  setLayersInitialized: () => {},
  layers: [],
  setLayers: () => {},
  portalLayers: [],
  setPortalLayers: () => {},
  referenceLayers: [],
  setReferenceLayers: () => {},
  gsgFiles: {
    files: [
      {
        esriFileType: 'gsg',
        file: null,
        name: 'Default',
        path: 'defaultGsg.gsg',
      },
    ],
    selectedIndex: 0,
  },
  setGsgFiles: () => {},
  urlLayers: [],
  setUrlLayers: () => {},
  selectedSampleIds: [],
  setSelectedSampleIds: () => {},
  selectedScenario: null,
  setSelectedScenario: () => {},
  sketchLayer: null,
  setSketchLayer: () => {},
  aoiSketchLayer: null,
  setAoiSketchLayer: () => {},
  deconSketchLayer: null,
  setDeconSketchLayer: () => {},
  deconOperation: null,
  setDeconOperation: () => {},
  stagingAreaLayer: null,
  setStagingAreaLayer: () => {},

  map: null,
  setMap: () => {},
  mapView: null,
  setMapView: () => {},
  sceneView: null,
  setSceneView: () => {},
  sceneViewForArea: null,
  setSceneViewForArea: () => {},
  sketchVM: null,
  setSketchVM: () => {},
  aoiSketchVM: null,
  setAoiSketchVM: () => {},
  getGpMaxRecordCount: null,
  userDefinedOptions: [],
  setUserDefinedOptions: () => {},
  userDefinedAttributes: { editCount: 0, sampleTypes: {} },
  setUserDefinedAttributes: () => {},
  sampleAttributes: [],
  setSampleAttributes: () => {},
  sampleAttributesDecon: [],
  setSampleAttributesDecon: () => {},
  allSampleOptions: [],
  setAllSampleOptions: () => {},
  displayGeometryType: 'points',
  setDisplayGeometryType: () => {},
  displayDimensions: '2d',
  setDisplayDimensions: () => {},
  terrain3dUseElevation: true,
  setTerrain3dUseElevation: () => {},
  terrain3dVisible: true,
  setTerrain3dVisible: () => {},
  viewUnderground3d: false,
  setViewUnderground3d: () => {},

  resultsOpen: false,
  setResultsOpen: () => {},
  efficacyResults: null,
  setEfficacyResults: () => {},
  governmentLandsLayerVisible: true,
  setGovernmentLandsLayerVisible: () => {},
  parcelLayerVisible: true,
  setParcelLayerVisible: () => {},
  suitabilityLayerVisible: true,
  setSuitabilityLayerVisible: () => {},
});

type Props = { children: ReactNode };

export function SketchProvider({ children }: Props) {
  const { sampleTypes } = useContext(LookupFilesContext);
  const lookupFiles = useLookupFiles();
  const services = lookupFiles.data.services;

  const defaultSymbol: PolygonSymbol = {
    type: 'simple-fill',
    color: [150, 150, 150, 0.2],
    outline: {
      color: [50, 50, 50],
      width: 2,
    },
  };

  const initialDefaultSymbols = {
    symbols: {
      'Area of Interest': defaultSymbol,
      'Contamination Map': isDecon()
        ? ({
            type: 'simple-fill',
            color: [4, 53, 255, 0.2],
            outline: {
              color: [50, 50, 50],
              width: 2,
            },
          } as PolygonSymbol)
        : defaultSymbol,
      Samples: defaultSymbol,
      'Staging Area Mask': {
        type: 'simple-fill',
        color: [150, 150, 150, 0.2],
        outline: {
          color: [117, 117, 117],
          width: 2,
        },
      } as PolygonSymbol,
    },
    editCount: 0,
  };

  const [autoZoom, setAutoZoom] = useState(false);
  const [
    basemapWidget,
    setBasemapWidget, //
  ] = useState<BasemapWidget | null>(null);
  const [defaultSymbols, setDefaultSymbols] = useState<DefaultSymbolsType>(
    initialDefaultSymbols,
  );
  const [edits, setEdits] = useState<EditsType>({ count: 0, edits: [] });

  const [aoiCharacterizationData, setAoiCharacterizationData] =
    useState<AoiCharacterizationData>({
      status: 'none',
      planGraphics: {},
    });
  const [defaultDeconSelections, setDefaultDeconSelections] = useState<any[]>(
    [],
  );
  const [deconSelections, setDeconSelections] = useState<any[]>([]);
  const [jsonDownload, setJsonDownload] = useState<JsonDownloadType[]>([]);

  const [layersInitialized, setLayersInitialized] = useState(false);
  const [layers, setLayers] = useState<LayerType[]>([]);
  const [portalLayers, setPortalLayers] = useState<PortalLayerType[]>([]);
  const [referenceLayers, setReferenceLayers] = useState<any[]>([]);
  const [gsgFiles, setGsgFiles] = useState<GsgFiles>({
    files: [
      {
        esriFileType: 'gsg',
        file: null,
        name: 'Default',
        path: 'defaultGsg.gsg',
      },
    ],
    selectedIndex: 0,
  });
  const [urlLayers, setUrlLayers] = useState<UrlLayerType[]>([]);
  const [sketchLayer, setSketchLayer] = useState<LayerType | null>(null);
  const [aoiSketchLayer, setAoiSketchLayer] = useState<LayerType | null>(null);
  const [deconSketchLayer, setDeconSketchLayer] =
    useState<LayerAoiAnalysisEditsType | null>(null);
  const [deconOperation, setDeconOperation] = useState<LayerType | null>(null);
  const [stagingAreaLayer, setStagingAreaLayer] = useState<LayerType | null>(
    null,
  );
  const [homeWidget, setHomeWidget] = useState<HomeWidgetType | null>(null);
  const [symbolsInitialized, setSymbolsInitialized] = useState(false);
  const [map, setMap] = useState<__esri.Map | null>(null);
  const [mapView, setMapView] = useState<__esri.MapView | null>(null);
  const [sceneView, setSceneView] = useState<__esri.SceneView | null>(null);
  const [sceneViewForArea, setSceneViewForArea] =
    useState<__esri.SceneView | null>(null);
  const [selectedSampleIds, setSelectedSampleIds] = useState<
    SelectedSampleType[]
  >([]);
  const [
    selectedScenario,
    setSelectedScenario, //
  ] = useState<ScenarioEditsType | ScenarioDeconEditsType | null>(null);
  const [
    sketchVM,
    setSketchVM, //
  ] = useState<SketchViewModelType | null>(null);
  const [
    aoiSketchVM,
    setAoiSketchVM, //
  ] = useState<__esri.SketchViewModel | null>(null);
  const [userDefinedOptions, setUserDefinedOptions] = useState<
    SampleSelectType[]
  >([]);
  const [userDefinedAttributes, setUserDefinedAttributes] =
    useState<UserDefinedAttributes>({ editCount: 0, sampleTypes: {} });
  const [sampleAttributes, setSampleAttributes] = useState<any[]>([]);
  const [sampleAttributesDecon, setSampleAttributesDecon] = useState<any[]>([]);
  const [allSampleOptions, setAllSampleOptions] = useState<SampleSelectType[]>(
    [],
  );
  const [displayGeometryType, setDisplayGeometryType] = useState<
    'hybrid' | 'points' | 'polygons'
  >('points');
  const [displayDimensions, setDisplayDimensions] = useState<'2d' | '3d'>('2d');
  const [terrain3dUseElevation, setTerrain3dUseElevation] = useState(true);
  const [terrain3dVisible, setTerrain3dVisible] = useState(true);
  const [viewUnderground3d, setViewUnderground3d] = useState(false);
  const [resultsOpen, setResultsOpen] = useState(false);
  const [efficacyResults, setEfficacyResults] = useState(null);
  const [governmentLandsLayerVisible, setGovernmentLandsLayerVisible] =
    useState(true);
  const [parcelLayerVisible, setParcelLayerVisible] = useState(true);
  const [suitabilityLayerVisible, setSuitabilityLayerVisible] = useState(true);

  // Update totsLayers variable on the window object. This is a workaround
  // to an issue where the layers state variable is not available within esri
  // event handlers.
  useEffect(() => {
    window.totsLayers = layers;
  }, [layers]);

  // Update totsDefaultSymbols variable on the window object. This is a workaround
  // to an issue where the defaultSymbols state variable is not available within esri
  // event handlers.
  useEffect(() => {
    window.totsDefaultSymbols = defaultSymbols;
  }, [defaultSymbols]);

  // Keep the allSampleOptions array up to date
  useEffect(() => {
    if (!sampleTypes) return;

    let allSampleOptions: SampleSelectType[] = [];

    // Add in the standard sample types. Append "(edited)" to the
    // label if the user made changes to one of the standard types.
    sampleTypes.sampleSelectOptions.forEach((option: any) => {
      allSampleOptions.push({
        value: option.value,
        label: Object.prototype.hasOwnProperty.call(
          userDefinedAttributes.sampleTypes,
          option.value,
        )
          ? `${option.value} (edited)`
          : option.label,
        isPredefined: option.isPredefined,
      });
    });

    // Add on any user defined sample types
    allSampleOptions = allSampleOptions.concat(userDefinedOptions);

    // Update totsAllSampleOptions variable on the window object. This is a workaround
    // to an issue where the allSampleOptions state variable is not available within esri
    // event handlers.
    window.totsAllSampleOptions = allSampleOptions;

    setAllSampleOptions(allSampleOptions);
  }, [userDefinedOptions, userDefinedAttributes, sampleTypes]);

  useEffect(() => {
    if (allSampleOptions.length === 0 || defaultDeconSelections.length > 0)
      return;
    setDefaultDeconSelections([
      {
        id: 1,
        media: 'Soil/Vegetation',
        deconTech: null,
        pctAoi: 0,
        surfaceArea: 0,
        volume: 0,
        volumeContents: 0,
        removeContents: false,
        avgCfu: 0,
        totalCfu: 0,
        numIterativeApplications: 1,
        numTeams: 1,
        pctDeconed: 100,
        isHazardous: hazardousOptions[1],
        avgFinalContamination: null,
        aboveDetectionLimit: '',
      },
      {
        id: 2,
        media: 'Streets - Asphalt',
        deconTech: null,
        pctAoi: 0,
        surfaceArea: 0,
        volume: 0,
        volumeContents: 0,
        removeContents: false,
        avgCfu: 0,
        totalCfu: 0,
        numIterativeApplications: 1,
        numTeams: 1,
        pctDeconed: 100,
        isHazardous: hazardousOptions[1],
        avgFinalContamination: null,
        aboveDetectionLimit: '',
      },
      {
        id: 3,
        media: 'Streets/Sidewalks - Concrete',
        deconTech: null,
        pctAoi: 0,
        surfaceArea: 0,
        volume: 0,
        volumeContents: 0,
        removeContents: false,
        avgCfu: 0,
        totalCfu: 0,
        numIterativeApplications: 1,
        numTeams: 1,
        pctDeconed: 100,
        isHazardous: hazardousOptions[1],
        avgFinalContamination: null,
        aboveDetectionLimit: '',
      },
      {
        id: 4,
        media: 'Building Exteriors',
        deconTech: null,
        pctAoi: 0,
        surfaceArea: 0,
        volume: 0,
        volumeContents: 0,
        removeContents: false,
        avgCfu: 0,
        totalCfu: 0,
        numIterativeApplications: 1,
        numTeams: 1,
        pctDeconed: 100,
        isHazardous: hazardousOptions[1],
        avgFinalContamination: null,
        aboveDetectionLimit: '',
        subRows: [],
      },
      {
        id: 5,
        media: 'Building Interiors',
        deconTech: null,
        pctAoi: 0,
        surfaceArea: 0,
        volume: 0,
        volumeContents: 0,
        removeContents: false,
        avgCfu: 0,
        totalCfu: 0,
        numIterativeApplications: 1,
        numTeams: 1,
        pctDeconed: 100,
        isHazardous: hazardousOptions[1],
        avgFinalContamination: null,
        aboveDetectionLimit: '',
        subRows: [],
      },
    ]);
  }, [allSampleOptions, defaultDeconSelections]);

  // define the context funtion for getting the max record count
  // of the gp server
  const [gpMaxRecordCount, setGpMaxRecordCount] = useState<number | null>(null);
  function getGpMaxRecordCount(): Promise<number> {
    return new Promise<number>((resolve, reject) => {
      // return the max record count, if we already have it
      if (gpMaxRecordCount) {
        resolve(gpMaxRecordCount);
        return;
      }

      let url = '';
      if (services.useProxyForGPServer) url = services.proxyUrl;
      url += `${services.totsGPServer}?f=json${getEnvironmentStringParam()}`;

      // get the max record count from the gp server
      retryCall(() => fetchCheck(url))
        .then((res: any) => {
          const maxRecordCount = res.maximumRecords;
          setGpMaxRecordCount(maxRecordCount);
          resolve(maxRecordCount);
        })
        .catch((err) => {
          window.logErrorToGa(err);
          reject(err);
        });
    });
  }

  // Updates an individual symbol within the defaultSymbols state variable
  function setDefaultSymbolSingle(type: string, symbol: PolygonSymbol) {
    let newDefaultSymbols: DefaultSymbolsType | null = null;
    newDefaultSymbols = {
      editCount: defaultSymbols.editCount + 1,
      symbols: {
        ...defaultSymbols.symbols,
        [type]: symbol,
      },
    };

    setDefaultSymbols(newDefaultSymbols);

    // update all of the symbols
    updatePolygonSymbol(layers, newDefaultSymbols);
    updatePointSymbol(layers, newDefaultSymbols);
  }

  // Reset default symbols back to the default values
  function resetDefaultSymbols() {
    setDefaultSymbols(initialDefaultSymbols);
  }

  useEffect(() => {
    window.totsEditsLayers = edits.edits.map((e) => {
      return {
        id: e.id,
        layerId: e.layerId,
        name: e.name,
        type: e.type,
      };
    });
  }, [edits]);

  useEffect(() => {
    window.totsPortalLayers = portalLayers;
  }, [portalLayers]);

  return (
    <SketchContext.Provider
      value={{
        autoZoom,
        setAutoZoom,
        basemapWidget,
        setBasemapWidget,
        defaultSymbols,
        setDefaultSymbols,
        setDefaultSymbolSingle,
        resetDefaultSymbols,
        edits,
        setEdits,

        aoiCharacterizationData,
        setAoiCharacterizationData,
        defaultDeconSelections,
        setDefaultDeconSelections,
        deconSelections,
        setDeconSelections,
        jsonDownload,
        setJsonDownload,

        homeWidget,
        setHomeWidget,
        symbolsInitialized,
        setSymbolsInitialized,
        layersInitialized,
        setLayersInitialized,
        layers,
        setLayers,
        portalLayers,
        setPortalLayers,
        referenceLayers,
        setReferenceLayers,
        gsgFiles,
        setGsgFiles,
        urlLayers,
        setUrlLayers,
        selectedSampleIds,
        setSelectedSampleIds,
        selectedScenario,
        setSelectedScenario,
        sketchLayer,
        setSketchLayer,
        aoiSketchLayer,
        setAoiSketchLayer,
        deconSketchLayer,
        setDeconSketchLayer,
        deconOperation,
        setDeconOperation,
        stagingAreaLayer,
        setStagingAreaLayer,

        map,
        setMap,
        mapView,
        setMapView,
        sceneView,
        setSceneView,
        sceneViewForArea,
        setSceneViewForArea,
        sketchVM,
        setSketchVM,
        aoiSketchVM,
        setAoiSketchVM,
        getGpMaxRecordCount,
        userDefinedOptions,
        setUserDefinedOptions,
        userDefinedAttributes,
        setUserDefinedAttributes,
        sampleAttributes,
        setSampleAttributes,
        sampleAttributesDecon,
        setSampleAttributesDecon,
        allSampleOptions,
        setAllSampleOptions,
        displayGeometryType,
        setDisplayGeometryType,
        displayDimensions,
        setDisplayDimensions,
        terrain3dUseElevation,
        setTerrain3dUseElevation,
        terrain3dVisible,
        setTerrain3dVisible,
        viewUnderground3d,
        setViewUnderground3d,

        resultsOpen,
        setResultsOpen,
        efficacyResults,
        setEfficacyResults,
        governmentLandsLayerVisible,
        setGovernmentLandsLayerVisible,
        parcelLayerVisible,
        setParcelLayerVisible,
        suitabilityLayerVisible,
        setSuitabilityLayerVisible,
      }}
    >
      {children}
    </SketchContext.Provider>
  );
}
