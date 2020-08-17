import { AddedFrom, LayerTypeName, PublishStatus } from 'types/Layer';

export type EditsType = {
  count: number;
  edits: (ScenarioEditsType | LayerEditsType)[];
};

export type EditType =
  | 'add'
  | 'update'
  | 'delete'
  | 'arcgis'
  | 'properties'
  | 'move';

export type ScenarioEditsType = {
  type: 'scenario';
  id: number; // scenario layer id
  layerId: string; // id from esri group layer
  portalId: string; // id from portal layer
  name: string; // layer/scenario name
  label: string; // layer/scenario label
  value: string; // layer/scenario value for React-Select
  layerType: LayerTypeName; // type of tots layer (sample, contamination, etc.)
  addedFrom: AddedFrom; // how the layer was added (file, url, etc.)
  hasContaminationRan: boolean; // says whether or not contamination hits has been ran
  status: PublishStatus; // publish status
  editType: EditType; // edit type
  visible: boolean; // layer visibility on map
  listMode: 'hide' | 'hide-children' | 'show'; // layer visiblity in legend widget
  scenarioName: string; // user defined scenario name
  scenarioDescription: string; // user defined scenario description  adds: FeatureEditsType[]; // features to add
  layers: LayerEditsType[];
};

export type LayerEditsType = {
  type: 'layer';
  id: number; // layer id
  layerId: string; // id from esri layer
  portalId: string; // id from portal layer
  name: string; // layer name
  label: string; // layer label
  layerType: LayerTypeName; // type of tots layer (sample, contamination, etc.)
  addedFrom: AddedFrom; // how the layer was added (file, url, etc.)
  hasContaminationRan: boolean; // says whether or not contamination hits has been ran
  status: PublishStatus; // publish status
  editType: EditType; // edit type
  visible: boolean; // layer visibility on map
  listMode: 'hide' | 'hide-children' | 'show'; // layer visiblity in legend widget
  adds: FeatureEditsType[]; // features to add
  updates: FeatureEditsType[]; // features to update
  deletes: DeleteFeatureType[]; // features to delete
  published: FeatureEditsType[]; // features as they are on AGOL
};

export type FeatureEditsType = {
  attributes: any;
  geometry: __esri.PolygonProperties;
};

export type DeleteFeatureType = {
  PERMANENT_IDENTIFIER: string;
  GLOBALID: string;
};
