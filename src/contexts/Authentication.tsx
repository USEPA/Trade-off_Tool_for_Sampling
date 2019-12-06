/** @jsx jsx */

import React, { ReactNode } from 'react';
import { jsx } from '@emotion/core';

type AuthenticationType = {
  signedIn: boolean;
  setSignedIn: Function;
  oAuthInfo: any;
  setOAuthInfo: Function;
};

// --- components ---
export const AuthenticationContext = React.createContext<AuthenticationType>({
  signedIn: false,
  setSignedIn: () => {},
  oAuthInfo: null,
  setOAuthInfo: () => {},
});

type Props = { children: ReactNode };

export function AuthenticationProvider({ children }: Props) {
  const [signedIn, setSignedIn] = React.useState(false);
  const [oAuthInfo, setOAuthInfo] = React.useState<any>(null);

  return (
    <AuthenticationContext.Provider
      value={{ signedIn, setSignedIn, oAuthInfo, setOAuthInfo }}
    >
      {children}
    </AuthenticationContext.Provider>
  );
}
