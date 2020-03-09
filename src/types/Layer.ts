export type LayerType = {
  id: number;
  layerId?: string;
  value: string;
  name: string;
  label: string;
  layerType: string;
  scenarioName: string;
  scenarioDescription: string;
  defaultVisibility: boolean;
  geometryType: string;
  addedFrom: string;
  sketchLayer: __esri.GraphicsLayer | __esri.FeatureLayer;
};

export type UrlLayerType = {
  url: string;
  type: string;
};
