/** @jsx jsx */

import React, { ReactNode } from 'react';
import { jsx } from '@emotion/core';
// types
import { EditsType } from 'types/Edits';
import { LayerType, UrlLayerType } from 'types/Layer';

type SketchType = {
  basemapWidget: __esri.BasemapGallery | null;
  setBasemapWidget: React.Dispatch<
    React.SetStateAction<__esri.BasemapGallery | null>
  >;
  edits: EditsType;
  setEdits: React.Dispatch<React.SetStateAction<EditsType>>;
  featureService: any;
  setFeatureService: React.Dispatch<React.SetStateAction<any>>;
  featureServiceUrl: string;
  setFeatureServiceUrl: React.Dispatch<React.SetStateAction<string>>;
  homeWidget: __esri.Home | null;
  setHomeWidget: React.Dispatch<React.SetStateAction<__esri.Home | null>>;
  layersInitialized: boolean;
  setLayersInitialized: React.Dispatch<React.SetStateAction<boolean>>;
  layers: LayerType[];
  setLayers: React.Dispatch<React.SetStateAction<LayerType[]>>;
  portalLayers: string[];
  setPortalLayers: React.Dispatch<React.SetStateAction<string[]>>;
  referenceLayers: any[];
  setReferenceLayers: React.Dispatch<React.SetStateAction<any[]>>;
  urlLayers: UrlLayerType[];
  setUrlLayers: React.Dispatch<React.SetStateAction<UrlLayerType[]>>;
  sketchLayer: LayerType | null;
  setSketchLayer: React.Dispatch<React.SetStateAction<LayerType | null>>;
  aoiSketchLayer: LayerType | null;
  setAoiSketchLayer: React.Dispatch<React.SetStateAction<LayerType | null>>;
  lastSketchLayer: any | null;
  setLastSketchLayer: React.Dispatch<React.SetStateAction<LayerType | null>>;
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
  sketchVMLayerId: string;
  setSketchVMLayerId: React.Dispatch<React.SetStateAction<string>>;
};

export const SketchContext = React.createContext<SketchType>({
  basemapWidget: null,
  setBasemapWidget: () => {},
  edits: { count: 0, edits: [] },
  setEdits: () => {},
  featureService: null,
  setFeatureService: () => {},
  featureServiceUrl: '',
  setFeatureServiceUrl: () => {},
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
  lastSketchLayer: null,
  setLastSketchLayer: () => {},
  map: null,
  setMap: () => {},
  mapView: null,
  setMapView: () => {},
  sketchVM: null,
  setSketchVM: () => {},
  aoiSketchVM: null,
  setAoiSketchVM: () => {},
  sketchVMLayerId: '',
  setSketchVMLayerId: () => {},
});

type Props = { children: ReactNode };

export function SketchProvider({ children }: Props) {
  const [
    basemapWidget,
    setBasemapWidget, //
  ] = React.useState<__esri.BasemapGallery | null>(null);
  const [edits, setEdits] = React.useState<EditsType>({ count: 0, edits: [] });
  const [featureService, setFeatureService] = React.useState<any>(null);
  const [featureServiceUrl, setFeatureServiceUrl] = React.useState('');
  const [layersInitialized, setLayersInitialized] = React.useState(false);
  const [layers, setLayers] = React.useState<LayerType[]>([]);
  const [portalLayers, setPortalLayers] = React.useState<string[]>([]);
  const [referenceLayers, setReferenceLayers] = React.useState<any[]>([]);
  const [urlLayers, setUrlLayers] = React.useState<UrlLayerType[]>([]);
  const [sketchLayer, setSketchLayer] = React.useState<LayerType | null>(null);
  const [aoiSketchLayer, setAoiSketchLayer] = React.useState<LayerType | null>(
    null,
  );
  const [
    lastSketchLayer,
    setLastSketchLayer,
  ] = React.useState<LayerType | null>(null);
  const [homeWidget, setHomeWidget] = React.useState<__esri.Home | null>(null);
  const [map, setMap] = React.useState<__esri.Map | null>(null);
  const [mapView, setMapView] = React.useState<__esri.MapView | null>(null);
  const [sketchVMLayerId, setSketchVMLayerId] = React.useState<string>('');
  const [
    sketchVM,
    setSketchVM, //
  ] = React.useState<__esri.SketchViewModel | null>(null);
  const [
    aoiSketchVM,
    setAoiSketchVM, //
  ] = React.useState<__esri.SketchViewModel | null>(null);

  return (
    <SketchContext.Provider
      value={{
        basemapWidget,
        setBasemapWidget,
        edits,
        setEdits,
        featureService,
        setFeatureService,
        featureServiceUrl,
        setFeatureServiceUrl,
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
        lastSketchLayer,
        setLastSketchLayer,
        map,
        setMap,
        mapView,
        setMapView,
        sketchVM,
        setSketchVM,
        aoiSketchVM,
        setAoiSketchVM,
        sketchVMLayerId,
        setSketchVMLayerId,
      }}
    >
      {children}
    </SketchContext.Provider>
  );
}
