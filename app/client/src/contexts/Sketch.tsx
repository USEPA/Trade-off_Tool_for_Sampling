/** @jsxImportSource @emotion/react */

import React, { ReactNode } from 'react';
// contexts
import {
  useSampleTypesContext,
  useServicesContext,
} from 'contexts/LookupFiles';
// utils
import { fetchCheck } from 'utils/fetchUtils';
import { updatePolygonSymbol } from 'utils/sketchUtils';
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
  setAutoZoom: React.Dispatch<React.SetStateAction<boolean>>;
  basemapWidget: __esri.BasemapGallery | null;
  setBasemapWidget: React.Dispatch<
    React.SetStateAction<__esri.BasemapGallery | null>
  >;
  defaultSymbols: DefaultSymbolsType;
  setDefaultSymbols: React.Dispatch<React.SetStateAction<DefaultSymbolsType>>;
  setDefaultSymbolSingle: Function;
  edits: EditsType;
  setEdits: React.Dispatch<React.SetStateAction<EditsType>>;
  homeWidget: __esri.Home | null;
  setHomeWidget: React.Dispatch<React.SetStateAction<__esri.Home | null>>;
  symbolsInitialized: boolean;
  setSymbolsInitialized: React.Dispatch<React.SetStateAction<boolean>>;
  layersInitialized: boolean;
  setLayersInitialized: React.Dispatch<React.SetStateAction<boolean>>;
  layers: LayerType[];
  setLayers: React.Dispatch<React.SetStateAction<LayerType[]>>;
  portalLayers: PortalLayerType[];
  setPortalLayers: React.Dispatch<React.SetStateAction<PortalLayerType[]>>;
  referenceLayers: any[];
  setReferenceLayers: React.Dispatch<React.SetStateAction<any[]>>;
  urlLayers: UrlLayerType[];
  setUrlLayers: React.Dispatch<React.SetStateAction<UrlLayerType[]>>;
  sketchLayer: LayerType | null;
  setSketchLayer: React.Dispatch<React.SetStateAction<LayerType | null>>;
  aoiSketchLayer: LayerType | null;
  setAoiSketchLayer: React.Dispatch<React.SetStateAction<LayerType | null>>;
  map: __esri.Map | null;
  setMap: React.Dispatch<React.SetStateAction<__esri.Map | null>>;
  mapView: __esri.MapView | null;
  setMapView: React.Dispatch<React.SetStateAction<__esri.MapView | null>>;
  selectedSampleIds: SelectedSampleType[];
  setSelectedSampleIds: React.Dispatch<
    React.SetStateAction<SelectedSampleType[]>
  >;
  selectedScenario: ScenarioEditsType | null;
  setSelectedScenario: React.Dispatch<
    React.SetStateAction<ScenarioEditsType | null>
  >;
  sketchVM: __esri.SketchViewModel | null;
  setSketchVM: React.Dispatch<
    React.SetStateAction<__esri.SketchViewModel | null>
  >;
  aoiSketchVM: __esri.SketchViewModel | null;
  setAoiSketchVM: React.Dispatch<
    React.SetStateAction<__esri.SketchViewModel | null>
  >;
  getGpMaxRecordCount: (() => Promise<number>) | null;
  userDefinedOptions: SampleSelectType[];
  setUserDefinedOptions: React.Dispatch<
    React.SetStateAction<SampleSelectType[]>
  >;
  userDefinedAttributes: UserDefinedAttributes;
  setUserDefinedAttributes: React.Dispatch<
    React.SetStateAction<UserDefinedAttributes>
  >;
  sampleAttributes: any[];
  setSampleAttributes: React.Dispatch<React.SetStateAction<any[]>>;
  allSampleOptions: SampleSelectType[];
  setAllSampleOptions: React.Dispatch<React.SetStateAction<SampleSelectType[]>>;
};

export const SketchContext = React.createContext<SketchType>({
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

  const [autoZoom, setAutoZoom] = React.useState(false);
  const [
    basemapWidget,
    setBasemapWidget, //
  ] = React.useState<__esri.BasemapGallery | null>(null);
  const [
    defaultSymbols,
    setDefaultSymbols,
  ] = React.useState<DefaultSymbolsType>({
    symbols: {
      'Area of Interest': defaultSymbol,
      'Contamination Map': defaultSymbol,
      Samples: defaultSymbol,
    },
    editCount: 0,
  });
  const [edits, setEdits] = React.useState<EditsType>({ count: 0, edits: [] });
  const [layersInitialized, setLayersInitialized] = React.useState(false);
  const [layers, setLayers] = React.useState<LayerType[]>([]);
  const [portalLayers, setPortalLayers] = React.useState<PortalLayerType[]>([]);
  const [referenceLayers, setReferenceLayers] = React.useState<any[]>([]);
  const [urlLayers, setUrlLayers] = React.useState<UrlLayerType[]>([]);
  const [sketchLayer, setSketchLayer] = React.useState<LayerType | null>(null);
  const [aoiSketchLayer, setAoiSketchLayer] = React.useState<LayerType | null>(
    null,
  );
  const [homeWidget, setHomeWidget] = React.useState<__esri.Home | null>(null);
  const [symbolsInitialized, setSymbolsInitialized] = React.useState(false);
  const [map, setMap] = React.useState<__esri.Map | null>(null);
  const [mapView, setMapView] = React.useState<__esri.MapView | null>(null);
  const [selectedSampleIds, setSelectedSampleIds] = React.useState<
    SelectedSampleType[]
  >([]);
  const [
    selectedScenario,
    setSelectedScenario, //
  ] = React.useState<ScenarioEditsType | null>(null);
  const [
    sketchVM,
    setSketchVM, //
  ] = React.useState<__esri.SketchViewModel | null>(null);
  const [
    aoiSketchVM,
    setAoiSketchVM, //
  ] = React.useState<__esri.SketchViewModel | null>(null);
  const [userDefinedOptions, setUserDefinedOptions] = React.useState<
    SampleSelectType[]
  >([]);
  const [
    userDefinedAttributes,
    setUserDefinedAttributes,
  ] = React.useState<UserDefinedAttributes>({ editCount: 0, sampleTypes: {} });
  const [sampleAttributes, setSampleAttributes] = React.useState<any[]>([]);
  const [allSampleOptions, setAllSampleOptions] = React.useState<
    SampleSelectType[]
  >([]);

  // Update totsSampleAttributes variable on the window object. This is a workaround
  // to an issue where the sampleAttributes state variable is not available within esri
  // event handlers.
  React.useEffect(() => {
    (window as any).totsSampleAttributes = sampleAttributes;
  }, [sampleAttributes]);

  // Update totsLayers variable on the window object. This is a workaround
  // to an issue where the layers state variable is not available within esri
  // event handlers.
  React.useEffect(() => {
    (window as any).totsLayers = layers;
  }, [layers]);

  // Update totsDefaultSymbols variable on the window object. This is a workaround
  // to an issue where the defaultSymbols state variable is not available within esri
  // event handlers.
  React.useEffect(() => {
    (window as any).totsDefaultSymbols = defaultSymbols;
  }, [defaultSymbols]);

  // Keep the allSampleOptions array up to date
  React.useEffect(() => {
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
  const [gpMaxRecordCount, setGpMaxRecordCount] = React.useState<number | null>(
    null,
  );
  function getGpMaxRecordCount(): Promise<number> {
    return new Promise<number>((resolve, reject) => {
      if (services.status !== 'success')
        reject('Services config file has not been loaded');

      // return the max record count, if we already have it
      if (gpMaxRecordCount) {
        resolve(gpMaxRecordCount);
        return;
      }

      // get the max record count from the gp server
      fetchCheck(
        `${services.data.totsGPServer}?f=json`,
      )
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
      }}
    >
      {children}
    </SketchContext.Provider>
  );
}
