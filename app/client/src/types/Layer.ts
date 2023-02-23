import { EditType } from 'types/Edits';

export type LayerTypeName =
  | 'Contamination Map'
  | 'Samples'
  | 'Reference Layer'
  | 'Area of Interest'
  | 'VSP'
  | 'Sampling Mask';

export type LayerSelectType = {
  value: LayerTypeName;
  label: LayerTypeName;
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
  sketchLayer: __esri.GraphicsLayer | __esri.FeatureLayer;
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
  id: string;
  type: 'arcgis' | 'tots';
  label: string;
  layerType: PortalLayerTypes;
  url: string;
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
}[];
