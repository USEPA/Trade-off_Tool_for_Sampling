// types
import { LayerTypeName } from 'types/Layer';

export type AppType = 'decon' | 'sampling';

export type LayerTypeOption = {
  label: string;
  type?: 'category';
  value: string;
};

export type LocationType =
  | { value: 'search'; label: 'Search for Layers' }
  | { value: 'url'; label: 'Add Layer from Web' }
  | { value: 'file'; label: 'Add Layer from File' };

type Options = {
  from?: LocationType['value'];
  layerType?: LayerTypeName;
  layerTypesAgo?: LayerTypeOption[];
  continuePublish?: boolean;
  continueSamplesPublish?: boolean;
};

export type GoToOptions = null | Options;
