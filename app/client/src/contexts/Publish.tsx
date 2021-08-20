/** @jsxImportSource @emotion/react */

import React, { ReactNode } from 'react';
// types
import { ServiceMetaDataType } from 'types/Edits';
import { AttributesType, SampleTypeOptions } from 'types/Publish';

type NameAvailableStatus = 'unknown' | 'yes' | 'no';

type PublishType = {
  publishSamplesMode: 'new' | 'existing' | '';
  setPublishSamplesMode: React.Dispatch<
    React.SetStateAction<'new' | 'existing' | ''>
  >;
  publishSampleTableMetaData: ServiceMetaDataType | null;
  setPublishSampleTableMetaData: React.Dispatch<
    React.SetStateAction<ServiceMetaDataType | null>
  >;
  sampleTableDescription: string;
  setSampleTableDescription: React.Dispatch<React.SetStateAction<string>>;
  sampleTableName: string;
  setSampleTableName: React.Dispatch<React.SetStateAction<string>>;
  sampleTypeSelections: SampleTypeOptions;
  setSampleTypeSelections: React.Dispatch<
    React.SetStateAction<SampleTypeOptions>
  >;
  sampleTableNameAvailable: NameAvailableStatus;
  setSampleTableNameAvailable: React.Dispatch<
    React.SetStateAction<NameAvailableStatus>
  >;
  selectedService: ServiceMetaDataType | null;
  setSelectedService: React.Dispatch<
    React.SetStateAction<ServiceMetaDataType | null>
  >;
  includeFullPlan: boolean;
  setIncludeFullPlan: React.Dispatch<React.SetStateAction<boolean>>;
  includeFullPlanWebMap: boolean;
  setIncludeFullPlanWebMap: React.Dispatch<React.SetStateAction<boolean>>;
  includePartialPlan: boolean;
  setIncludePartialPlan: React.Dispatch<React.SetStateAction<boolean>>;
  includePartialPlanWebMap: boolean;
  setIncludePartialPlanWebMap: React.Dispatch<React.SetStateAction<boolean>>;
  includeCustomSampleTypes: boolean;
  setIncludeCustomSampleTypes: React.Dispatch<React.SetStateAction<boolean>>;
  partialPlanAttributes: AttributesType[];
  setPartialPlanAttributes: React.Dispatch<
    React.SetStateAction<AttributesType[]>
  >;
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

export const PublishContext = React.createContext<PublishType>({
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
  includeFullPlan: true,
  setIncludeFullPlan: () => {},
  includeFullPlanWebMap: true,
  setIncludeFullPlanWebMap: () => {},
  includePartialPlan: false,
  setIncludePartialPlan: () => {},
  includePartialPlanWebMap: true,
  setIncludePartialPlanWebMap: () => {},
  includeCustomSampleTypes: false,
  setIncludeCustomSampleTypes: () => {},
  partialPlanAttributes: [],
  setPartialPlanAttributes: () => {},
});

type Props = { children: ReactNode };

export function PublishProvider({ children }: Props) {
  const [publishSamplesMode, setPublishSamplesMode] = React.useState<
    'new' | 'existing' | ''
  >('');
  const [
    publishSampleTableMetaData,
    setPublishSampleTableMetaData,
  ] = React.useState<ServiceMetaDataType | null>(null);
  const [sampleTableDescription, setSampleTableDescription] = React.useState(
    '',
  );
  const [sampleTableName, setSampleTableName] = React.useState('');
  const [
    sampleTypeSelections,
    setSampleTypeSelections,
  ] = React.useState<SampleTypeOptions>([]);
  const [
    sampleTableNameAvailable,
    setSampleTableNameAvailable,
  ] = React.useState<NameAvailableStatus>('unknown');
  const [
    selectedService,
    setSelectedService,
  ] = React.useState<ServiceMetaDataType | null>(null);
  const [includeFullPlan, setIncludeFullPlan] = React.useState(true);
  const [includeFullPlanWebMap, setIncludeFullPlanWebMap] = React.useState(
    true,
  );
  const [includePartialPlan, setIncludePartialPlan] = React.useState(false);
  const [
    includePartialPlanWebMap,
    setIncludePartialPlanWebMap,
  ] = React.useState(true);
  const [
    includeCustomSampleTypes,
    setIncludeCustomSampleTypes,
  ] = React.useState(false);
  const [partialPlanAttributes, setPartialPlanAttributes] = React.useState<
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
