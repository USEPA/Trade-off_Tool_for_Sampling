export const notesCharacterLimit = 2000;

export const defaultFields = [
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
    name: 'TYPEUUID',
    type: 'esriFieldTypeString',
    alias: 'TYPEUUID',
    sqlType: 'sqlTypeNVarchar',
    length: 255,
    nullable: true,
    editable: true,
    domain: null,
    defaultValue: '',
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
    name: 'POINT_STYLE',
    type: 'esriFieldTypeString',
    actualType: 'nvarchar',
    alias: 'POINT_STYLE',
    sqlType: 'sqlTypeNVarchar',
    length: 1000,
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
    length: notesCharacterLimit,
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
    nullable: true,
    editable: false,
    domain: null,
    defaultValue: 0,
  },
  {
    name: 'TESTCOMBO',
    type: 'esriFieldTypeString',
    actualType: 'nvarchar',
    alias: 'Test Combo',
    sqlType: 'sqlTypeNVarchar',
    length: 255,
    nullable: true,
    editable: true,
    domain: {
      type: 'codedValue',
      name: 'TESTCOMBODOMAIN',
      codedValues: [
        { name: 'Yes', code: 'yes' },
        { name: 'No', code: 'no' },
      ],
    },
    defaultValue: null,
  },
  {
    name: 'TESTCOMBOINT',
    type: 'esriFieldTypeInteger',
    actualType: 'int',
    alias: 'Test Combo Integer',
    sqlType: 'sqlTypeInteger',
    length: 4,
    nullable: true,
    editable: true,
    domain: {
      type: 'codedValue',
      name: 'TESTCOMBODOMAININT',
      codedValues: [
        { name: 'Yes', code: 1 },
        { name: 'No', code: 0 },
      ],
    },
    defaultValue: null,
  },
  {
    name: 'TESTRANGE',
    type: 'esriFieldTypeInteger',
    actualType: 'int',
    alias: 'Test Combo Integer',
    sqlType: 'sqlTypeInteger',
    length: 4,
    nullable: true,
    editable: true,
    domain: {
      type: 'range',
      name: 'TESTCOMBODOMAINRANGE',
      range: [1, 6],
    },
    defaultValue: null,
  },
];

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
  supportedQueryFormats: 'JSON',
  hasStaticData: false,
  maxRecordCount: 1000,
  standardMaxRecordCount: 4000,
  tileMaxRecordCount: 4000,
  maxRecordCountFactor: 1,
  capabilities: 'Create,Delete,Query,Update,Editing,Extract,Sync',
  exceedsLimitFactor: 1,
};

export const defaultTableProps = {
  type: 'Table',
  editFieldsInfo: {
    creationDateField: 'CREATEDDATE',
    creatorField: 'USERNAME',
    editDateField: 'UPDATEDDATE',
  },
  editingInfo: {
    lastEditDate: 1455126059440,
  },
  // geometryType: 'esriGeometryPolygon',
  minScale: 0,
  maxScale: 0,
  allowGeometryUpdates: false,
  hasAttachments: false,
  htmlPopupType: 'esriServerHTMLPopupTypeNone',
  hasM: false,
  hasZ: false,
  objectIdField: 'OBJECTID',
  globalIdField: 'GLOBALID',
  supportedQueryFormats: 'JSON',
  hasStaticData: false,
  maxRecordCount: 1000,
  standardMaxRecordCount: 4000,
  tileMaxRecordCount: 4000,
  maxRecordCountFactor: 1,
  capabilities: 'Create,Delete,Query,Update,Editing,Extract,Sync',
  exceedsLimitFactor: 1,
};

export const webMapFieldProps = {
  OBJECTID: {
    fieldName: 'OBJECTID',
    label: 'OBJECTID',
    visible: false,
  },
  PERMANENT_IDENTIFIER: {
    fieldName: 'PERMANENT_IDENTIFIER',
    label: 'PERMANENT_IDENTIFIER',
    visible: false,
  },
  AA: {
    fieldName: 'AA',
    format: {
      digitSeparator: true,
      places: 2,
    },
    isEditable: false,
    label: 'Actual Surface Area (sq inch)',
    visible: true,
  },
  AC: {
    fieldName: 'AC',
    format: {
      digitSeparator: true,
      places: 2,
    },
    isEditable: false,
    label: 'Equivalent TOTS Samples',
    visible: true,
  },
  ALC: {
    fieldName: 'ALC',
    format: {
      digitSeparator: true,
      places: 2,
    },
    isEditable: false,
    label: 'Analysis Labor Cost',
    visible: true,
  },
  AMC: {
    fieldName: 'AMC',
    format: {
      digitSeparator: true,
      places: 2,
    },
    isEditable: false,
    label: 'Analysis Material Cost',
    visible: true,
  },
  CONTAMTYPE: {
    fieldName: 'CONTAMTYPE',
    isEditable: false,
    label: 'Contamination Type',
    visible: true,
  },
  CONTAMUNIT: {
    fieldName: 'CONTAMUNIT',
    isEditable: false,
    label: 'Unit of Measure',
    visible: true,
  },
  CONTAMVAL: {
    fieldName: 'CONTAMVAL',
    format: {
      digitSeparator: true,
      places: 2,
    },
    isEditable: false,
    label: 'Activity',
    visible: true,
  },
  CREATEDDATE: {
    fieldName: 'CREATEDDATE',
    format: {
      dateFormat: 'longMonthDayYear',
      digitSeparator: false,
    },
    label: 'CREATEDDATE',
    visible: true,
  },
  DECISIONUNIT: {
    fieldName: 'DECISIONUNIT',
    isEditable: false,
    label: 'Layer',
    visible: true,
  },
  DECISIONUNITSORT: {
    fieldName: 'DECISIONUNITSORT',
    format: {
      digitSeparator: true,
      places: 0,
    },
    label: 'DECISIONUNITSORT',
    visible: true,
  },
  GLOBALID: {
    fieldName: 'GLOBALID',
    label: 'GlobalID',
    visible: false,
  },
  LOD_NON: {
    fieldName: 'LOD_NON',
    format: {
      digitSeparator: true,
      places: 2,
    },
    isEditable: false,
    label: 'Limit of Detection (CFU) Nonporous',
    visible: true,
  },
  LOD_P: {
    fieldName: 'LOD_P',
    format: {
      digitSeparator: true,
      places: 2,
    },
    isEditable: false,
    label: 'Limit of Detection (CFU) Porous',
    visible: true,
  },
  MCPS: {
    fieldName: 'MCPS',
    format: {
      digitSeparator: true,
      places: 2,
    },
    isEditable: false,
    label: 'Sampling Material Cost ($/sample)',
    visible: true,
  },
  Notes: {
    fieldName: 'Notes',
    isEditable: false,
    label: 'Notes',
    visible: true,
  },
  ORGANIZATION: {
    fieldName: 'ORGANIZATION',
    label: 'ORGANIZATION',
    visible: true,
  },
  POINT_STYLE: {
    fieldName: 'POINT_STYLE',
    isEditable: false,
    label: 'POINT_STYLE',
    visible: true,
  },
  SA: {
    fieldName: 'SA',
    format: {
      digitSeparator: true,
      places: 2,
    },
    isEditable: false,
    label: 'Reference Surface Area (sq inch)',
    visible: true,
  },
  ShapeType: {
    fieldName: 'ShapeType',
    isEditable: false,
    label: 'ShapeType',
    visible: false,
  },
  TCPS: {
    fieldName: 'TCPS',
    format: {
      digitSeparator: true,
      places: 2,
    },
    isEditable: false,
    label: 'Total Cost per Sample',
    visible: true,
  },
  TTA: {
    fieldName: 'TTA',
    format: {
      digitSeparator: true,
      places: 2,
    },
    isEditable: false,
    label: 'Time to Analyze (person hrs/sample)',
    visible: true,
  },
  TTC: {
    fieldName: 'TTC',
    format: {
      digitSeparator: true,
      places: 2,
    },
    isEditable: false,
    label: 'Time to Collect (person hrs/sample)',
    visible: true,
  },
  TTPK: {
    fieldName: 'TTPK',
    format: {
      digitSeparator: true,
      places: 2,
    },
    isEditable: false,
    label: 'Time to Prepare Kits (person hrs/sample)',
    visible: true,
  },
  TTPS: {
    fieldName: 'TTPS',
    format: {
      digitSeparator: true,
      places: 2,
    },
    isEditable: false,
    label: 'Total Time per Sample',
    visible: true,
  },
  TYPE: {
    fieldName: 'TYPE',
    isEditable: false,
    label: 'Sample Type',
    visible: true,
  },
  TYPEUUID: {
    fieldName: 'TYPEUUID',
    isEditable: false,
    label: 'TYPEUUID',
    visible: true,
  },
  UPDATEDDATE: {
    fieldName: 'UPDATEDDATE',
    format: {
      dateFormat: 'longMonthDayYear',
      digitSeparator: false,
    },
    label: 'UPDATEDDATE',
    visible: true,
  },
  USERNAME: {
    fieldName: 'USERNAME',
    label: 'USERNAME',
    visible: true,
  },
  Width: {
    fieldName: 'Width',
    format: {
      digitSeparator: true,
      places: 2,
    },
    isEditable: false,
    label: 'Width',
    visible: true,
  },
  WVPS: {
    fieldName: 'WVPS',
    format: {
      digitSeparator: true,
      places: 2,
    },
    isEditable: false,
    label: 'Waste Volume per Sample',
    visible: true,
  },
  WWPS: {
    fieldName: 'WWPS',
    format: {
      digitSeparator: true,
      places: 2,
    },
    isEditable: false,
    label: 'Waste Weight per Sample',
    visible: true,
  },
};
