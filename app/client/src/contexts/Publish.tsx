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
  sampleTypeSelections: SampleTypeOptions;
  setSampleTypeSelections: React.Dispatch<
    React.SetStateAction<SampleTypeOptions>
  >;
  sampleTableMetaData: ServiceMetaDataType | null;
  setSampleTableMetaData: React.Dispatch<
    React.SetStateAction<ServiceMetaDataType | null>
  >;
};

export const PublishContext = React.createContext<PublishType>({
  publishSamplesMode: '',
  setPublishSamplesMode: () => {},
  sampleTypeSelections: [],
  setSampleTypeSelections: () => {},
  sampleTableMetaData: null,
  setSampleTableMetaData: () => {},
});

type Props = { children: ReactNode };

export function PublishProvider({ children }: Props) {
  const [publishSamplesMode, setPublishSamplesMode] = React.useState<
    'new' | 'existing' | ''
  >('');
  const [sampleTypeSelections, setSampleTypeSelections] = React.useState<
    SampleTypeOptions
  >([]);
  const [
    sampleTableMetaData,
    setSampleTableMetaData,
  ] = React.useState<ServiceMetaDataType | null>(null);

  return (
    <PublishContext.Provider
      value={{
        publishSamplesMode,
        setPublishSamplesMode,
        sampleTypeSelections,
        setSampleTypeSelections,
        sampleTableMetaData,
        setSampleTableMetaData,
      }}
    >
      {children}
    </PublishContext.Provider>
  );
}
