/** @jsx jsx */

import React, { ReactNode } from 'react';
import { jsx } from '@emotion/core';

type AuthenticationType = {
  signedIn: boolean;
  setSignedIn: Function;
  oAuthInfo: __esri.OAuthInfo | null;
  setOAuthInfo: Function;
  portal: __esri.Portal | null;
  setPortal: Function;
};

export const AuthenticationContext = React.createContext<AuthenticationType>({
  signedIn: false,
  setSignedIn: () => {},
  oAuthInfo: null,
  setOAuthInfo: () => {},
  portal: null,
  setPortal: () => {},
});

type Props = { children: ReactNode };

export function AuthenticationProvider({ children }: Props) {
  const [signedIn, setSignedIn] = React.useState(false);
  const [
    oAuthInfo,
    setOAuthInfo, //
  ] = React.useState<__esri.OAuthInfo | null>(null);
  const [portal, setPortal] = React.useState<__esri.Portal | null>(null);

  return (
    <AuthenticationContext.Provider
      value={{
        signedIn,
        setSignedIn,
        oAuthInfo,
        setOAuthInfo,
        portal,
        setPortal,
      }}
    >
      {children}
    </AuthenticationContext.Provider>
  );
}
