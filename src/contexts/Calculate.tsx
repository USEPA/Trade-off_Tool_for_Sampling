/** @jsx jsx */

import React, { ReactNode } from 'react';
import { jsx } from '@emotion/core';
// types
import { LayerType } from 'types/Layer';

type ResultsDataType = {
  'Total Number of User-Defined Samples': string;
  'Total Number of Samples': string;
  'Total Cost': string;
  'Total Time': string;
  'Limiting Time Factor': string;
  'Total Sampled Area': string;
  'User Specified Total AOI': string;
  'Percent of Area Sampled': string;
  'User Specified Number of Available Teams for Sampling': string;
  'User Specified Personnel per Sampling Team': string;
  'User Specified Sampling Team Hours per Shift': string;
  'User Specified Sampling Team Shifts per Day': string;
  'Sampling Hours per Day': string;
  'Sampling Personnel hours per Day': string;
  'User Specified Sampling Team Labor Cost': string;
  'Time to Prepare Kits': string;
  'Time to Collect': string;
  'Material Cost': string;
  'Sampling Personnel Labor Cost': string;
  'Time to Complete Sampling': string;
  'Total Sampling Labor Cost': string;
  'User Specified Number of Available Labs for Analysis': string;
  'User Specified Analysis Lab Hours per Day': string;
  'Time to Complete Analyses': string;
  'Time to Analyze': string;
  'Analysis Labor Cost': string;
  'Analysis Material Cost': string;
  'Waste Volume': string;
  'Waste Weight': string;
};

type ResultsType = {
  status: string;
  data: ResultsDataType | null;
};

type CalculateType = {
  calculateResults: ResultsType;
  setCalculateResults: Function;
  contaminationMap: LayerType | null;
  setContaminationMap: Function;
};

export const CalculateContext = React.createContext<CalculateType>({
  calculateResults: { status: 'none', data: null },
  setCalculateResults: () => {},
  contaminationMap: null,
  setContaminationMap: () => {},
});

type Props = { children: ReactNode };

export function CalculateProvider({ children }: Props) {
  const [
    calculateResults,
    setCalculateResults, //
  ] = React.useState<ResultsType>({ status: 'none', data: null });
  const [
    contaminationMap,
    setContaminationMap, //
  ] = React.useState<LayerType | null>(null);

  return (
    <CalculateContext.Provider
      value={{
        calculateResults,
        setCalculateResults,
        contaminationMap,
        setContaminationMap,
      }}
    >
      {children}
    </CalculateContext.Provider>
  );
}
