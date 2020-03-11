/** @jsx jsx */

import React, { ReactNode } from 'react';
import { jsx } from '@emotion/core';
// types
import { EditsType } from 'types/Edits';
import { LayerType, UrlLayerType } from 'types/Layer';

type SketchType = {
  edits: EditsType;
  setEdits: React.Dispatch<React.SetStateAction<EditsType>>;
  featureService: any;
  setFeatureService: React.Dispatch<React.SetStateAction<any>>;
  featureServiceUrl: string;
  setFeatureServiceUrl: React.Dispatch<React.SetStateAction<string>>;
  homeWidget: __esri.Home | null;
  setHomeWidget: React.Dispatch<React.SetStateAction<__esri.Home | null>>;
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
  map: __esri.Map | null;
  setMap: React.Dispatch<React.SetStateAction<__esri.Map | null>>;
  selectedLayer: LayerType | null;
  setSelectedLayer: React.Dispatch<React.SetStateAction<LayerType | null>>;
  mapView: __esri.MapView | null;
  setMapView: React.Dispatch<React.SetStateAction<__esri.MapView | null>>;
  sketchVM: __esri.SketchViewModel | null;
  setSketchVM: React.Dispatch<
    React.SetStateAction<__esri.SketchViewModel | null>
  >;
};

export const SketchContext = React.createContext<SketchType>({
  edits: { count: 0, edits: [] },
  setEdits: () => {},
  featureService: null,
  setFeatureService: () => {},
  featureServiceUrl: '',
  setFeatureServiceUrl: () => {},
  homeWidget: null,
  setHomeWidget: () => {},
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
  map: null,
  setMap: () => {},
  selectedLayer: null,
  setSelectedLayer: () => {},
  mapView: null,
  setMapView: () => {},
  sketchVM: null,
  setSketchVM: () => {},
});

type Props = { children: ReactNode };

export function SketchProvider({ children }: Props) {
  const [edits, setEdits] = React.useState<EditsType>({ count: 0, edits: [] });
  const [featureService, setFeatureService] = React.useState<any>(null);
  const [featureServiceUrl, setFeatureServiceUrl] = React.useState('');
  const [layers, setLayers] = React.useState<LayerType[]>([]);
  const [portalLayers, setPortalLayers] = React.useState<string[]>([]);
  const [referenceLayers, setReferenceLayers] = React.useState<any[]>([]);
  const [urlLayers, setUrlLayers] = React.useState<UrlLayerType[]>([]);
  const [sketchLayer, setSketchLayer] = React.useState<LayerType | null>(null);
  const [homeWidget, setHomeWidget] = React.useState<__esri.Home | null>(null);
  const [map, setMap] = React.useState<__esri.Map | null>(null);
  const [mapView, setMapView] = React.useState<__esri.MapView | null>(null);
  const [
    selectedLayer,
    setSelectedLayer, //
  ] = React.useState<LayerType | null>(null);
  const [
    sketchVM,
    setSketchVM, //
  ] = React.useState<__esri.SketchViewModel | null>(null);

  return (
    <SketchContext.Provider
      value={{
        edits,
        setEdits,
        featureService,
        setFeatureService,
        featureServiceUrl,
        setFeatureServiceUrl,
        homeWidget,
        setHomeWidget,
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
        map,
        setMap,
        selectedLayer,
        setSelectedLayer,
        mapView,
        setMapView,
        sketchVM,
        setSketchVM,
      }}
    >
      {children}
    </SketchContext.Provider>
  );
}
