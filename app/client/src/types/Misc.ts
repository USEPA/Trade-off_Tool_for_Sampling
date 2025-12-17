export type ErrorType = {
  error: any;
  message: string;
};

export type LayerProps = {
  defaultFields: __esri.FieldProperties[];
  additionalTableFields: __esri.FieldProperties[];
  defaultReferenceTableFields: __esri.FieldProperties[];
  defaultCalculateSettingsTableFields: __esri.FieldProperties[];
  defaultCalculateResultsTableFields: __esri.FieldProperties[];
  defaultDeconCalculationResultsTableFields: __esri.FieldProperties[];
  defaultDeconOperationDetailsTableFields: __esri.FieldProperties[];
  defaultDeconOperationSettingsTableFields: __esri.FieldProperties[];
  defaultImageryAnalysisFields: __esri.FieldProperties[];
  defaultBuildingLayerFields: __esri.FieldProperties[];
  defaultDeconMaskLayerFields: __esri.FieldProperties[];
  defaultAoiInfoTableFields: __esri.FieldProperties[];
  defaultAoiStagingAreaMaskLayerFields: __esri.FieldProperties[];
  defaultContaminationMapLayerFields: __esri.FieldProperties[];
  defaultLayerProps: __esri.FeatureLayerProperties;
  defaultTableProps: any;
  defaultWebMapProps: any;
  defaultWebSceneProps: any;
  webMapFieldProps: any;
};

export type LookupFile = {
  status: 'fetching' | 'success' | 'failure';
  data: any;
};
