import { AddedFrom, LayerTypeName, PublishStatus } from 'types/Layer';

export type EditsType = {
  count: number;
  edits: LayerEditsType[];
};

export type EditType = 'add' | 'update' | 'delete' | 'arcgis' | 'properties';

export type ScenarioType = {
  scenarioName: string;
  scenarioDescription: string;
  layers: LayerEditsType[];
};

export type LayerEditsType = {
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
  scenarioName: string; // user defined scenario name
  scenarioDescription: string; // user defined scenario description  adds: FeatureEditsType[]; // features to add
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
