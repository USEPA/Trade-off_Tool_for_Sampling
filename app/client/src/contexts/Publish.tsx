/** @jsxImportSource @emotion/react */

import React, {
  createContext,
  Dispatch,
  ReactNode,
  SetStateAction,
  useState,
} from 'react';
// types
import { ServiceMetaDataType } from 'types/Edits';
import { AttributesType, SampleTypeOptions } from 'types/Publish';

type NameAvailableStatus = 'unknown' | 'yes' | 'no';

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
  includeFullPlan: boolean;
  setIncludeFullPlan: Dispatch<SetStateAction<boolean>>;
  includeFullPlanWebMap: boolean;
  setIncludeFullPlanWebMap: Dispatch<SetStateAction<boolean>>;
  includePartialPlan: boolean;
  setIncludePartialPlan: Dispatch<SetStateAction<boolean>>;
  includePartialPlanWebMap: boolean;
  setIncludePartialPlanWebMap: Dispatch<SetStateAction<boolean>>;
  includePartialPlanWebScene: boolean;
  setIncludePartialPlanWebScene: Dispatch<SetStateAction<boolean>>;
  includeCustomSampleTypes: boolean;
  setIncludeCustomSampleTypes: Dispatch<SetStateAction<boolean>>;
  partialPlanAttributes: AttributesType[];
  setPartialPlanAttributes: Dispatch<SetStateAction<AttributesType[]>>;
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
  includeFullPlan: false,
  setIncludeFullPlan: () => {},
  includeFullPlanWebMap: true,
  setIncludeFullPlanWebMap: () => {},
  includePartialPlan: true,
  setIncludePartialPlan: () => {},
  includePartialPlanWebMap: true,
  setIncludePartialPlanWebMap: () => {},
  includePartialPlanWebScene: true,
  setIncludePartialPlanWebScene: () => {},
  includeCustomSampleTypes: false,
  setIncludeCustomSampleTypes: () => {},
  partialPlanAttributes: [],
  setPartialPlanAttributes: () => {},
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
  const [includeFullPlan, setIncludeFullPlan] = useState(false);
  const [includeFullPlanWebMap, setIncludeFullPlanWebMap] = useState(true);
  const [includePartialPlan, setIncludePartialPlan] = useState(true);
  const [includePartialPlanWebMap, setIncludePartialPlanWebMap] =
    useState(true);
  const [includePartialPlanWebScene, setIncludePartialPlanWebScene] =
    useState(true);
  const [includeCustomSampleTypes, setIncludeCustomSampleTypes] =
    useState(false);
  const [partialPlanAttributes, setPartialPlanAttributes] = useState<
    AttributesType[]
  >(defaultPlanAttributes);

  return (
    <PublishContext.Provider
      value={{
        publishSamplesMode,
        setPublishSamplesMode,
        publishSampleTableMetaData,
        setPublishSampleTableMetaData,
        sampleTableDescription,
        setSampleTableDescription,
        sampleTableName,
        setSampleTableName,
        sampleTypeSelections,
        setSampleTypeSelections,
        sampleTableNameAvailable,
        setSampleTableNameAvailable,
        selectedService,
        setSelectedService,
        includeFullPlan,
        setIncludeFullPlan,
        includeFullPlanWebMap,
        setIncludeFullPlanWebMap,
        includePartialPlan,
        setIncludePartialPlan,
        includePartialPlanWebMap,
        setIncludePartialPlanWebMap,
        includePartialPlanWebScene,
        setIncludePartialPlanWebScene,
        includeCustomSampleTypes,
        setIncludeCustomSampleTypes,
        partialPlanAttributes,
        setPartialPlanAttributes,
      }}
    >
      {children}
    </PublishContext.Provider>
  );
}
