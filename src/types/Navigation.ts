// types
import { LayerTypeName } from 'types/Layer';

export type AddDataFileOptions = {
  from: 'file';
  layerType?: LayerTypeName;
};

export type GoToOptions = null | AddDataFileOptions;
