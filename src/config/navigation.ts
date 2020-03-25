export type PanelValueType =
  | 'search'
  | 'addData'
  | 'locateSamples'
  | 'calculate'
  | 'publish';

export type PanelType = {
  value: PanelValueType;
  label: string;
  iconClass: string;
};

export const panels: PanelType[] = [
  {
    value: 'search',
    label: 'Search',
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
    value: 'publish',
    label: 'Publish Plan',
    iconClass: 'fas fa-upload',
  },
];
