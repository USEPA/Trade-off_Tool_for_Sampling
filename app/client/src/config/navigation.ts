export type PanelValueType =
  | 'search'
  | 'addData'
  | 'locateSamples'
  | 'calculate'
  | 'configureOutput'
  | 'publish';

export type PanelType = {
  value: PanelValueType;
  label: string;
  iconClass: string;
};

export const panels: PanelType[] = [
  {
    value: 'search',
    label: 'Locate',
    iconClass: 'fas fa-search',
  },
  {
    value: 'addData',
    label: 'Add Data',
    iconClass: 'fas fa-layer-group',
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
