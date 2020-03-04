/** @jsx jsx */

import React, { ReactNode } from 'react';
import { jsx } from '@emotion/core';
// types
import { CalculateResultsType } from 'types/CalculateResults';
import { LayerType } from 'types/Layer';

type CalculateType = {
  calculateResults: CalculateResultsType;
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
  calculateResults: { status: 'none', panelOpen: false, data: null },
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
  ] = React.useState<CalculateResultsType>({
    status: 'none',
    panelOpen: false,
    data: null,
  });
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
