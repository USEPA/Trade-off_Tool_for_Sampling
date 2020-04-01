import React from 'react';
import { loadModules } from 'esri-loader';
// components
import LoadingSpinner from 'components/LoadingSpinner';

// map types from @types/arcgis-js-api to our use of esri-loader's loadModules
type EsriConstructors = [
  typeof import('esri/Graphic'),
  typeof import('esri/Map'),
  typeof import('esri/Viewpoint'),
  typeof import('esri/core/Collection'),
  typeof import('esri/core/watchUtils'),
  typeof import('esri/geometry/Extent'),
  typeof import('esri/geometry/geometryEngine'),
  typeof import('esri/geometry/Polygon'),
  typeof import('esri/geometry/SpatialReference'),
  typeof import('esri/geometry/support/jsonUtils'),
  typeof import('esri/geometry/support/webMercatorUtils'),
  typeof import('esri/identity/IdentityManager'),
  typeof import('esri/identity/OAuthInfo'),
  typeof import('esri/layers/CSVLayer'),
  typeof import('esri/layers/FeatureLayer'),
  typeof import('esri/layers/GeoRSSLayer'),
  typeof import('esri/layers/GraphicsLayer'),
  typeof import('esri/layers/KMLLayer'),
  typeof import('esri/layers/Layer'),
  typeof import('esri/layers/WMSLayer'),
  typeof import('esri/layers/WMTSLayer'),
  typeof import('esri/layers/support/Field'),
  typeof import('esri/PopupTemplate'),
  typeof import('esri/portal/Portal'),
  typeof import('esri/portal/PortalItem'),
  typeof import('esri/renderers/support/jsonUtils'),
  typeof import('esri/tasks/Geoprocessor'),
  typeof import('esri/tasks/support/FeatureSet'),
  typeof import('esri/views/MapView'),
  typeof import('esri/widgets/BasemapGallery'),
  typeof import('esri/widgets/BasemapGallery/support/PortalBasemapsSource'),
  typeof import('esri/widgets/Home'),
  typeof import('esri/widgets/LayerList'),
  typeof import('esri/widgets/Legend'),
  typeof import('esri/widgets/Locate'),
  typeof import('esri/widgets/Search'),
  typeof import('esri/widgets/Sketch/SketchViewModel'),
];

type Props = { children: React.ReactNode };

type State = {
  modulesLoaded: boolean;
  Graphic: EsriConstructors[0];
  EsriMap: EsriConstructors[1];
  Viewpoint: EsriConstructors[2];
  Collection: EsriConstructors[3];
  watchUtils: EsriConstructors[4];
  Extent: EsriConstructors[5];
  geometryEngine: EsriConstructors[6];
  Polygon: EsriConstructors[7];
  SpatialReference: EsriConstructors[8];
  geometryJsonUtils: EsriConstructors[9];
  webMercatorUtils: EsriConstructors[10];
  IdentityManager: EsriConstructors[11];
  OAuthInfo: EsriConstructors[12];
  CSVLayer: EsriConstructors[13];
  FeatureLayer: EsriConstructors[14];
  GeoRSSLayer: EsriConstructors[15];
  GraphicsLayer: EsriConstructors[16];
  KMLLayer: EsriConstructors[17];
  Layer: EsriConstructors[18];
  WMSLayer: EsriConstructors[19];
  WMTSLayer: EsriConstructors[20];
  Field: EsriConstructors[21];
  PopupTemplate: EsriConstructors[22];
  Portal: EsriConstructors[23];
  PortalItem: EsriConstructors[24];
  rendererJsonUtils: EsriConstructors[25];
  Geoprocessor: EsriConstructors[26];
  FeatureSet: EsriConstructors[27];
  MapView: EsriConstructors[28];
  BasemapGallery: EsriConstructors[29];
  PortalBasemapsSource: EsriConstructors[30];
  Home: EsriConstructors[31];
  LayerList: EsriConstructors[32];
  Legend: EsriConstructors[33];
  Locate: EsriConstructors[34];
  Search: EsriConstructors[35];
  SketchViewModel: EsriConstructors[36];
};

const EsriModulesContext = React.createContext<State | undefined>(undefined);
function EsriModulesProvider({ children }: Props) {
  const [modules, setModules] = React.useState<State | null>(null);
  React.useEffect(() => {
    (loadModules(
      [
        'esri/Graphic',
        'esri/Map',
        'esri/Viewpoint',
        'esri/core/Collection',
        'esri/core/watchUtils',
        'esri/geometry/Extent',
        'esri/geometry/geometryEngine',
        'esri/geometry/Polygon',
        'esri/geometry/SpatialReference',
        'esri/geometry/support/jsonUtils',
        'esri/geometry/support/webMercatorUtils',
        'esri/identity/IdentityManager',
        'esri/identity/OAuthInfo',
        'esri/layers/CSVLayer',
        'esri/layers/FeatureLayer',
        'esri/layers/GeoRSSLayer',
        'esri/layers/GraphicsLayer',
        'esri/layers/KMLLayer',
        'esri/layers/Layer',
        'esri/layers/WMSLayer',
        'esri/layers/WMTSLayer',
        'esri/layers/support/Field',
        'esri/PopupTemplate',
        'esri/portal/Portal',
        'esri/portal/PortalItem',
        'esri/renderers/support/jsonUtils',
        'esri/tasks/Geoprocessor',
        'esri/tasks/support/FeatureSet',
        'esri/views/MapView',
        'esri/widgets/BasemapGallery',
        'esri/widgets/BasemapGallery/support/PortalBasemapsSource',
        'esri/widgets/Home',
        'esri/widgets/LayerList',
        'esri/widgets/Legend',
        'esri/widgets/Locate',
        'esri/widgets/Search',
        'esri/widgets/Sketch/SketchViewModel',
      ],
      {
        version: '4.14',
        css: true,
      },
    ) as Promise<EsriConstructors>).then(
      ([
        Graphic,
        EsriMap,
        Viewpoint,
        Collection,
        watchUtils,
        Extent,
        geometryEngine,
        Polygon,
        SpatialReference,
        geometryJsonUtils,
        webMercatorUtils,
        IdentityManager,
        OAuthInfo,
        CSVLayer,
        FeatureLayer,
        GeoRSSLayer,
        GraphicsLayer,
        KMLLayer,
        Layer,
        WMSLayer,
        WMTSLayer,
        Field,
        PopupTemplate,
        Portal,
        PortalItem,
        rendererJsonUtils,
        Geoprocessor,
        FeatureSet,
        MapView,
        BasemapGallery,
        PortalBasemapsSource,
        Home,
        LayerList,
        Legend,
        Locate,
        Search,
        SketchViewModel,
      ]) => {
        setModules({
          modulesLoaded: true,
          Graphic,
          EsriMap,
          Viewpoint,
          Collection,
          watchUtils,
          Extent,
          geometryEngine,
          Polygon,
          SpatialReference,
          geometryJsonUtils,
          webMercatorUtils,
          IdentityManager,
          OAuthInfo,
          CSVLayer,
          FeatureLayer,
          GeoRSSLayer,
          GraphicsLayer,
          KMLLayer,
          Layer,
          WMSLayer,
          WMTSLayer,
          Field,
          PopupTemplate,
          Portal,
          PortalItem,
          rendererJsonUtils,
          Geoprocessor,
          FeatureSet,
          MapView,
          BasemapGallery,
          PortalBasemapsSource,
          Home,
          LayerList,
          Legend,
          Locate,
          Search,
          SketchViewModel,
        });
      },
    );
  }, []);

  if (!modules) return <LoadingSpinner />;

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
