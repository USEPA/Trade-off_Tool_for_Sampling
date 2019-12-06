/** @jsx jsx */

import React from 'react';
import { jsx, css } from '@emotion/core';
// contexts
import { EsriModulesContext } from 'contexts/EsriModules';

const loginBarStyles = css`
  display: flex;
  justify-content: flex-end;
  padding: 8px;
  padding-right: 0;
`;

const loginButtonStyles = css`
  margin-bottom: 0;
  padding: 0.75em 1em;
  color: black;
  background-color: white;
  border-radius: 0;

  &:hover {
    background-color: #f0f0f0;
  }

  i {
    margin-right: 0.5em;
  }
`;

function LoginBar() {
  const { IdentityManager, OAuthInfo } = React.useContext(EsriModulesContext);

  // Initialize the OAuth
  const [oAuthInfo, setOAuthInfo] = React.useState<any>(null);
  React.useEffect(() => {
    if (!IdentityManager || !OAuthInfo || oAuthInfo) return;

    const info = new OAuthInfo({
      // Swap this ID out with registered application ID
      // TODO: We need to get the app id that will be using for development and or production
      appId: 'q244Lb8gDRgWQ8hM',
      // Uncomment the next line and update if using your own portal
      // portalUrl: "https://<host>:<port>/arcgis"
      // Uncomment the next line to prevent the user's signed in state from being shared with other apps on the same domain with the same authNamespace value.
      // authNamespace: "portal_oauth_inline",
      popup: false,
    });
    IdentityManager.registerOAuthInfos([info]);

    setOAuthInfo(info);
  }, [IdentityManager, OAuthInfo, oAuthInfo]);

  // Check the user's sign in status
  const [hasCheckedSignInStatus, setHasCheckedSignInStatus] = React.useState(
    false,
  );
  const [signedIn, setSignedIn] = React.useState(false);
  React.useEffect(() => {
    if (!IdentityManager || !oAuthInfo || hasCheckedSignInStatus) return;

    setHasCheckedSignInStatus(true);
    IdentityManager.checkSignInStatus(`${oAuthInfo.portalUrl}/sharing`)
      .then(() => {
        setSignedIn(true);
      })
      .catch(() => {
        setSignedIn(false);
      });
  }, [IdentityManager, oAuthInfo, hasCheckedSignInStatus]);

  return (
    <div css={loginBarStyles}>
      {oAuthInfo && IdentityManager && (
        <React.Fragment>
          {!signedIn && (
            <button
              css={loginButtonStyles}
              onClick={(ev) => {
                IdentityManager.getCredential(`${oAuthInfo.portalUrl}/sharing`);
              }}
            >
              <i className="fas fa-sign-in-alt"></i>
              Login
            </button>
          )}
          {signedIn && (
            <button
              css={loginButtonStyles}
              onClick={(ev) => {
                IdentityManager.destroyCredentials();
                window.location.reload();
              }}
            >
              <i className="fas fa-sign-out-alt"></i>
              Logout
            </button>
          )}
        </React.Fragment>
      )}
    </div>
  );
}

export default LoginBar;
