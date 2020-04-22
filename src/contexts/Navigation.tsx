/** @jsx jsx */

import React, { ReactNode } from 'react';
import { jsx } from '@emotion/core';
// config
import { PanelType, PanelValueType } from 'config/navigation';
// types
import { GoToOptions } from 'types/Navigation';

type NavigateType = {
  currentPanel: PanelType | null;
  setCurrentPanel: React.Dispatch<React.SetStateAction<PanelType | null>>;
  goTo: PanelValueType | '';
  setGoTo: React.Dispatch<React.SetStateAction<PanelValueType | ''>>;
  goToOptions: GoToOptions;
  setGoToOptions: React.Dispatch<React.SetStateAction<GoToOptions>>;
};

export const NavigationContext = React.createContext<NavigateType>({
  currentPanel: null,
  setCurrentPanel: () => {},
  goTo: '',
  setGoTo: () => {},
  goToOptions: null,
  setGoToOptions: () => {},
});

type Props = { children: ReactNode };

export function NavigationProvider({ children }: Props) {
  const [currentPanel, setCurrentPanel] = React.useState<PanelType | null>(
    null,
  );
  const [goTo, setGoTo] = React.useState<PanelValueType | ''>('');
  const [goToOptions, setGoToOptions] = React.useState<GoToOptions>(null);

  return (
    <NavigationContext.Provider
      value={{
        currentPanel,
        setCurrentPanel,
        goTo,
        setGoTo,
        goToOptions,
        setGoToOptions,
      }}
    >
      {children}
    </NavigationContext.Provider>
  );
}
