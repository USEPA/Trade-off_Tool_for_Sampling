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
  typeof import('esri/core/Handles'),
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
  Handles: EsriConstructors[5];
  watchUtils: EsriConstructors[6];
  Extent: EsriConstructors[7];
  geometryEngine: EsriConstructors[8];
  Point: EsriConstructors[9];
  Polygon: EsriConstructors[10];
  projection: EsriConstructors[11];
  SpatialReference: EsriConstructors[12];
  geometryJsonUtils: EsriConstructors[13];
  webMercatorUtils: EsriConstructors[14];
  IdentityManager: EsriConstructors[15];
  OAuthInfo: EsriConstructors[16];
  CSVLayer: EsriConstructors[17];
  FeatureLayer: EsriConstructors[18];
  GeoRSSLayer: EsriConstructors[19];
  GraphicsLayer: EsriConstructors[20];
  GroupLayer: EsriConstructors[21];
  KMLLayer: EsriConstructors[22];
  Layer: EsriConstructors[23];
  WMSLayer: EsriConstructors[24];
  WMTSLayer: EsriConstructors[25];
  Field: EsriConstructors[26];
  PopupTemplate: EsriConstructors[27];
  Portal: EsriConstructors[28];
  PortalItem: EsriConstructors[29];
  rendererJsonUtils: EsriConstructors[30];
  Geoprocessor: EsriConstructors[31];
  FeatureSet: EsriConstructors[32];
  MapView: EsriConstructors[33];
  BasemapGallery: EsriConstructors[34];
  PortalBasemapsSource: EsriConstructors[35];
  Home: EsriConstructors[36];
  LayerList: EsriConstructors[37];
  Legend: EsriConstructors[38];
  Locate: EsriConstructors[39];
  Search: EsriConstructors[40];
  Slider: EsriConstructors[41];
  SketchViewModel: EsriConstructors[42];
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
        'esri/core/Handles',
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
        Handles,
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
          Handles,
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
