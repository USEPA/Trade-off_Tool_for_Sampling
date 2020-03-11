/** @jsx jsx */

import React, { ReactNode } from 'react';
import { jsx } from '@emotion/core';
// types
import { EditsType } from 'types/Edits';
import { LayerType, UrlLayerType } from 'types/Layer';

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
  lastSketchLayer: any | null;
  setLastSketchLayer: Function;
  map: __esri.Map | null;
  setMap: Function;
  selectedLayer: LayerType | null;
  setSelectedLayer: Function;
  mapView: __esri.MapView | null;
  setMapView: Function;
  sketchVM: __esri.SketchViewModel | null;
  setSketchVM: Function;
  sketchVMLayerId: string;
  setSketchVMLayerId: Function;
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
  lastSketchLayer: null,
  setLastSketchLayer: () => {},
  map: null,
  setMap: () => {},
  selectedLayer: null,
  setSelectedLayer: () => {},
  mapView: null,
  setMapView: () => {},
  sketchVM: null,
  setSketchVM: () => {},
  sketchVMLayerId: '',
  setSketchVMLayerId: () => {},
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
  const [lastSketchLayer, setLastSketchLayer] = React.useState(null);
  const [homeWidget, setHomeWidget] = React.useState(null);
  const [map, setMap] = React.useState(null);
  const [mapView, setMapView] = React.useState(null);
  const [sketchVMLayerId, setSketchVMLayerId] = React.useState('');
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
        lastSketchLayer,
        setLastSketchLayer,
        map,
        setMap,
        selectedLayer,
        setSelectedLayer,
        mapView,
        setMapView,
        sketchVM,
        setSketchVM,
        sketchVMLayerId,
        setSketchVMLayerId,
      }}
    >
      {children}
    </SketchContext.Provider>
  );
}
