/** @jsxImportSource @emotion/react */

import React, {
  createContext,
  Dispatch,
  ReactNode,
  SetStateAction,
  useEffect,
  useState,
} from 'react';
// config
import { PanelType, PanelValueType } from 'config/navigation';
// types
import { GoToOptions } from 'types/Navigation';

var globalTrainingMode = false;

type NavigateType = {
  currentPanel: PanelType | null;
  setCurrentPanel: Dispatch<SetStateAction<PanelType | null>>;
  goTo: PanelValueType | '';
  setGoTo: Dispatch<SetStateAction<PanelValueType | ''>>;
  goToOptions: GoToOptions;
  setGoToOptions: Dispatch<SetStateAction<GoToOptions>>;
  latestStepIndex: number;
  setLatestStepIndex: Dispatch<SetStateAction<number>>;
  panelExpanded: boolean;
  setPanelExpanded: Dispatch<SetStateAction<boolean>>;
  resultsExpanded: boolean;
  setResultsExpanded: Dispatch<SetStateAction<boolean>>;
  tablePanelExpanded: boolean;
  setTablePanelExpanded: Dispatch<SetStateAction<boolean>>;
  tablePanelHeight: number;
  setTablePanelHeight: Dispatch<SetStateAction<number>>;
  trainingMode: boolean;
  setTrainingMode: Dispatch<SetStateAction<boolean>>;
  getTrainingMode: Function;
  gettingStartedOpen: boolean;
  setGettingStartedOpen: Function;
};

export const NavigationContext = createContext<NavigateType>({
  currentPanel: null,
  setCurrentPanel: () => {},
  goTo: '',
  setGoTo: () => {},
  goToOptions: null,
  setGoToOptions: () => {},
  latestStepIndex: -1,
  setLatestStepIndex: () => {},
  panelExpanded: false,
  setPanelExpanded: () => {},
  resultsExpanded: false,
  setResultsExpanded: () => {},
  tablePanelExpanded: false,
  setTablePanelExpanded: () => {},
  tablePanelHeight: 200,
  setTablePanelHeight: () => {},
  trainingMode: false,
  setTrainingMode: () => {},
  getTrainingMode: () => {},
  gettingStartedOpen: false,
  setGettingStartedOpen: () => {},
});

type Props = { children: ReactNode };

export function NavigationProvider({ children }: Props) {
  const [currentPanel, setCurrentPanel] = useState<PanelType | null>(null);
  const [goTo, setGoTo] = useState<PanelValueType | ''>('');
  const [goToOptions, setGoToOptions] = useState<GoToOptions>(null);
  const [latestStepIndex, setLatestStepIndex] = useState(-1);
  const [panelExpanded, setPanelExpanded] = useState(false);
  const [resultsExpanded, setResultsExpanded] = useState(false);
  const [tablePanelExpanded, setTablePanelExpanded] = useState(false);
  const [tablePanelHeight, setTablePanelHeight] = useState(200);
  const [trainingMode, setTrainingMode] = useState(false);
  const [gettingStartedOpen, setGettingStartedOpen] = useState(false);

  // Syncs up the widgetsTrainingMode with the trainingMode context variable.
  // This is so the context variable can be used within esri events
  useEffect(() => {
    globalTrainingMode = trainingMode;
  }, [trainingMode]);

  return (
    <NavigationContext.Provider
      value={{
        currentPanel,
        setCurrentPanel,
        goTo,
        setGoTo,
        goToOptions,
        setGoToOptions,
        latestStepIndex,
        setLatestStepIndex,
        panelExpanded,
        setPanelExpanded,
        resultsExpanded,
        setResultsExpanded,
        tablePanelExpanded,
        setTablePanelExpanded,
        tablePanelHeight,
        setTablePanelHeight,
        trainingMode,
        setTrainingMode,
        getTrainingMode: () => {
          return globalTrainingMode;
        },
        gettingStartedOpen,
        setGettingStartedOpen,
      }}
    >
      {children}
    </NavigationContext.Provider>
  );
}
