/** @jsxImportSource @emotion/react */

import React, {
  createContext,
  Dispatch,
  ReactNode,
  SetStateAction,
  useState,
} from 'react';
import { isDecon } from 'styles';
// types
import { ServiceMetaDataType } from 'types/Edits';
import {
  AttributesType,
  ReferenceLayerSelections,
  SampleTypeOptions,
} from 'types/Publish';

type NameAvailableStatus = 'unknown' | 'yes' | 'no';

export type Selections = {
  label: string;
  value: string;
}[];

export type DefaultConfigureOutput = {
  includeAoiCharacterization: boolean;
  includeCustomSampleTypes: boolean;
  includePlan: boolean;
  includePlanWebMap: boolean;
  includePlanWebScene: boolean;
  includeStagingAreas: boolean;
  selectedAoiCharacterizations: Selections;
  selectedStagingAreas: Selections;
  webMapReferenceLayerSelections: ReferenceLayerSelections[];
  webSceneReferenceLayerSelections: ReferenceLayerSelections[];
};

const defaultConfigureOutputValue: DefaultConfigureOutput = {
  includeAoiCharacterization: false,
  includeCustomSampleTypes: false,
  includePlan: false,
  includePlanWebMap: isDecon() ? false : true,
  includePlanWebScene: isDecon() ? false : true,
  includeStagingAreas: false,
  selectedAoiCharacterizations: [],
  selectedStagingAreas: [],
  webMapReferenceLayerSelections: [],
  webSceneReferenceLayerSelections: [],
};

type PublishType = {
  publishSamplesMode: 'new' | 'existing' | '';
  setPublishSamplesMode: Dispatch<SetStateAction<'new' | 'existing' | ''>>;
  publishSampleTableMetaData: ServiceMetaDataType | null;
  setPublishSampleTableMetaData: Dispatch<
    SetStateAction<ServiceMetaDataType | null>
  >;
  sampleTableDescription: string;
  setSampleTableDescription: Dispatch<SetStateAction<string>>;
  sampleTableName: string;
  setSampleTableName: Dispatch<SetStateAction<string>>;
  sampleTypeSelections: SampleTypeOptions;
  setSampleTypeSelections: Dispatch<SetStateAction<SampleTypeOptions>>;
  sampleTableNameAvailable: NameAvailableStatus;
  setSampleTableNameAvailable: Dispatch<SetStateAction<NameAvailableStatus>>;
  selectedService: ServiceMetaDataType | null;
  setSelectedService: Dispatch<SetStateAction<ServiceMetaDataType | null>>;
  defaultConfigureOutput: DefaultConfigureOutput;
  setDefaultConfigureOutput: Dispatch<SetStateAction<DefaultConfigureOutput>>;
  manualConfigureOutput: DefaultConfigureOutput | null;
  setManualConfigureOutput: Dispatch<
    SetStateAction<DefaultConfigureOutput | null>
  >;
  webMapRefOptions: ReferenceLayerSelections[];
  setWebMapRefOptions: Dispatch<SetStateAction<ReferenceLayerSelections[]>>;
  webSceneRefOptions: ReferenceLayerSelections[];
  setWebSceneRefOptions: Dispatch<SetStateAction<ReferenceLayerSelections[]>>;
};

export const defaultPlanAttributes: AttributesType[] = [
  {
    id: 1,
    name: 'PERMANENT_IDENTIFIER',
    label: 'PERMANENT_IDENTIFIER',
    dataType: 'uuid',
    length: null,
    domain: null,
  },
  {
    id: 2,
    name: 'ID',
    label: 'ID',
    dataType: 'string',
    length: null,
    domain: null,
  },
  {
    id: 3,
    name: 'DECISIONUNITUUID',
    label: 'Layer UUID (DECISIONUNITUUID)',
    dataType: 'string',
    length: null,
    domain: null,
  },
  {
    id: 4,
    name: 'DECISIONUNIT',
    label: 'Layer (DECISIONUNIT)',
    dataType: 'string',
    length: null,
    domain: null,
  },
  {
    id: 5,
    name: 'TYPE',
    label: 'Sample Type',
    dataType: 'string',
    length: null,
    domain: null,
  },
  {
    id: 6,
    name: 'TYPEUUID',
    label: 'Sample Type UUID',
    dataType: 'string',
    length: null,
    domain: null,
  },
  {
    id: 7,
    name: 'Notes',
    label: 'Notes',
    dataType: 'string',
    length: null,
    domain: null,
  },
  {
    id: 8,
    name: 'AC',
    label: 'Equivalent TOTS Samples',
    dataType: 'integer',
    length: null,
    domain: null,
  },
  {
    id: 9,
    name: 'CREATEDDATE',
    label: 'Created Date',
    dataType: 'date',
    length: null,
    domain: null,
  },
  {
    id: 10,
    name: 'UPDATEDDATE',
    label: 'Updated Date',
    dataType: 'date',
    length: null,
    domain: null,
  },
  {
    id: 11,
    name: 'USERNAME',
    label: 'Username',
    dataType: 'string',
    length: 255,
    domain: null,
  },
];

export const defaultDeconPlanAttributes: AttributesType[] = [
  {
    id: 1,
    name: 'PERMANENT_IDENTIFIER',
    label: 'PERMANENT_IDENTIFIER',
    dataType: 'uuid',
    length: null,
    domain: null,
  },
  {
    id: 2,
    name: 'ID',
    label: 'ID',
    dataType: 'string',
    length: null,
    domain: null,
  },
  {
    id: 3,
    name: 'DECISIONUNITUUID',
    label: 'Layer UUID (DECISIONUNITUUID)',
    dataType: 'string',
    length: null,
    domain: null,
  },
  {
    id: 4,
    name: 'DECISIONUNIT',
    label: 'Layer (DECISIONUNIT)',
    dataType: 'string',
    length: null,
    domain: null,
  },
  {
    id: 5,
    name: 'TYPE',
    label: 'Decon Technology',
    dataType: 'string',
    length: null,
    domain: null,
  },
  {
    id: 6,
    name: 'TYPEUUID',
    label: 'Decon Technology UUID',
    dataType: 'string',
    length: null,
    domain: null,
  },
  {
    id: 7,
    name: 'Notes',
    label: 'Notes',
    dataType: 'string',
    length: null,
    domain: null,
  },
  {
    id: 8,
    name: 'AC',
    label: 'Equivalent TODS Decon Applications',
    dataType: 'integer',
    length: null,
    domain: null,
  },
  {
    id: 9,
    name: 'CREATEDDATE',
    label: 'Created Date',
    dataType: 'date',
    length: null,
    domain: null,
  },
  {
    id: 10,
    name: 'UPDATEDDATE',
    label: 'Updated Date',
    dataType: 'date',
    length: null,
    domain: null,
  },
  {
    id: 11,
    name: 'USERNAME',
    label: 'Username',
    dataType: 'string',
    length: 255,
    domain: null,
  },
];

export const trainingModePlanAttributes: AttributesType[] = [
  {
    id: 12,
    name: 'CONTAMTYPE',
    label: 'Contamination Type',
    dataType: 'string',
    length: null,
    domain: null,
  },
  {
    id: 13,
    name: 'CONTAMVAL',
    label: 'Activity',
    dataType: 'double',
    length: null,
    domain: null,
  },
  {
    id: 14,
    name: 'CONTAMUNIT',
    label: 'Unit of Measure',
    dataType: 'string',
    length: null,
    domain: null,
  },
];

export const PublishContext = createContext<PublishType>({
  publishSamplesMode: '',
  setPublishSamplesMode: () => {},
  publishSampleTableMetaData: null,
  setPublishSampleTableMetaData: () => {},
  sampleTableDescription: '',
  setSampleTableDescription: () => {},
  sampleTableName: '',
  setSampleTableName: () => {},
  sampleTypeSelections: [],
  setSampleTypeSelections: () => {},
  sampleTableNameAvailable: 'unknown',
  setSampleTableNameAvailable: () => {},
  selectedService: null,
  setSelectedService: () => {},
  defaultConfigureOutput: defaultConfigureOutputValue,
  setDefaultConfigureOutput: () => {},
  manualConfigureOutput: null,
  setManualConfigureOutput: () => {},
  webMapRefOptions: [],
  setWebMapRefOptions: () => {},
  webSceneRefOptions: [],
  setWebSceneRefOptions: () => {},
});

type Props = { children: ReactNode };

export function PublishProvider({ children }: Props) {
  const [publishSamplesMode, setPublishSamplesMode] = useState<
    'new' | 'existing' | ''
  >('');
  const [publishSampleTableMetaData, setPublishSampleTableMetaData] =
    useState<ServiceMetaDataType | null>(null);
  const [sampleTableDescription, setSampleTableDescription] = useState('');
  const [sampleTableName, setSampleTableName] = useState('');
  const [sampleTypeSelections, setSampleTypeSelections] =
    useState<SampleTypeOptions>([]);
  const [sampleTableNameAvailable, setSampleTableNameAvailable] =
    useState<NameAvailableStatus>('unknown');
  const [selectedService, setSelectedService] =
    useState<ServiceMetaDataType | null>(null);
  const [defaultConfigureOutput, setDefaultConfigureOutput] =
    useState<DefaultConfigureOutput>(defaultConfigureOutputValue);
  const [manualConfigureOutput, setManualConfigureOutput] =
    useState<DefaultConfigureOutput | null>(null);
  const [webMapRefOptions, setWebMapRefOptions] = useState<
    ReferenceLayerSelections[]
  >([]);
  const [webSceneRefOptions, setWebSceneRefOptions] = useState<
    ReferenceLayerSelections[]
  >([]);

  return (
    <PublishContext.Provider
      value={{
        defaultConfigureOutput,
        setDefaultConfigureOutput,
        manualConfigureOutput,
        setManualConfigureOutput,
        publishSamplesMode,
        publishSampleTableMetaData,
        sampleTableDescription,
        sampleTableName,
        sampleTableNameAvailable,
        sampleTypeSelections,
        selectedService,
        webMapRefOptions,
        webSceneRefOptions,
        setPublishSamplesMode,
        setPublishSampleTableMetaData,
        setSampleTableDescription,
        setSampleTableName,
        setSampleTableNameAvailable,
        setSampleTypeSelections,
        setSelectedService,
        setWebMapRefOptions,
        setWebSceneRefOptions,
      }}
    >
      {children}
    </PublishContext.Provider>
  );
}
