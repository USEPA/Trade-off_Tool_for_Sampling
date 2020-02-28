export type EditsType = {
  count: number;
  edits: LayerEditsType[];
};

export type LayerEditsType = {
  id: number; // layer id
  layerId: string; // id from esri layer
  name: string; // layer name
  layerType: string; // type of tots layer (sample, contamination, etc.)
  addedFrom: string; // how the layer was added (file, url, etc.)
  adds: FeatureEditsType[]; // features to add
  updates: FeatureEditsType[]; // features to update
  deletes: FeatureEditsType[]; // features to delete
  splits: FeatureEditsType[]; // features to split
};

export type FeatureEditsType = {
  attributes: any;
  geometry: __esri.PolygonProperties;
};
