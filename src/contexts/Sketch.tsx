/** @jsx jsx */

import React, { ReactNode } from 'react';
import { jsx } from '@emotion/core';
// utils
import { fetchCheck } from 'utils/fetchUtils';
// config
import { totsGPServer } from 'config/webService';
// types
import { EditsType } from 'types/Edits';
import { LayerType, PortalLayerType, UrlLayerType } from 'types/Layer';

type SketchType = {
  basemapWidget: __esri.BasemapGallery | null;
  setBasemapWidget: React.Dispatch<
    React.SetStateAction<__esri.BasemapGallery | null>
  >;
  edits: EditsType;
  setEdits: React.Dispatch<React.SetStateAction<EditsType>>;
  homeWidget: __esri.Home | null;
  setHomeWidget: React.Dispatch<React.SetStateAction<__esri.Home | null>>;
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
  sketchVM: __esri.SketchViewModel | null;
  setSketchVM: React.Dispatch<
    React.SetStateAction<__esri.SketchViewModel | null>
  >;
  aoiSketchVM: __esri.SketchViewModel | null;
  setAoiSketchVM: React.Dispatch<
    React.SetStateAction<__esri.SketchViewModel | null>
  >;
  getGpMaxRecordCount: (() => Promise<number>) | null;
};

export const SketchContext = React.createContext<SketchType>({
  basemapWidget: null,
  setBasemapWidget: () => {},
  edits: { count: 0, edits: [] },
  setEdits: () => {},
  homeWidget: null,
  setHomeWidget: () => {},
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
});

type Props = { children: ReactNode };

export function SketchProvider({ children }: Props) {
  const [
    basemapWidget,
    setBasemapWidget, //
  ] = React.useState<__esri.BasemapGallery | null>(null);
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
  const [map, setMap] = React.useState<__esri.Map | null>(null);
  const [mapView, setMapView] = React.useState<__esri.MapView | null>(null);
  const [
    sketchVM,
    setSketchVM, //
  ] = React.useState<__esri.SketchViewModel | null>(null);
  const [
    aoiSketchVM,
    setAoiSketchVM, //
  ] = React.useState<__esri.SketchViewModel | null>(null);

  // define the context funtion for getting the max record count
  // of the gp server
  const [gpMaxRecordCount, setGpMaxRecordCount] = React.useState<number | null>(
    null,
  );
  function getGpMaxRecordCount(): Promise<number> {
    return new Promise<number>((resolve, reject) => {
      // return the max record count, if we already have it
      if (gpMaxRecordCount) {
        resolve(gpMaxRecordCount);
        return;
      }

      // get the max record count from the gp server
      fetchCheck(`${totsGPServer}?f=json`, true)
        .then((res: any) => {
          const maxRecordCount = res.maximumRecords;
          setGpMaxRecordCount(maxRecordCount);
          resolve(maxRecordCount);
        })
        .catch((err) => reject(err));
    });
  }

  return (
    <SketchContext.Provider
      value={{
        basemapWidget,
        setBasemapWidget,
        edits,
        setEdits,
        homeWidget,
        setHomeWidget,
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
      }}
    >
      {children}
    </SketchContext.Provider>
  );
}
