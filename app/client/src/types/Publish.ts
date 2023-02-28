import { PortalLayerTypes, UrlLayerTypes } from 'types/Layer';

export type SampleTypeOption = {
  label: string;
  value: string | null;
  serviceId: string;
  status: 'add' | 'edit' | 'delete' | 'published' | 'published-ago';
};

export type SampleTypeOptions = SampleTypeOption[];

export type CodedValue = {
  id: number;
  label: string | number;
  value: string | number;
};

export type Domain = {
  type: 'range' | 'coded' | 'none';
  range: null | {
    min: number;
    max: number;
  };
  codedValues: null | CodedValue[];
};

export type AttributesType = {
  id: number;
  name: string;
  label: string;
  dataType: 'date' | 'double' | 'integer' | 'string' | 'uuid';
  length: null | number;
  domain: null | Domain;
};

export type ReferenceLayerSelections =
  | {
      id: string;
      label: string;
      layerType: PortalLayerTypes;
      type: 'arcgis';
      value: string;
    }
  | {
      id: string;
      label: string;
      layerType: string;
      type: 'url';
      urlType: UrlLayerTypes;
      value: string;
    };
