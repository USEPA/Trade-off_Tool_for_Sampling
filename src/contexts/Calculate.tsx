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
  numLabs: number;
  setNumLabs: Function;
  numLabHours: number;
  setNumLabHours: Function;
  numSamplingHours: number;
  setNumSamplingHours: Function;
  numSamplingPersonnel: number;
  setNumSamplingPersonnel: Function;
  numSamplingShifts: number;
  setNumSamplingShifts: Function;
  numSamplingTeams: number;
  setNumSamplingTeams: Function;
  samplingLaborCost: number;
  setSamplingLaborCost: Function;
  surfaceArea: number;
  setSurfaceArea: Function;
};

export const CalculateContext = React.createContext<CalculateType>({
  calculateResults: { status: 'none', data: null },
  setCalculateResults: () => {},
  contaminationMap: null,
  setContaminationMap: () => {},
  numLabs: 1,
  setNumLabs: () => {},
  numLabHours: 24,
  setNumLabHours: () => {},
  numSamplingHours: 5,
  setNumSamplingHours: () => {},
  numSamplingPersonnel: 3,
  setNumSamplingPersonnel: () => {},
  numSamplingShifts: 1,
  setNumSamplingShifts: () => {},
  numSamplingTeams: 1,
  setNumSamplingTeams: () => {},
  samplingLaborCost: 420,
  setSamplingLaborCost: () => {},
  surfaceArea: 7400,
  setSurfaceArea: () => {},
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
  const [numLabs, setNumLabs] = React.useState(1);
  const [numLabHours, setNumLabHours] = React.useState(24);
  const [numSamplingHours, setNumSamplingHours] = React.useState(5);
  const [numSamplingPersonnel, setNumSamplingPersonnel] = React.useState(3);
  const [numSamplingShifts, setNumSamplingShifts] = React.useState(1);
  const [numSamplingTeams, setNumSamplingTeams] = React.useState(1);
  const [samplingLaborCost, setSamplingLaborCost] = React.useState(420);
  const [surfaceArea, setSurfaceArea] = React.useState(7400);

  return (
    <CalculateContext.Provider
      value={{
        calculateResults,
        setCalculateResults,
        contaminationMap,
        setContaminationMap,
        numLabs,
        setNumLabs,
        numLabHours,
        setNumLabHours,
        numSamplingHours,
        setNumSamplingHours,
        numSamplingPersonnel,
        setNumSamplingPersonnel,
        numSamplingShifts,
        setNumSamplingShifts,
        numSamplingTeams,
        setNumSamplingTeams,
        samplingLaborCost,
        setSamplingLaborCost,
        surfaceArea,
        setSurfaceArea,
      }}
    >
      {children}
    </CalculateContext.Provider>
  );
}
