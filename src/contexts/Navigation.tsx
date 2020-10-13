/** @jsx jsx */

import React, { ReactNode } from 'react';
import { jsx } from '@emotion/core';
// config
import { PanelType, PanelValueType } from 'config/navigation';
// types
import { GoToOptions } from 'types/Navigation';

var globalTrainingMode = false;

type NavigateType = {
  currentPanel: PanelType | null;
  setCurrentPanel: React.Dispatch<React.SetStateAction<PanelType | null>>;
  goTo: PanelValueType | '';
  setGoTo: React.Dispatch<React.SetStateAction<PanelValueType | ''>>;
  goToOptions: GoToOptions;
  setGoToOptions: React.Dispatch<React.SetStateAction<GoToOptions>>;
  latestStepIndex: number;
  setLatestStepIndex: React.Dispatch<React.SetStateAction<number>>;
  panelExpanded: boolean;
  setPanelExpanded: React.Dispatch<React.SetStateAction<boolean>>;
  resultsExpanded: boolean;
  setResultsExpanded: React.Dispatch<React.SetStateAction<boolean>>;
  tablePanelExpanded: boolean;
  setTablePanelExpanded: React.Dispatch<React.SetStateAction<boolean>>;
  tablePanelHeight: number;
  setTablePanelHeight: React.Dispatch<React.SetStateAction<number>>;
  trainingMode: boolean;
  setTrainingMode: React.Dispatch<React.SetStateAction<boolean>>;
  getTrainingMode: Function;
  gettingStartedOpen: boolean;
  setGettingStartedOpen: Function;
};

export const NavigationContext = React.createContext<NavigateType>({
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
  const [currentPanel, setCurrentPanel] = React.useState<PanelType | null>(
    null,
  );
  const [goTo, setGoTo] = React.useState<PanelValueType | ''>('');
  const [goToOptions, setGoToOptions] = React.useState<GoToOptions>(null);
  const [latestStepIndex, setLatestStepIndex] = React.useState(-1);
  const [panelExpanded, setPanelExpanded] = React.useState(false);
  const [resultsExpanded, setResultsExpanded] = React.useState(false);
  const [tablePanelExpanded, setTablePanelExpanded] = React.useState(false);
  const [tablePanelHeight, setTablePanelHeight] = React.useState(200);
  const [trainingMode, setTrainingMode] = React.useState(false);
  const [gettingStartedOpen, setGettingStartedOpen] = React.useState(false);

  // Syncs up the widgetsTrainingMode with the trainingMode context variable.
  // This is so the context variable can be used within esri events
  React.useEffect(() => {
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
