// types
import { LayerTypeName } from 'types/Layer';

type Options = {
  from?: 'file';
  layerType?: LayerTypeName;
  continuePublish?: boolean;
  continueSamplesPublish?: boolean;
};

export type GoToOptions = null | Options;
