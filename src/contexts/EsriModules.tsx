import React from 'react';
import { loadModules } from 'esri-loader';

// map types from @types/arcgis-js-api to our use of esri-loader's loadModules
type EsriConstructors = [
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

type Props = { children: React.ReactNode };

type State = {
  modulesLoaded: boolean;
  Graphic: EsriConstructors[0];
  EsriMap: EsriConstructors[1];
  Polygon: EsriConstructors[2];
  IdentityManager: EsriConstructors[3];
  OAuthInfo: EsriConstructors[4];
  GraphicsLayer: EsriConstructors[5];
  MapView: EsriConstructors[6];
  BasemapGallery: EsriConstructors[7];
  PortalBasemapsSource: EsriConstructors[8];
  Expand: EsriConstructors[9];
  Home: EsriConstructors[10];
  Search: EsriConstructors[11];
  SketchViewModel: EsriConstructors[12];
};

const EsriModulesContext = React.createContext<State | undefined>(undefined);
function EsriModulesProvider({ children }: Props) {
  const [modules, setModules] = React.useState<State | null>(null);

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
    ) as Promise<EsriConstructors>).then(
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

  if (!modules) return null;

  return (
    <EsriModulesContext.Provider value={modules}>
      {children}
    </EsriModulesContext.Provider>
  );
}

function useEsriModulesContext() {
  const context = React.useContext(EsriModulesContext);
  if (context === undefined) {
    throw new Error(
      'useEsriModulesContext must be used within a EsriModulesProvider',
    );
  }
  return context;
}

export { EsriModulesProvider, useEsriModulesContext };
