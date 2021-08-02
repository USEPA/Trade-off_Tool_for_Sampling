/** @jsxImportSource @emotion/react */

import React, { ReactNode } from 'react';
// types
import { CalculateResultsType } from 'types/CalculateResults';
import { LayerType } from 'types/Layer';

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
  inputNumLabs: number;
  setInputNumLabs: React.Dispatch<React.SetStateAction<number>>;
  inputNumLabHours: number;
  setInputNumLabHours: React.Dispatch<React.SetStateAction<number>>;
  inputNumSamplingHours: number;
  setInputNumSamplingHours: React.Dispatch<React.SetStateAction<number>>;
  inputNumSamplingPersonnel: number;
  setInputNumSamplingPersonnel: React.Dispatch<React.SetStateAction<number>>;
  inputNumSamplingShifts: number;
  setInputNumSamplingShifts: React.Dispatch<React.SetStateAction<number>>;
  inputNumSamplingTeams: number;
  setInputNumSamplingTeams: React.Dispatch<React.SetStateAction<number>>;
  inputSamplingLaborCost: number;
  setInputSamplingLaborCost: React.Dispatch<React.SetStateAction<number>>;
  inputSurfaceArea: number;
  setInputSurfaceArea: React.Dispatch<React.SetStateAction<number>>;
  updateContextValues: boolean;
  setUpdateContextValues: React.Dispatch<React.SetStateAction<boolean>>;
  resetCalculateContext: Function;
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
  surfaceArea: 0,
  setSurfaceArea: () => {},
  inputNumLabs: 1,
  setInputNumLabs: () => {},
  inputNumLabHours: 24,
  setInputNumLabHours: () => {},
  inputNumSamplingHours: 5,
  setInputNumSamplingHours: () => {},
  inputNumSamplingPersonnel: 3,
  setInputNumSamplingPersonnel: () => {},
  inputNumSamplingShifts: 1,
  setInputNumSamplingShifts: () => {},
  inputNumSamplingTeams: 1,
  setInputNumSamplingTeams: () => {},
  inputSamplingLaborCost: 420,
  setInputSamplingLaborCost: () => {},
  inputSurfaceArea: 0,
  setInputSurfaceArea: () => {},
  updateContextValues: false,
  setUpdateContextValues: () => {},
  resetCalculateContext: () => {},
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
  const [surfaceArea, setSurfaceArea] = React.useState(0);

  // input states
  const [inputNumLabs, setInputNumLabs] = React.useState(numLabs);
  const [inputNumLabHours, setInputNumLabHours] = React.useState(numLabHours);
  const [inputSurfaceArea, setInputSurfaceArea] = React.useState(surfaceArea);
  const [
    inputNumSamplingHours,
    setInputNumSamplingHours, //
  ] = React.useState(numSamplingHours);
  const [
    inputNumSamplingPersonnel,
    setInputNumSamplingPersonnel,
  ] = React.useState(numSamplingPersonnel);
  const [
    inputNumSamplingShifts,
    setInputNumSamplingShifts, //
  ] = React.useState(numSamplingShifts);
  const [
    inputNumSamplingTeams,
    setInputNumSamplingTeams, //
  ] = React.useState(numSamplingTeams);
  const [
    inputSamplingLaborCost,
    setInputSamplingLaborCost, //
  ] = React.useState(samplingLaborCost);

  const [updateContextValues, setUpdateContextValues] = React.useState(false);

  // Updates the calculation context values with the inputs.
  // The intention is to update these values whenever the user navigates away from
  // the calculate resources tab or when they click the View Detailed Results button.
  React.useEffect(() => {
    if (!updateContextValues) return;

    setUpdateContextValues(false);

    setNumLabs(inputNumLabs);
    setNumLabHours(inputNumLabHours);
    setNumSamplingHours(inputNumSamplingHours);
    setNumSamplingPersonnel(inputNumSamplingPersonnel);
    setNumSamplingShifts(inputNumSamplingShifts);
    setNumSamplingTeams(inputNumSamplingTeams);
    setSamplingLaborCost(inputSamplingLaborCost);
    setSurfaceArea(inputSurfaceArea);
  }, [
    inputNumLabs,
    inputNumLabHours,
    inputNumSamplingHours,
    inputNumSamplingPersonnel,
    inputNumSamplingShifts,
    inputNumSamplingTeams,
    inputSamplingLaborCost,
    inputSurfaceArea,
    updateContextValues,
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
        inputNumLabs,
        setInputNumLabs,
        inputNumLabHours,
        setInputNumLabHours,
        inputNumSamplingHours,
        setInputNumSamplingHours,
        inputNumSamplingPersonnel,
        setInputNumSamplingPersonnel,
        inputNumSamplingShifts,
        setInputNumSamplingShifts,
        inputNumSamplingTeams,
        setInputNumSamplingTeams,
        inputSamplingLaborCost,
        setInputSamplingLaborCost,
        inputSurfaceArea,
        setInputSurfaceArea,
        updateContextValues,
        setUpdateContextValues,
        resetCalculateContext: () => {
          setCalculateResults({
            status: 'none',
            panelOpen: false,
            data: null,
          });
          setContaminationMap(null);

          setNumLabs(1);
          setNumLabHours(24);
          setNumSamplingHours(5);
          setNumSamplingPersonnel(3);
          setNumSamplingShifts(1);
          setNumSamplingTeams(1);
          setSamplingLaborCost(420);
          setSurfaceArea(0);

          setInputNumLabs(1);
          setInputNumLabHours(24);
          setInputNumSamplingHours(5);
          setInputNumSamplingPersonnel(3);
          setInputNumSamplingShifts(1);
          setInputNumSamplingTeams(1);
          setInputSamplingLaborCost(420);
          setInputSurfaceArea(0);
        },
      }}
    >
      {children}
    </CalculateContext.Provider>
  );
}
