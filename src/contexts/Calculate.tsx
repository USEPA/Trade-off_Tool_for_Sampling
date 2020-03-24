/** @jsx jsx */

import React, { ReactNode } from 'react';
import { jsx } from '@emotion/core';
// types
import { CalculateResultsType } from 'types/CalculateResults';
import { LayerType } from 'types/Layer';
// utils
import { readFromStorage, writeToStorage } from 'utils/hooks';

type CalculateSettingsType = {
  numLabs: number;
  numLabHours: number;
  numSamplingHours: number;
  numSamplingPersonnel: number;
  numSamplingShifts: number;
  numSamplingTeams: number;
  samplingLaborCost: number;
  surfaceArea: number;
};

type CalculateType = {
  calculateResults: CalculateResultsType;
  setCalculateResults: React.Dispatch<
    React.SetStateAction<CalculateResultsType>
  >;
  contaminationMap: LayerType | null;
  setContaminationMap: React.Dispatch<React.SetStateAction<LayerType | null>>;
  numLabs: number;
  setNumLabs: React.Dispatch<React.SetStateAction<number>>;
  numLabHours: number;
  setNumLabHours: React.Dispatch<React.SetStateAction<number>>;
  numSamplingHours: number;
  setNumSamplingHours: React.Dispatch<React.SetStateAction<number>>;
  numSamplingPersonnel: number;
  setNumSamplingPersonnel: React.Dispatch<React.SetStateAction<number>>;
  numSamplingShifts: number;
  setNumSamplingShifts: React.Dispatch<React.SetStateAction<number>>;
  numSamplingTeams: number;
  setNumSamplingTeams: React.Dispatch<React.SetStateAction<number>>;
  samplingLaborCost: number;
  setSamplingLaborCost: React.Dispatch<React.SetStateAction<number>>;
  surfaceArea: number;
  setSurfaceArea: React.Dispatch<React.SetStateAction<number>>;
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

  // Reads the calculate settings from session storage.
  React.useEffect(() => {
    const settingsStr = readFromStorage('tots_calculate_settings');

    if (!settingsStr) return;
    const settings: CalculateSettingsType = JSON.parse(settingsStr);

    setNumLabs(settings.numLabs);
    setNumLabHours(settings.numLabHours);
    setNumSamplingHours(settings.numSamplingHours);
    setNumSamplingPersonnel(settings.numSamplingPersonnel);
    setNumSamplingShifts(settings.numSamplingShifts);
    setNumSamplingTeams(settings.numSamplingTeams);
    setSamplingLaborCost(settings.samplingLaborCost);
    setSurfaceArea(settings.surfaceArea);
  }, []);

  // Saves the calculate settings to session storage
  React.useEffect(() => {
    const settings: CalculateSettingsType = {
      numLabs,
      numLabHours,
      numSamplingHours,
      numSamplingPersonnel,
      numSamplingShifts,
      numSamplingTeams,
      samplingLaborCost,
      surfaceArea,
    };

    writeToStorage('tots_calculate_settings', settings);
  }, [
    numLabs,
    numLabHours,
    numSamplingHours,
    numSamplingPersonnel,
    numSamplingShifts,
    numSamplingTeams,
    samplingLaborCost,
    surfaceArea,
  ]);

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
