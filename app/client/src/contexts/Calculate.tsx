/** @jsxImportSource @emotion/react */

import React, {
  createContext,
  Dispatch,
  ReactNode,
  SetStateAction,
  useEffect,
  useState,
} from 'react';
// types
import { CalculateResultsType } from 'types/CalculateResults';
import { LayerType } from 'types/Layer';

type CalculateType = {
  calculateResults: CalculateResultsType;
  setCalculateResults: Dispatch<SetStateAction<CalculateResultsType>>;
  contaminationMap: LayerType | null;
  setContaminationMap: Dispatch<SetStateAction<LayerType | null>>;
  numLabs: number;
  setNumLabs: Dispatch<SetStateAction<number>>;
  numLabHours: number;
  setNumLabHours: Dispatch<SetStateAction<number>>;
  numSamplingHours: number;
  setNumSamplingHours: Dispatch<SetStateAction<number>>;
  numSamplingPersonnel: number;
  setNumSamplingPersonnel: Dispatch<SetStateAction<number>>;
  numSamplingShifts: number;
  setNumSamplingShifts: Dispatch<SetStateAction<number>>;
  numSamplingTeams: number;
  setNumSamplingTeams: Dispatch<SetStateAction<number>>;
  samplingLaborCost: number;
  setSamplingLaborCost: Dispatch<SetStateAction<number>>;
  surfaceArea: number;
  setSurfaceArea: Dispatch<SetStateAction<number>>;
  inputNumLabs: number;
  setInputNumLabs: Dispatch<SetStateAction<number>>;
  inputNumLabHours: number;
  setInputNumLabHours: Dispatch<SetStateAction<number>>;
  inputNumSamplingHours: number;
  setInputNumSamplingHours: Dispatch<SetStateAction<number>>;
  inputNumSamplingPersonnel: number;
  setInputNumSamplingPersonnel: Dispatch<SetStateAction<number>>;
  inputNumSamplingShifts: number;
  setInputNumSamplingShifts: Dispatch<SetStateAction<number>>;
  inputNumSamplingTeams: number;
  setInputNumSamplingTeams: Dispatch<SetStateAction<number>>;
  inputSamplingLaborCost: number;
  setInputSamplingLaborCost: Dispatch<SetStateAction<number>>;
  inputSurfaceArea: number;
  setInputSurfaceArea: Dispatch<SetStateAction<number>>;
  updateContextValues: boolean;
  setUpdateContextValues: Dispatch<SetStateAction<boolean>>;
  resetCalculateContext: Function;
};

export const CalculateContext = createContext<CalculateType>({
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
  ] = useState<CalculateResultsType>({
    status: 'none',
    panelOpen: false,
    data: null,
  });
  const [
    contaminationMap,
    setContaminationMap, //
  ] = useState<LayerType | null>(null);
  const [numLabs, setNumLabs] = useState(1);
  const [numLabHours, setNumLabHours] = useState(24);
  const [numSamplingHours, setNumSamplingHours] = useState(5);
  const [numSamplingPersonnel, setNumSamplingPersonnel] = useState(3);
  const [numSamplingShifts, setNumSamplingShifts] = useState(1);
  const [numSamplingTeams, setNumSamplingTeams] = useState(1);
  const [samplingLaborCost, setSamplingLaborCost] = useState(420);
  const [surfaceArea, setSurfaceArea] = useState(0);

  // input states
  const [inputNumLabs, setInputNumLabs] = useState(numLabs);
  const [inputNumLabHours, setInputNumLabHours] = useState(numLabHours);
  const [inputSurfaceArea, setInputSurfaceArea] = useState(surfaceArea);
  const [
    inputNumSamplingHours,
    setInputNumSamplingHours, //
  ] = useState(numSamplingHours);
  const [inputNumSamplingPersonnel, setInputNumSamplingPersonnel] =
    useState(numSamplingPersonnel);
  const [
    inputNumSamplingShifts,
    setInputNumSamplingShifts, //
  ] = useState(numSamplingShifts);
  const [
    inputNumSamplingTeams,
    setInputNumSamplingTeams, //
  ] = useState(numSamplingTeams);
  const [
    inputSamplingLaborCost,
    setInputSamplingLaborCost, //
  ] = useState(samplingLaborCost);

  const [updateContextValues, setUpdateContextValues] = useState(false);

  // Updates the calculation context values with the inputs.
  // The intention is to update these values whenever the user navigates away from
  // the calculate resources tab or when they click the View Detailed Results button.
  useEffect(() => {
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
