/** @jsx jsx */

import React, { ReactNode } from 'react';
import { jsx } from '@emotion/core';
import { loadModules } from 'esri-loader';

// map types from @types/arcgis-js-api to our use of esri-loader's loadModules
type EsriModules = [
  typeof import('esri/Graphic'),
  typeof import('esri/Map'),
  typeof import('esri/geometry/Polygon'),
  typeof import('esri/identity/IdentityManager'),
  typeof import('esri/identity/OAuthInfo'),
  typeof import('esri/layers/GraphicsLayer'),
  typeof import('esri/views/MapView'),
  typeof import('esri/widgets/BasemapGallery'),
  typeof import('esri/widgets/BasemapGallery/support/PortalBasemapsSource'),
  typeof import('esri/widgets/Expand'),
  typeof import('esri/widgets/Home'),
  typeof import('esri/widgets/Search'),
  typeof import('esri/widgets/Sketch/SketchViewModel'),
];

type EsriModulesObj = {
  modulesLoaded: boolean;
  Graphic: typeof import('esri/Graphic') | null;
  EsriMap: typeof import('esri/Map') | null;
  Polygon: typeof import('esri/geometry/Polygon') | null;
  IdentityManager: typeof import('esri/identity/IdentityManager') | null;
  OAuthInfo: typeof import('esri/identity/OAuthInfo') | null;
  GraphicsLayer: typeof import('esri/layers/GraphicsLayer') | null;
  MapView: typeof import('esri/views/MapView') | null;
  BasemapGallery: typeof import('esri/widgets/BasemapGallery') | null;
  PortalBasemapsSource:
    | typeof import('esri/widgets/BasemapGallery/support/PortalBasemapsSource')
    | null;
  Expand: typeof import('esri/widgets/Expand') | null;
  Home: typeof import('esri/widgets/Home') | null;
  Search: typeof import('esri/widgets/Search') | null;
  SketchViewModel: typeof import('esri/widgets/Sketch/SketchViewModel') | null;
};

// --- components ---
export const EsriModulesContext = React.createContext<EsriModulesObj>({
  modulesLoaded: false,
  Graphic: null,
  EsriMap: null,
  Polygon: null,
  IdentityManager: null,
  OAuthInfo: null,
  GraphicsLayer: null,
  MapView: null,
  BasemapGallery: null,
  PortalBasemapsSource: null,
  Expand: null,
  Home: null,
  Search: null,
  SketchViewModel: null,
});

type Props = { children: ReactNode };

export function EsriModulesProvider({ children }: Props) {
  const [modules, setModules] = React.useState<EsriModulesObj>({
    modulesLoaded: false,
    Graphic: null,
    EsriMap: null,
    Polygon: null,
    IdentityManager: null,
    OAuthInfo: null,
    GraphicsLayer: null,
    MapView: null,
    BasemapGallery: null,
    PortalBasemapsSource: null,
    Expand: null,
    Home: null,
    Search: null,
    SketchViewModel: null,
  });

  React.useEffect(() => {
    (loadModules(
      [
        'esri/Graphic',
        'esri/Map',
        'esri/geometry/Polygon',
        'esri/identity/IdentityManager',
        'esri/identity/OAuthInfo',
        'esri/layers/GraphicsLayer',
        'esri/views/MapView',
        'esri/widgets/BasemapGallery',
        'esri/widgets/BasemapGallery/support/PortalBasemapsSource',
        'esri/widgets/Expand',
        'esri/widgets/Home',
        'esri/widgets/Search',
        'esri/widgets/Sketch/SketchViewModel',
      ],
      {
        version: '4.13',
        css: true,
      },
    ) as Promise<EsriModules>).then(
      ([
        Graphic,
        EsriMap,
        Polygon,
        IdentityManager,
        OAuthInfo,
        GraphicsLayer,
        MapView,
        BasemapGallery,
        PortalBasemapsSource,
        Expand,
        Home,
        Search,
        SketchViewModel,
      ]) => {
        setModules({
          modulesLoaded: true,
          Graphic,
          EsriMap,
          Polygon,
          IdentityManager,
          OAuthInfo,
          GraphicsLayer,
          MapView,
          BasemapGallery,
          PortalBasemapsSource,
          Expand,
          Home,
          Search,
          SketchViewModel,
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
