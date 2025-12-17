import { EditType } from 'types/Edits';

export type LayerTypeName =
  | 'AOI Analysis'
  | 'AOI Assessed'
  | 'Area of Interest'
  | 'Contamination Map'
  | 'Decon'
  | 'Decon Mask'
  | 'Decon Results'
  | 'Decon Scenario'
  | 'GSG'
  | 'Image Analysis'
  | 'Reference Layer'
  | 'Samples'
  | 'Sampling Mask'
  | 'Staging Area Mask'
  | 'VSP';

export type LayerTypeLabel =
  | 'Area of Interest'
  | 'Contamination Map'
  | 'Decon Applications'
  | 'GSG'
  | 'Reference Layer'
  | 'Samples'
  | 'Sampling Mask'
  | 'VSP';

export type LayerSelectType = {
  value: LayerTypeName;
  label: LayerTypeLabel;
};

export type AddedFrom = 'file' | 'sketch' | 'tots';

export type PublishStatus = 'added' | 'edited' | 'published';

export type LayerType = {
  id: number;
  pointsId: number;
  uuid: string;
  layerId: string;
  portalId: string;
  value: string;
  name: string;
  label: string;
  layerType: LayerTypeName;
  editType: EditType;
  visible: boolean;
  listMode: 'hide' | 'hide-children' | 'show';
  sort: number;
  geometryType: string;
  addedFrom: AddedFrom;
  status: PublishStatus;
  sketchLayer:
    | __esri.GraphicsLayer
    | __esri.FeatureLayer
    | __esri.GroupLayer
    | null;
  hybridLayer: __esri.GraphicsLayer | null;
  pointsLayer: __esri.GraphicsLayer | null;
  parentLayer: __esri.GroupLayer | null;
};

export type UrlLayerTypes = 'ArcGIS' | 'CSV' | 'GeoRSS' | 'KML' | 'WMS';

export type PortalLayerTypes =
  | 'Feature Service'
  | 'Image Service'
  | 'KML'
  | 'Map Service'
  | 'Scene Service'
  | 'Vector Tile Service'
  | 'WMS';

export type PortalUrlLayerTypes = PortalLayerTypes & UrlLayerTypes;

export type PortalLayerType = {
  categories: string[];
  id: string;
  type: 'arcgis' | 'tots';
  label: string;
  layerType: PortalLayerTypes;
  url: string;
  linkedIds?: string[];
};

export type UrlLayerType = {
  label: string;
  layerId: string;
  layerType: string;
  type: UrlLayerTypes;
  url: string;
};

export type FieldInfos = {
  fieldName: string;
  label: string;
  format?: 'number' | null;
}[];
