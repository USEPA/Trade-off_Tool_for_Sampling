import { EditType } from 'types/Edits';

export type LayerTypeName =
  | 'Contamination Map'
  | 'Samples'
  | 'Reference Layer'
  | 'Area of Interest'
  | 'VSP';

export type LayerSelectType = {
  value: LayerTypeName;
  label: LayerTypeName;
};

export type AddedFrom = 'file' | 'sketch' | 'tots';

export type PublishStatus = 'added' | 'edited' | 'published';

export type LayerType = {
  id: number;
  layerId: string;
  portalId: string;
  value: string;
  name: string;
  label: string;
  layerType: LayerTypeName;
  scenarioName: string;
  scenarioDescription: string;
  editType: EditType;
  defaultVisibility: boolean;
  geometryType: string;
  addedFrom: AddedFrom;
  status: PublishStatus;
  sketchLayer: __esri.GraphicsLayer | __esri.FeatureLayer;
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
