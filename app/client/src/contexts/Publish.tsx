/** @jsx jsx */

import React, { ReactNode } from 'react';
import { jsx } from '@emotion/core';
// types
import { ServiceMetaDataType } from 'types/Edits';
import { SampleTypeOptions } from 'types/Publish';

type PublishType = {
  publishSamplesMode: 'new' | 'existing' | '';
  setPublishSamplesMode: React.Dispatch<
    React.SetStateAction<'new' | 'existing' | ''>
  >;
  sampleTableDescription: string;
  setSampleTableDescription: React.Dispatch<React.SetStateAction<string>>;
  sampleTableName: string;
  setSampleTableName: React.Dispatch<React.SetStateAction<string>>;
  sampleTypeSelections: SampleTypeOptions;
  setSampleTypeSelections: React.Dispatch<
    React.SetStateAction<SampleTypeOptions>
  >;
  selectedService: ServiceMetaDataType | null;
  setSelectedService: React.Dispatch<
    React.SetStateAction<ServiceMetaDataType | null>
  >;
};

export const PublishContext = React.createContext<PublishType>({
  publishSamplesMode: '',
  setPublishSamplesMode: () => {},
  sampleTableDescription: '',
  setSampleTableDescription: () => {},
  sampleTableName: '',
  setSampleTableName: () => {},
  sampleTypeSelections: [],
  setSampleTypeSelections: () => {},
  selectedService: null,
  setSelectedService: () => {},
});

type Props = { children: ReactNode };

export function PublishProvider({ children }: Props) {
  const [publishSamplesMode, setPublishSamplesMode] = React.useState<
    'new' | 'existing' | ''
  >('');
  const [sampleTableDescription, setSampleTableDescription] = React.useState(
    '',
  );
  const [sampleTableName, setSampleTableName] = React.useState('');
  const [sampleTypeSelections, setSampleTypeSelections] = React.useState<
    SampleTypeOptions
  >([]);
  const [
    selectedService,
    setSelectedService,
  ] = React.useState<ServiceMetaDataType | null>(null);

  return (
    <PublishContext.Provider
      value={{
        publishSamplesMode,
        setPublishSamplesMode,
        sampleTableDescription,
        setSampleTableDescription,
        sampleTableName,
        setSampleTableName,
        sampleTypeSelections,
        setSampleTypeSelections,
        selectedService,
        setSelectedService,
      }}
    >
      {children}
    </PublishContext.Provider>
  );
}
