/** @jsx jsx */

import React, { ReactNode } from 'react';
import { jsx } from '@emotion/core';
// config
import { PanelValueType } from 'config/navigation';
// types
import { LayerTypeName } from 'types/Layer';

type AddDataFileOptions = {
  from: 'file';
  layerType?: LayerTypeName;
};

type GoToOptions = null | AddDataFileOptions;

type NavigateType = {
  goTo: PanelValueType | '';
  setGoTo: React.Dispatch<React.SetStateAction<PanelValueType | ''>>;
  goToOptions: GoToOptions;
  setGoToOptions: React.Dispatch<React.SetStateAction<GoToOptions>>;
};

export const NavigationContext = React.createContext<NavigateType>({
  goTo: '',
  setGoTo: () => {},
  goToOptions: null,
  setGoToOptions: () => {},
});

type Props = { children: ReactNode };

export function NavigationProvider({ children }: Props) {
  const [goTo, setGoTo] = React.useState<PanelValueType | ''>('');
  const [goToOptions, setGoToOptions] = React.useState<GoToOptions>(null);

  return (
    <NavigationContext.Provider
      value={{
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
