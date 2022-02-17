/** @jsxImportSource @emotion/react */

import React, {
  createContext,
  Dispatch,
  ReactNode,
  SetStateAction,
  useState,
} from 'react';

export type AlertDialogOptions = {
  title: string;
  ariaLabel: string;
  description: string;
  onContinue?: Function;
  onCancel?: Function;
};

type DialogType = {
  options: AlertDialogOptions | null;
  setOptions: Dispatch<SetStateAction<AlertDialogOptions | null>>;
};

export const DialogContext = createContext<DialogType>({
  options: null,
  setOptions: () => {},
});

type Props = { children: ReactNode };

export function DialogProvider({ children }: Props) {
  const [options, setOptions] = useState<AlertDialogOptions | null>(null);

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
