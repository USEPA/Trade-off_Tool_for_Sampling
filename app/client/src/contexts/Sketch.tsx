/** @jsxImportSource @emotion/react */

import React, {
  createContext,
  Dispatch,
  ReactNode,
  SetStateAction,
  useEffect,
  useState,
} from 'react';
// contexts
import {
  useSampleTypesContext,
  useServicesContext,
} from 'contexts/LookupFiles';
// utils
import { getEnvironmentStringParam } from 'utils/arcGisRestUtils';
import { fetchCheck } from 'utils/fetchUtils';
import { updatePointSymbol, updatePolygonSymbol } from 'utils/sketchUtils';
// types
import { EditsType, ScenarioEditsType } from 'types/Edits';
import { LayerType, PortalLayerType, UrlLayerType } from 'types/Layer';
import {
  DefaultSymbolsType,
  UserDefinedAttributes,
  SampleSelectType,
  SelectedSampleType,
  PolygonSymbol,
} from 'config/sampleAttributes';

type SketchType = {
  autoZoom: boolean;
  setAutoZoom: Dispatch<SetStateAction<boolean>>;
  basemapWidget: __esri.BasemapGallery | null;
  setBasemapWidget: Dispatch<SetStateAction<__esri.BasemapGallery | null>>;
  defaultSymbols: DefaultSymbolsType;
  setDefaultSymbols: Dispatch<SetStateAction<DefaultSymbolsType>>;
  setDefaultSymbolSingle: Function;
  resetDefaultSymbols: Function;
  edits: EditsType;
  setEdits: Dispatch<SetStateAction<EditsType>>;
  homeWidget: __esri.Home | null;
  setHomeWidget: Dispatch<SetStateAction<__esri.Home | null>>;
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
  urlLayers: UrlLayerType[];
  setUrlLayers: Dispatch<SetStateAction<UrlLayerType[]>>;
  sketchLayer: LayerType | null;
  setSketchLayer: Dispatch<SetStateAction<LayerType | null>>;
  aoiSketchLayer: LayerType | null;
  setAoiSketchLayer: Dispatch<SetStateAction<LayerType | null>>;
  map: __esri.Map | null;
  setMap: Dispatch<SetStateAction<__esri.Map | null>>;
  mapView: __esri.MapView | null;
  setMapView: Dispatch<SetStateAction<__esri.MapView | null>>;
  sceneView: __esri.SceneView | null;
  setSceneView: Dispatch<SetStateAction<__esri.SceneView | null>>;
  selectedSampleIds: SelectedSampleType[];
  setSelectedSampleIds: Dispatch<SetStateAction<SelectedSampleType[]>>;
  selectedScenario: ScenarioEditsType | null;
  setSelectedScenario: Dispatch<SetStateAction<ScenarioEditsType | null>>;
  sketchVM: __esri.SketchViewModel | null;
  setSketchVM: Dispatch<SetStateAction<__esri.SketchViewModel | null>>;
  aoiSketchVM: __esri.SketchViewModel | null;
  setAoiSketchVM: Dispatch<SetStateAction<__esri.SketchViewModel | null>>;
  getGpMaxRecordCount: (() => Promise<number>) | null;
  userDefinedOptions: SampleSelectType[];
  setUserDefinedOptions: Dispatch<SetStateAction<SampleSelectType[]>>;
  userDefinedAttributes: UserDefinedAttributes;
  setUserDefinedAttributes: Dispatch<SetStateAction<UserDefinedAttributes>>;
  sampleAttributes: any[];
  setSampleAttributes: Dispatch<SetStateAction<any[]>>;
  allSampleOptions: SampleSelectType[];
  setAllSampleOptions: Dispatch<SetStateAction<SampleSelectType[]>>;
  showAsPoints: boolean;
  setShowAsPoints: Dispatch<SetStateAction<boolean>>;
  showAs2d: boolean;
  setShowAs2d: Dispatch<SetStateAction<boolean>>;
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
  map: null,
  setMap: () => {},
  mapView: null,
  setMapView: () => {},
  sceneView: null,
  setSceneView: () => {},
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
  allSampleOptions: [],
  setAllSampleOptions: () => {},
  showAsPoints: false,
  setShowAsPoints: () => {},
  showAs2d: true,
  setShowAs2d: () => {},
});

type Props = { children: ReactNode };

export function SketchProvider({ children }: Props) {
  const sampleTypeContext = useSampleTypesContext();
  const services = useServicesContext();

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
      'Contamination Map': defaultSymbol,
      Samples: defaultSymbol,
    },
    editCount: 0,
  };

  const [autoZoom, setAutoZoom] = useState(false);
  const [
    basemapWidget,
    setBasemapWidget, //
  ] = useState<__esri.BasemapGallery | null>(null);
  const [defaultSymbols, setDefaultSymbols] = useState<DefaultSymbolsType>(
    initialDefaultSymbols,
  );
  const [edits, setEdits] = useState<EditsType>({ count: 0, edits: [] });
  const [layersInitialized, setLayersInitialized] = useState(false);
  const [layers, setLayers] = useState<LayerType[]>([]);
  const [portalLayers, setPortalLayers] = useState<PortalLayerType[]>([]);
  const [referenceLayers, setReferenceLayers] = useState<any[]>([]);
  const [urlLayers, setUrlLayers] = useState<UrlLayerType[]>([]);
  const [sketchLayer, setSketchLayer] = useState<LayerType | null>(null);
  const [aoiSketchLayer, setAoiSketchLayer] = useState<LayerType | null>(null);
  const [homeWidget, setHomeWidget] = useState<__esri.Home | null>(null);
  const [symbolsInitialized, setSymbolsInitialized] = useState(false);
  const [map, setMap] = useState<__esri.Map | null>(null);
  const [mapView, setMapView] = useState<__esri.MapView | null>(null);
  const [sceneView, setSceneView] = useState<__esri.SceneView | null>(null);
  const [selectedSampleIds, setSelectedSampleIds] = useState<
    SelectedSampleType[]
  >([]);
  const [
    selectedScenario,
    setSelectedScenario, //
  ] = useState<ScenarioEditsType | null>(null);
  const [
    sketchVM,
    setSketchVM, //
  ] = useState<__esri.SketchViewModel | null>(null);
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
  const [allSampleOptions, setAllSampleOptions] = useState<SampleSelectType[]>(
    [],
  );
  const [showAsPoints, setShowAsPoints] = useState<boolean>(true);
  const [showAs2d, setShowAs2d] = useState<boolean>(true);

  // Update totsLayers variable on the window object. This is a workaround
  // to an issue where the layers state variable is not available within esri
  // event handlers.
  useEffect(() => {
    (window as any).totsLayers = layers;
  }, [layers]);

  // Update totsDefaultSymbols variable on the window object. This is a workaround
  // to an issue where the defaultSymbols state variable is not available within esri
  // event handlers.
  useEffect(() => {
    (window as any).totsDefaultSymbols = defaultSymbols;
  }, [defaultSymbols]);

  // Keep the allSampleOptions array up to date
  useEffect(() => {
    if (sampleTypeContext.status !== 'success') return;

    let allSampleOptions: SampleSelectType[] = [];

    // Add in the standard sample types. Append "(edited)" to the
    // label if the user made changes to one of the standard types.
    sampleTypeContext.data.sampleSelectOptions.forEach((option: any) => {
      allSampleOptions.push({
        value: option.value,
        label: userDefinedAttributes.sampleTypes.hasOwnProperty(option.value)
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
    (window as any).totsAllSampleOptions = allSampleOptions;

    setAllSampleOptions(allSampleOptions);
  }, [userDefinedOptions, userDefinedAttributes, sampleTypeContext]);

  // define the context funtion for getting the max record count
  // of the gp server
  const [gpMaxRecordCount, setGpMaxRecordCount] = useState<number | null>(null);
  function getGpMaxRecordCount(): Promise<number> {
    return new Promise<number>((resolve, reject) => {
      if (services.status !== 'success')
        reject('Services config file has not been loaded');

      // return the max record count, if we already have it
      if (gpMaxRecordCount) {
        resolve(gpMaxRecordCount);
        return;
      }

      let url = '';
      if (services.data.useProxyForGPServer) url = services.data.proxyUrl;
      url += `${
        services.data.totsGPServer
      }?f=json${getEnvironmentStringParam()}`;

      // get the max record count from the gp server
      fetchCheck(url)
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
        map,
        setMap,
        mapView,
        setMapView,
        sceneView,
        setSceneView,
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
        allSampleOptions,
        setAllSampleOptions,
        showAsPoints,
        setShowAsPoints,
        showAs2d,
        setShowAs2d,
      }}
    >
      {children}
    </SketchContext.Provider>
  );
}
