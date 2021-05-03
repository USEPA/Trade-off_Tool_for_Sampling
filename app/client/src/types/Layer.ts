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

export type PortalLayerType = {
  id: string;
  type: 'arcgis' | 'tots';
};

export type UrlLayerType = {
  url: string;
  type: string;
  layerId: string;
};

export type FieldInfos = {
  fieldName: string;
  label: string;
}[];
