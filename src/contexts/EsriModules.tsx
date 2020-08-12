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
  typeof import('esri/geometry/Point'),
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
  typeof import('esri/layers/GroupLayer'),
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
  Point: EsriConstructors[8];
  Polygon: EsriConstructors[9];
  projection: EsriConstructors[10];
  SpatialReference: EsriConstructors[11];
  geometryJsonUtils: EsriConstructors[12];
  webMercatorUtils: EsriConstructors[13];
  IdentityManager: EsriConstructors[14];
  OAuthInfo: EsriConstructors[15];
  CSVLayer: EsriConstructors[16];
  FeatureLayer: EsriConstructors[17];
  GeoRSSLayer: EsriConstructors[18];
  GraphicsLayer: EsriConstructors[19];
  GroupLayer: EsriConstructors[20];
  KMLLayer: EsriConstructors[21];
  Layer: EsriConstructors[22];
  WMSLayer: EsriConstructors[23];
  WMTSLayer: EsriConstructors[24];
  Field: EsriConstructors[25];
  PopupTemplate: EsriConstructors[26];
  Portal: EsriConstructors[27];
  PortalItem: EsriConstructors[28];
  rendererJsonUtils: EsriConstructors[29];
  Geoprocessor: EsriConstructors[30];
  FeatureSet: EsriConstructors[31];
  MapView: EsriConstructors[32];
  BasemapGallery: EsriConstructors[33];
  PortalBasemapsSource: EsriConstructors[34];
  Home: EsriConstructors[35];
  LayerList: EsriConstructors[36];
  Legend: EsriConstructors[37];
  Locate: EsriConstructors[38];
  Search: EsriConstructors[39];
  Slider: EsriConstructors[40];
  SketchViewModel: EsriConstructors[41];
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
        'esri/geometry/Point',
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
        'esri/layers/GroupLayer',
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
        Point,
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
        GroupLayer,
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
          Point,
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
          GroupLayer,
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
