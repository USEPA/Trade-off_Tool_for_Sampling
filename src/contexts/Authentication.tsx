/** @jsx jsx */

import React, { ReactNode } from 'react';
import { jsx } from '@emotion/core';

type AuthenticationType = {
  signedIn: boolean;
  setSignedIn: React.Dispatch<React.SetStateAction<boolean>>;
  oAuthInfo: __esri.OAuthInfo | null;
  setOAuthInfo: React.Dispatch<React.SetStateAction<__esri.OAuthInfo | null>>;
  portal: __esri.Portal | null;
  setPortal: React.Dispatch<React.SetStateAction<__esri.Portal | null>>;
  userInfo: any;
  setUserInfo: React.Dispatch<React.SetStateAction<any>>;
};

export const AuthenticationContext = React.createContext<AuthenticationType>({
  signedIn: false,
  setSignedIn: () => {},
  oAuthInfo: null,
  setOAuthInfo: () => {},
  portal: null,
  setPortal: () => {},
  userInfo: null,
  setUserInfo: () => {},
});

type Props = { children: ReactNode };

export function AuthenticationProvider({ children }: Props) {
  const [signedIn, setSignedIn] = React.useState(false);
  const [
    oAuthInfo,
    setOAuthInfo, //
  ] = React.useState<__esri.OAuthInfo | null>(null);
  const [portal, setPortal] = React.useState<__esri.Portal | null>(null);
  const [userInfo, setUserInfo] = React.useState<any>(null);

  return (
    <AuthenticationContext.Provider
      value={{
        signedIn,
        setSignedIn,
        oAuthInfo,
        setOAuthInfo,
        portal,
        setPortal,
        userInfo,
        setUserInfo,
      }}
    >
      {children}
    </AuthenticationContext.Provider>
  );
}
