/** @jsxImportSource @emotion/react */

import React, {
  createContext,
  Dispatch,
  ReactNode,
  SetStateAction,
  useState,
} from 'react';
// types
import { CalculateResultsType } from 'types/CalculateResults';
import { LayerType } from 'types/Layer';

export type CalculateType = {
  calculateResults: CalculateResultsType;
  setCalculateResults: Dispatch<SetStateAction<CalculateResultsType>>;
  contaminationMap: LayerType | null;
  setContaminationMap: Dispatch<SetStateAction<LayerType | null>>;
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

export const settingDefaults = {
  NUM_LABS: 1,
  NUM_LAB_HOURS: 24,
  NUM_SAMPLING_HOURS: 5,
  NUM_SAMPLING_PERSONNEL: 3,
  NUM_SAMPLING_SHIFTS: 1,
  NUM_SAMPLING_TEAMS: 1,
  SAMPLING_LABOR_COST: 420,
  SURFACE_AREA: 0,
};

export const CalculateContext = createContext<CalculateType>({
  calculateResults: { status: 'none', panelOpen: false, data: null },
  setCalculateResults: () => {},
  contaminationMap: null,
  setContaminationMap: () => {},
  inputNumLabs: settingDefaults.NUM_LABS,
  setInputNumLabs: () => {},
  inputNumLabHours: settingDefaults.NUM_LAB_HOURS,
  setInputNumLabHours: () => {},
  inputNumSamplingHours: settingDefaults.NUM_SAMPLING_HOURS,
  setInputNumSamplingHours: () => {},
  inputNumSamplingPersonnel: settingDefaults.NUM_SAMPLING_PERSONNEL,
  setInputNumSamplingPersonnel: () => {},
  inputNumSamplingShifts: settingDefaults.NUM_SAMPLING_SHIFTS,
  setInputNumSamplingShifts: () => {},
  inputNumSamplingTeams: settingDefaults.NUM_SAMPLING_TEAMS,
  setInputNumSamplingTeams: () => {},
  inputSamplingLaborCost: settingDefaults.SAMPLING_LABOR_COST,
  setInputSamplingLaborCost: () => {},
  inputSurfaceArea: settingDefaults.SURFACE_AREA,
  setInputSurfaceArea: () => {},
  updateContextValues: false,
  setUpdateContextValues: () => {},
  resetCalculateContext: () => {},
});

type Props = { children: ReactNode };

export function CalculateProvider({ children }: Props) {
  const [calculateResults, setCalculateResults] =
    useState<CalculateResultsType>({
      status: 'none',
      panelOpen: false,
      data: null,
    });
  const [contaminationMap, setContaminationMap] = useState<LayerType | null>(
    null,
  );

  // input states
  const [inputNumLabs, setInputNumLabs] = useState(settingDefaults.NUM_LABS);
  const [inputNumLabHours, setInputNumLabHours] = useState(
    settingDefaults.NUM_LAB_HOURS,
  );
  const [inputSurfaceArea, setInputSurfaceArea] = useState(
    settingDefaults.SURFACE_AREA,
  );
  const [inputNumSamplingHours, setInputNumSamplingHours] = useState(
    settingDefaults.NUM_SAMPLING_HOURS,
  );
  const [inputNumSamplingPersonnel, setInputNumSamplingPersonnel] = useState(
    settingDefaults.NUM_SAMPLING_PERSONNEL,
  );
  const [inputNumSamplingShifts, setInputNumSamplingShifts] = useState(
    settingDefaults.NUM_SAMPLING_SHIFTS,
  );
  const [inputNumSamplingTeams, setInputNumSamplingTeams] = useState(
    settingDefaults.NUM_SAMPLING_TEAMS,
  );
  const [inputSamplingLaborCost, setInputSamplingLaborCost] = useState(
    settingDefaults.SAMPLING_LABOR_COST,
  );

  const [updateContextValues, setUpdateContextValues] = useState(false);

  return (
    <CalculateContext.Provider
      value={{
        calculateResults,
        setCalculateResults,
        contaminationMap,
        setContaminationMap,
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

          setInputNumLabs(settingDefaults.NUM_LABS);
          setInputNumLabHours(settingDefaults.NUM_LAB_HOURS);
          setInputNumSamplingHours(settingDefaults.NUM_SAMPLING_HOURS);
          setInputNumSamplingPersonnel(settingDefaults.NUM_SAMPLING_PERSONNEL);
          setInputNumSamplingShifts(settingDefaults.NUM_SAMPLING_SHIFTS);
          setInputNumSamplingTeams(settingDefaults.NUM_SAMPLING_TEAMS);
          setInputSamplingLaborCost(settingDefaults.SAMPLING_LABOR_COST);
          setInputSurfaceArea(settingDefaults.SURFACE_AREA);
        },
      }}
    >
      {children}
    </CalculateContext.Provider>
  );
}
