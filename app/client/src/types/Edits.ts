import { AddedFrom, LayerTypeName, PublishStatus } from 'types/Layer';
import { AttributesType } from 'types/Publish';

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

export type TableType = {
  id: number; // esri layer id
  sampleTypes: any; // <sample type name>: { attributes: any };
};

export type ReferenceLayerTableType = {
  globalId: string;
  layerId: string;
  label: string;
  layerType: string;
  objectId: number;
  onWebMap: number;
  onWebScene: number;
  type: string;
  url: string;
  urlType: string;
};

export type ReferenceLayersTableType = {
  id: number; // esri layer id
  referenceLayers: ReferenceLayerTableType[];
};

export type CalculateSettingsBaseType = {
  OBJECTID?: number;
  GLOBALID?: string;
  NUM_LABS: number;
  NUM_LAB_HOURS: number;
  NUM_SAMPLING_HOURS: number;
  NUM_SAMPLING_PERSONNEL: number;
  NUM_SAMPLING_SHIFTS: number;
  NUM_SAMPLING_TEAMS: number;
  SAMPLING_LABOR_COST: number;
  SURFACE_AREA: number;
};

export type CalculateSettingsType = {
  current: CalculateSettingsBaseType;
  published?: CalculateSettingsBaseType;
};

export type ScenarioEditsType = {
  type: 'scenario';
  id: number; // scenario layer id
  pointsId: number;
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
  table: TableType | null;
  referenceLayersTable: ReferenceLayersTableType;
  customAttributes: AttributesType[];
  calculateSettings: CalculateSettingsType;
};

export type LayerEditsType = {
  type: 'layer';
  id: number; // layer id
  pointsId: number;
  uuid: string; // unique id for the layer
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
  sort: number; // sort order for this layer
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
  DECISIONUNITUUID: string;
};

export type ServiceMetaDataType = {
  value: string; // sample type uuid
  label: string; // sample type name
  description: string; // sample type description
  url: string; // url of service
};
