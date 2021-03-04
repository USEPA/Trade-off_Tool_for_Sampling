export const defaultLayerProps = {
  type: 'Feature Layer',
  editFieldsInfo: {
    creationDateField: 'CREATEDDATE',
    creatorField: 'USERNAME',
    editDateField: 'UPDATEDDATE',
  },
  editingInfo: {
    lastEditDate: 1455126059440,
  },
  geometryType: 'esriGeometryPolygon',
  minScale: 0,
  maxScale: 0,
  allowGeometryUpdates: true,
  hasAttachments: false,
  htmlPopupType: 'esriServerHTMLPopupTypeNone',
  hasM: false,
  hasZ: false,
  objectIdField: 'OBJECTID',
  globalIdField: 'GLOBALID',
  fields: [
    {
      name: 'OBJECTID',
      type: 'esriFieldTypeOID',
      actualType: 'int',
      alias: 'OBJECTID',
      sqlType: 'sqlTypeInteger',
      length: 4,
      nullable: false,
      editable: false,
      domain: null,
      defaultValue: null,
    },
    {
      name: 'PERMANENT_IDENTIFIER',
      type: 'esriFieldTypeGUID',
      alias: 'PERMANENT_IDENTIFIER',
      sqlType: 'sqlTypeOther',
      length: 38,
      nullable: true,
      editable: true,
      domain: null,
      defaultValue: '',
    },
    {
      name: 'GLOBALID',
      type: 'esriFieldTypeGlobalID',
      alias: 'GlobalID',
      sqlType: 'sqlTypeOther',
      length: 38,
      nullable: false,
      editable: false,
      domain: null,
      defaultValue: 'NEWID() WITH VALUES',
    },
    {
      name: 'TYPE',
      type: 'esriFieldTypeString',
      actualType: 'nvarchar',
      alias: 'TYPE',
      sqlType: 'sqlTypeNVarchar',
      length: 255,
      nullable: true,
      editable: true,
      domain: null,
      defaultValue: null,
    },
    {
      name: 'ShapeType',
      type: 'esriFieldTypeString',
      actualType: 'nvarchar',
      alias: 'ShapeType',
      sqlType: 'sqlTypeNVarchar',
      length: 50,
      nullable: true,
      editable: true,
      domain: null,
      defaultValue: null,
    },
    {
      name: 'Width',
      type: 'esriFieldTypeDouble',
      actualType: 'double',
      alias: 'Width',
      sqlType: 'sqlTypeDouble',
      nullable: true,
      editable: true,
      domain: null,
      defaultValue: null,
    },
    {
      name: 'SA',
      type: 'esriFieldTypeDouble',
      actualType: 'double',
      alias: 'SA',
      sqlType: 'sqlTypeDouble',
      nullable: true,
      editable: true,
      domain: null,
      defaultValue: null,
    },
    {
      name: 'AA',
      type: 'esriFieldTypeDouble',
      actualType: 'double',
      alias: 'AA',
      sqlType: 'sqlTypeDouble',
      nullable: true,
      editable: true,
      domain: null,
      defaultValue: null,
    },
    {
      name: 'TTPK',
      type: 'esriFieldTypeDouble',
      actualType: 'double',
      alias: 'TTPK',
      sqlType: 'sqlTypeDouble',
      nullable: true,
      editable: true,
      domain: null,
      defaultValue: null,
    },
    {
      name: 'TTC',
      type: 'esriFieldTypeDouble',
      actualType: 'double',
      alias: 'TTC',
      sqlType: 'sqlTypeDouble',
      nullable: true,
      editable: true,
      domain: null,
      defaultValue: null,
    },
    {
      name: 'TTA',
      type: 'esriFieldTypeDouble',
      actualType: 'double',
      alias: 'TTA',
      sqlType: 'sqlTypeDouble',
      nullable: true,
      editable: true,
      domain: null,
      defaultValue: null,
    },
    {
      name: 'TTPS',
      type: 'esriFieldTypeDouble',
      actualType: 'double',
      alias: 'TTPS',
      sqlType: 'sqlTypeDouble',
      nullable: true,
      editable: true,
      domain: null,
      defaultValue: null,
    },
    {
      name: 'LOD_P',
      type: 'esriFieldTypeDouble',
      actualType: 'double',
      alias: 'LOD_P',
      sqlType: 'sqlTypeDouble',
      nullable: true,
      editable: true,
      domain: null,
      defaultValue: null,
    },
    {
      name: 'LOD_NON',
      type: 'esriFieldTypeDouble',
      actualType: 'double',
      alias: 'LOD_NON',
      sqlType: 'sqlTypeDouble',
      nullable: true,
      editable: true,
      domain: null,
      defaultValue: null,
    },
    {
      name: 'MCPS',
      type: 'esriFieldTypeDouble',
      actualType: 'double',
      alias: 'MCPS',
      sqlType: 'sqlTypeDouble',
      nullable: true,
      editable: true,
      domain: null,
      defaultValue: null,
    },
    {
      name: 'TCPS',
      type: 'esriFieldTypeDouble',
      actualType: 'double',
      alias: 'TCPS',
      sqlType: 'sqlTypeDouble',
      nullable: true,
      editable: true,
      domain: null,
      defaultValue: null,
    },
    {
      name: 'WVPS',
      type: 'esriFieldTypeDouble',
      actualType: 'double',
      alias: 'WVPS',
      sqlType: 'sqlTypeDouble',
      nullable: true,
      editable: true,
      domain: null,
      defaultValue: null,
    },
    {
      name: 'WWPS',
      type: 'esriFieldTypeDouble',
      actualType: 'double',
      alias: 'WWPS',
      sqlType: 'sqlTypeDouble',
      nullable: true,
      editable: true,
      domain: null,
      defaultValue: null,
    },
    {
      name: 'ALC',
      type: 'esriFieldTypeDouble',
      actualType: 'double',
      alias: 'ALC',
      sqlType: 'sqlTypeDouble',
      nullable: true,
      editable: true,
      domain: null,
      defaultValue: null,
    },
    {
      name: 'AMC',
      type: 'esriFieldTypeDouble',
      actualType: 'double',
      alias: 'AMC',
      sqlType: 'sqlTypeDouble',
      nullable: true,
      editable: true,
      domain: null,
      defaultValue: null,
    },
    {
      name: 'Notes',
      type: 'esriFieldTypeString',
      actualType: 'nvarchar',
      alias: 'Notes',
      sqlType: 'sqlTypeNVarchar',
      length: 2000,
      nullable: true,
      editable: true,
      domain: null,
      defaultValue: null,
    },
    {
      name: 'CONTAMTYPE',
      type: 'esriFieldTypeString',
      actualType: 'nvarchar',
      alias: 'CONTAMTYPE',
      sqlType: 'sqlTypeNVarchar',
      length: 20,
      nullable: true,
      editable: true,
      domain: null,
      defaultValue: null,
    },
    {
      name: 'CONTAMVAL',
      type: 'esriFieldTypeDouble',
      actualType: 'double',
      alias: 'CONTAMVAL',
      sqlType: 'sqlTypeDouble',
      nullable: true,
      editable: true,
      domain: null,
      defaultValue: null,
    },
    {
      name: 'CONTAMUNIT',
      type: 'esriFieldTypeString',
      actualType: 'nvarchar',
      alias: 'CONTAMUNIT',
      sqlType: 'sqlTypeNVarchar',
      length: 10,
      nullable: true,
      editable: true,
      domain: null,
      defaultValue: null,
    },
    {
      name: 'CREATEDDATE',
      type: 'esriFieldTypeDate',
      alias: 'CREATEDDATE',
      sqlType: 'sqlTypeOther',
      nullable: true,
      editable: false,
      domain: null,
      defaultValue: null,
    },
    {
      name: 'USERNAME',
      type: 'esriFieldTypeString',
      alias: 'USERNAME',
      sqlType: 'sqlTypeOther',
      length: 255,
      nullable: true,
      editable: false,
      domain: null,
      defaultValue: null,
    },
    {
      name: 'UPDATEDDATE',
      type: 'esriFieldTypeDate',
      alias: 'UPDATEDDATE',
      sqlType: 'sqlTypeOther',
      nullable: true,
      editable: false,
      domain: null,
      defaultValue: null,
    },
    {
      name: 'ORGANIZATION',
      type: 'esriFieldTypeString',
      actualType: 'nvarchar',
      alias: 'ORGANIZATION',
      sqlType: 'sqlTypeNVarchar',
      length: 255,
      nullable: true,
      editable: false,
      domain: null,
      defaultValue: null,
    },
    {
      name: 'DECISIONUNITUUID',
      type: 'esriFieldTypeGUID',
      alias: 'DECISIONUNITUUID',
      sqlType: 'sqlTypeOther',
      length: 38,
      nullable: true,
      editable: true,
      domain: null,
      defaultValue: '',
    },
    {
      name: 'DECISIONUNIT',
      type: 'esriFieldTypeString',
      actualType: 'nvarchar',
      alias: 'DECISIONUNIT',
      sqlType: 'sqlTypeNVarchar',
      length: 255,
      nullable: true,
      editable: true,
      domain: null,
      defaultValue: null,
    },
    {
      name: 'DECISIONUNITSORT',
      type: 'esriFieldTypeInteger',
      actualType: 'int',
      alias: 'DECISIONUNITSORT',
      sqlType: 'sqlTypeInteger',
      length: 4,
      nullable: false,
      editable: false,
      domain: null,
      defaultValue: null,
    },
  ],
  supportedQueryFormats: 'JSON',
  hasStaticData: false,
  maxRecordCount: 1000,
  standardMaxRecordCount: 4000,
  tileMaxRecordCount: 4000,
  maxRecordCountFactor: 1,
  capabilities: 'Create,Delete,Query,Update,Editing,Extract,Sync',
  exceedsLimitFactor: 1,
};