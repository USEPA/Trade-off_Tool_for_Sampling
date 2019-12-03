/** @jsx jsx */

import React, { ReactNode } from 'react';
import { jsx } from '@emotion/core';
import { loadModules } from 'esri-loader';

// map types from @types/arcgis-js-api to our use of esri-loader's loadModules
type EsriModules = [
  typeof import('esri/Map'),
  typeof import('esri/views/MapView'),
  typeof import('esri/widgets/Sketch/SketchViewModel'),
  typeof import('esri/layers/GraphicsLayer'),
  typeof import('esri/Graphic'),
  typeof import('esri/geometry/Polygon'),
];

type EsriModulesObj = {
  modulesLoaded: boolean;
  EsriMap: typeof import('esri/Map') | null;
  MapView: typeof import('esri/views/MapView') | null;
  SketchViewModel: typeof import('esri/widgets/Sketch/SketchViewModel') | null;
  GraphicsLayer: typeof import('esri/layers/GraphicsLayer') | null;
  Graphic: typeof import('esri/Graphic') | null;
  Polygon: typeof import('esri/geometry/Polygon') | null;
};

// --- components ---
export const EsriModulesContext = React.createContext<EsriModulesObj>({
  modulesLoaded: false,
  EsriMap: null,
  MapView: null,
  SketchViewModel: null,
  GraphicsLayer: null,
  Graphic: null,
  Polygon: null,
});

type Props = { children: ReactNode };

export function EsriModulesProvider({ children }: Props) {
  const [modules, setModules] = React.useState<EsriModulesObj>({
    modulesLoaded: false,
    EsriMap: null,
    MapView: null,
    SketchViewModel: null,
    GraphicsLayer: null,
    Graphic: null,
    Polygon: null,
  });

  React.useEffect(() => {
    (loadModules(
      [
        'esri/Map',
        'esri/views/MapView',
        'esri/widgets/Sketch/SketchViewModel',
        'esri/layers/GraphicsLayer',
        'esri/Graphic',
        'esri/geometry/Polygon',
      ],
      {
        version: '4.13',
        css: true,
      },
    ) as Promise<EsriModules>).then(
      ([
        EsriMap,
        MapView,
        SketchViewModel,
        GraphicsLayer,
        Graphic,
        Polygon,
      ]) => {
        setModules({
          modulesLoaded: true,
          EsriMap,
          MapView,
          SketchViewModel,
          GraphicsLayer,
          Graphic,
          Polygon,
        });
      },
    );
  }, []);

  return (
    <EsriModulesContext.Provider value={modules}>
      {children}
    </EsriModulesContext.Provider>
  );
}
