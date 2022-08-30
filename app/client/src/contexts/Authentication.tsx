/** @jsxImportSource @emotion/react */

import React, {
  createContext,
  Dispatch,
  ReactNode,
  SetStateAction,
  useState,
} from 'react';

type AuthenticationType = {
  signedIn: boolean;
  setSignedIn: Dispatch<SetStateAction<boolean>>;
  oAuthInfo: __esri.OAuthInfo | null;
  setOAuthInfo: Dispatch<SetStateAction<__esri.OAuthInfo | null>>;
  portal: __esri.Portal | null;
  setPortal: Dispatch<SetStateAction<__esri.Portal | null>>;
  userInfo: any;
  setUserInfo: Dispatch<SetStateAction<any>>;
};

export const AuthenticationContext = createContext<AuthenticationType>({
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
  const [signedIn, setSignedIn] = useState(false);
  const [
    oAuthInfo,
    setOAuthInfo, //
  ] = useState<__esri.OAuthInfo | null>(null);
  const [portal, setPortal] = useState<__esri.Portal | null>(null);
  const [userInfo, setUserInfo] = useState<any>(null);

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
