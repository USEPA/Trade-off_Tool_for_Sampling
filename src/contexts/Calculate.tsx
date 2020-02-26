/** @jsx jsx */

import React, { ReactNode } from 'react';
import { jsx } from '@emotion/core';

type ResultsDataType = {
  'Total Number of Samples': string;
  'Time to Prepare Kits': string;
  'Time to Collect': string;
  'Time to Analyze': string;
  'Total Time': string;
  'Material Cost': string;
  'Waste Volume': string;
  'Waste Weight': string;
  'User Specified Number of Available Teams for Sampling': string;
  'User Specified Personnel per Sampling Team': string;
  'User Specified Sampling Team Hours per Shift': string;
  'User Specified Sampling Team Shifts per Day': string;
  'Sampling Hours per Day': string;
  'Sampling Personnel hours per Day': string;
  'User Specified Sampling Team Labor Cost': string;
  'Sampling Personnel Labor Cost': string;
  'Time to Complete Sampling': string;
  'Total Sampling Labor Cost': string;
  'User Specified Number of Available Labs for Analysis': string;
  'User Specified Analysis Lab Hours per Day': string;
  'Time to Complete Analyses': string;
};

type ResultsType = {
  status: string;
  data: ResultsDataType | null;
};

type CalculateType = {
  calculateResults: ResultsType;
  setCalculateResults: Function;
};

export const CalculateContext = React.createContext<CalculateType>({
  calculateResults: { status: 'none', data: null },
  setCalculateResults: () => {},
});

type Props = { children: ReactNode };

export function CalculateProvider({ children }: Props) {
  const [
    calculateResults,
    setCalculateResults, //
  ] = React.useState<ResultsType>({ status: 'none', data: null });

  return (
    <CalculateContext.Provider
      value={{
        calculateResults,
        setCalculateResults,
      }}
    >
      {children}
    </CalculateContext.Provider>
  );
}
