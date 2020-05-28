import React from 'react';
import { loadModules } from 'esri-loader';
// components
import LoadingSpinner from 'components/LoadingSpinner';
// config
import { proxyUrl } from 'config/webService';

// map types from @types/arcgis-js-api to our use of esri-loader's loadModules
type EsriConstructors = [
  typeof import('esri/config'),
  typeof import('esri/Graphic'),
  typeof import('esri/Map'),
  typeof import('esri/Viewpoint'),
  typeof import('esri/core/Collection'),
  typeof import('esri/core/watchUtils'),
  typeof import('esri/geometry/Extent'),
  typeof import('esri/geometry/geometryEngine'),
  typeof import('esri/geometry/Polygon'),
  typeof import('esri/geometry/projection'),
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
  typeof import('esri/widgets/Slider'),
  typeof import('esri/widgets/Sketch/SketchViewModel'),
];

type Props = { children: React.ReactNode };

type State = {
  modulesLoaded: boolean;
  Graphic: EsriConstructors[1];
  EsriMap: EsriConstructors[2];
  Viewpoint: EsriConstructors[3];
  Collection: EsriConstructors[4];
  watchUtils: EsriConstructors[5];
  Extent: EsriConstructors[6];
  geometryEngine: EsriConstructors[7];
  Polygon: EsriConstructors[8];
  projection: EsriConstructors[9];
  SpatialReference: EsriConstructors[10];
  geometryJsonUtils: EsriConstructors[11];
  webMercatorUtils: EsriConstructors[12];
  IdentityManager: EsriConstructors[13];
  OAuthInfo: EsriConstructors[14];
  CSVLayer: EsriConstructors[15];
  FeatureLayer: EsriConstructors[16];
  GeoRSSLayer: EsriConstructors[17];
  GraphicsLayer: EsriConstructors[18];
  KMLLayer: EsriConstructors[19];
  Layer: EsriConstructors[20];
  WMSLayer: EsriConstructors[21];
  WMTSLayer: EsriConstructors[22];
  Field: EsriConstructors[23];
  PopupTemplate: EsriConstructors[24];
  Portal: EsriConstructors[25];
  PortalItem: EsriConstructors[26];
  rendererJsonUtils: EsriConstructors[27];
  Geoprocessor: EsriConstructors[28];
  FeatureSet: EsriConstructors[29];
  MapView: EsriConstructors[30];
  BasemapGallery: EsriConstructors[31];
  PortalBasemapsSource: EsriConstructors[32];
  Home: EsriConstructors[33];
  LayerList: EsriConstructors[34];
  Legend: EsriConstructors[35];
  Locate: EsriConstructors[36];
  Search: EsriConstructors[37];
  Slider: EsriConstructors[38];
  SketchViewModel: EsriConstructors[39];
};

const EsriModulesContext = React.createContext<State | undefined>(undefined);
function EsriModulesProvider({ children }: Props) {
  const [modules, setModules] = React.useState<State | null>(null);
  React.useEffect(() => {
    (loadModules(
      [
        'esri/config',
        'esri/Graphic',
        'esri/Map',
        'esri/Viewpoint',
        'esri/core/Collection',
        'esri/core/watchUtils',
        'esri/geometry/Extent',
        'esri/geometry/geometryEngine',
        'esri/geometry/Polygon',
        'esri/geometry/projection',
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
        'esri/widgets/Slider',
        'esri/widgets/Sketch/SketchViewModel',
      ],
      {
        version: '4.15',
        css: true,
      },
    ) as Promise<EsriConstructors>).then(
      ([
        config,
        Graphic,
        EsriMap,
        Viewpoint,
        Collection,
        watchUtils,
        Extent,
        geometryEngine,
        Polygon,
        projection,
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
        Slider,
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
          projection,
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
          Slider,
          SketchViewModel,
        });

        config.request.proxyUrl = proxyUrl;
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
