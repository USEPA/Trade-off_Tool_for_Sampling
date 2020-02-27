/** @jsx jsx */

import React, { ReactNode } from 'react';
import { jsx } from '@emotion/core';

export type FeatureEditsType = {
  attributes: any;
  geometry: any;
};

export type LayerEditsType = {
  id: number; // layer id
  layerId: string; // id from esri layer
  name: string; // layer name
  layerType: string; // type of tots layer (sample, contamination, etc.)
  addedFrom: string; // how the layer was added (file, url, etc.)
  adds: FeatureEditsType[]; // features to add
  updates: FeatureEditsType[]; // features to update
  deletes: FeatureEditsType[]; // features to delete
  splits: FeatureEditsType[]; // features to split
};

export type EditsType = {
  count: number;
  edits: LayerEditsType[];
};

export type LayerType = {
  id: number;
  layerId?: string;
  value: string;
  name: string;
  label: string;
  layerType: string;
  defaultVisibility: boolean;
  geometryType: string;
  addedFrom: string;
  sketchLayer: __esri.GraphicsLayer | __esri.FeatureLayer;
};

export type UrlLayerType = {
  url: string;
  type: string;
};

type SketchType = {
  edits: EditsType;
  setEdits: Function;
  featureService: any;
  setFeatureService: Function;
  featureServiceUrl: string;
  setFeatureServiceUrl: Function;
  homeWidget: __esri.Home | null;
  setHomeWidget: Function;
  layers: LayerType[];
  setLayers: Function;
  portalLayers: string[];
  setPortalLayers: Function;
  referenceLayers: any[];
  setReferenceLayers: Function;
  urlLayers: UrlLayerType[];
  setUrlLayers: Function;
  sketchLayer: LayerType | null;
  setSketchLayer: Function;
  map: __esri.Map | null;
  setMap: Function;
  selectedLayer: any;
  setSelectedLayer: Function;
  mapView: any;
  setMapView: Function;
  sketchVM: __esri.SketchViewModel | null;
  setSketchVM: Function;
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
  const [portalLayers, setPortalLayers] = React.useState([]);
  const [referenceLayers, setReferenceLayers] = React.useState([]);
  const [urlLayers, setUrlLayers] = React.useState([]);
  const [sketchLayer, setSketchLayer] = React.useState(null);
  const [homeWidget, setHomeWidget] = React.useState(null);
  const [map, setMap] = React.useState(null);
  const [selectedLayer, setSelectedLayer] = React.useState<any>(null);
  const [mapView, setMapView] = React.useState(null);
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
