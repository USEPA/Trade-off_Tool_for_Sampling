import { LayerTypeOption } from 'types/Navigation';

export const isDecon = () => window.location.pathname === '/decon';

export const samplingPanels: PanelType[] = [
  {
    value: 'addData',
    label: 'Add Data',
    iconClass: 'fas fa-layer-group',
  },
  {
    value: 'additionalTools',
    label: 'Additional Tools',
    iconClass: 'fas fa-wrench',
  },
  {
    value: 'locateSamples',
    label: 'Create Plan',
    iconClass: 'fas fa-thumbtack',
  },
  {
    value: 'calculate',
    label: 'Calculate Resources',
    iconClass: 'fas fa-calculator',
  },
  {
    value: 'configureOutput',
    label: 'Configure Output',
    iconClass: 'fas fa-cog',
  },
  {
    value: 'publish',
    label: 'Publish Output',
    iconClass: 'fas fa-upload',
  },
];

export const deconPanels: PanelType[] = [
  {
    value: 'addData',
    label: 'Add Data',
    iconClass: 'fas fa-layer-group',
  },
  {
    value: 'additionalTools',
    label: 'Additional Tools',
    iconClass: 'fas fa-wrench',
  },
  {
    value: 'decon',
    label: 'Create Decon Plan',
    iconClass: 'fas fa-thumbtack',
  },
  {
    value: 'calculate',
    label: 'Calculate Resources',
    iconClass: 'fas fa-calculator',
  },
  {
    value: 'configureOutput',
    label: 'Configure Output',
    iconClass: 'fas fa-cog',
  },
  {
    value: 'publish',
    label: 'Publish Output',
    iconClass: 'fas fa-upload',
  },
];

const layerTypeOptionsSampling: LayerTypeOption[] = [
  {
    label: 'TOTS Sampling Plans',
    type: 'category',
    value: 'contains-epa-tots-sample-layer',
  },
  {
    label: 'TOTS Custom Sample Types',
    type: 'category',
    value: 'contains-epa-tots-user-defined-sample-types',
  },
  {
    label: 'TOTS/TODS AOI Characterizations',
    type: 'category',
    value: 'contains-epa-tots-aoi-characterization',
  },
  {
    label: 'TOTS/TODS Staging Areas',
    type: 'category',
    value: 'contains-epa-tots-staging-area',
  },
  {
    label: 'TODS Decon Plans',
    type: 'category',
    value: 'contains-epa-tods-decon-layer',
  },
];

const layerTypeOptionsDecon: LayerTypeOption[] = [
  {
    label: 'TODS Decon Plans',
    type: 'category',
    value: 'contains-epa-tods-decon-layer',
  },
  {
    label: 'TOTS/TODS AOI Characterizations',
    type: 'category',
    value: 'contains-epa-tots-aoi-characterization',
  },
  {
    label: 'TOTS/TODS Staging Areas',
    type: 'category',
    value: 'contains-epa-tots-staging-area',
  },
  // {
  //   label: 'TODS Custom Decon Technologies',
  //   type: 'category',
  //   value: 'contains-epa-tods-user-defined-decon-tech',
  // },
  {
    label: 'TOTS Sampling Plans',
    type: 'category',
    value: 'contains-epa-tots-sample-layer',
  },
];

const layerTypeOptionsBase: LayerTypeOption[] = [
  { label: 'Feature Service', value: 'Feature Service' },
  { label: 'Image Service', value: 'Image Service' },
  { label: 'KML', value: 'KML' },
  { label: 'Map Service', value: 'Map Service' },
  { label: 'Scene Service (3D)', value: 'Scene Service' },
  {
    label: 'Vector Tile Service',
    value: 'Vector Tile Service',
  },
  { label: 'WMS', value: 'WMS' },
];

export const layerTypeOptions = [
  ...(isDecon() ? layerTypeOptionsDecon : layerTypeOptionsSampling),
  ...layerTypeOptionsBase,
];

export type PanelValueType =
  | 'addData'
  | 'additionalTools'
  | 'locateSamples'
  | 'decon'
  | 'calculate'
  | 'configureOutput'
  | 'publish';

export type PanelType = {
  value: PanelValueType;
  label: string;
  iconClass: string;
};
