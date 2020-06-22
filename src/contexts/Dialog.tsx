/** @jsx jsx */

import React, { ReactNode } from 'react';
import { jsx } from '@emotion/core';

export type AlertDialogOptions = {
  title: string;
  ariaLabel: string;
  description: string;
  onContinue?: Function;
};

type DialogType = {
  options: AlertDialogOptions | null;
  setOptions: React.Dispatch<React.SetStateAction<AlertDialogOptions | null>>;
};

export const DialogContext = React.createContext<DialogType>({
  options: null,
  setOptions: () => {},
});

type Props = { children: ReactNode };

export function DialogProvider({ children }: Props) {
  const [options, setOptions] = React.useState<AlertDialogOptions | null>(null);

  return (
    <DialogContext.Provider
      value={{
        options,
        setOptions,
      }}
    >
      {children}
    </DialogContext.Provider>
  );
}
