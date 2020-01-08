// emotion @jsx pragma docs: https://emotion.sh/docs/css-prop#jsx-pragma
/** @jsx jsx */

import React from 'react';
import { Global, jsx, css } from '@emotion/core';
// components
import LoginBar from 'components/LoginBar';
import SplashScreen from 'components/SplashScreen';
import Toolbar from 'components/Toolbar';
import Map from 'components/Map';
// contexts
import { AuthenticationProvider } from 'contexts/Authentication';
import {
  EsriModulesProvider,
  useEsriModulesContext,
} from 'contexts/EsriModules';
// styles
import '@reach/dialog/styles.css';
const gloablStyles = css`
  html {
    /* overwrite EPA's html font-size so rem units are based on 16px */
    font-size: 100%;
  }

  body {
    margin: 0;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto',
      'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans',
      'Helvetica Neue', sans-serif;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;

    /* re-apply EPA's html element font-size, just scoped to the body element */
    font-size: 106.25%;
  }

  .tots {
    /* revert back to 16px font-size on our application code itself */
    font-size: 1rem;
  }
`;

const appStyles = css`
  display: flex;
  flex-direction: column;
  border: 1px solid #ccc;
  height: calc(100vh - 32px);
  max-height: 600px;
`;

function App() {
  const { modulesLoaded } = useEsriModulesContext();

  if (!modulesLoaded) return <p>Loading...</p>;

  return (
    <React.Fragment>
      <Global styles={gloablStyles} />
      <LoginBar />

      <div className="tots">
        <SplashScreen />{' '}
        <div css={appStyles}>
          <Toolbar />
          <Map />
        </div>
      </div>
    </React.Fragment>
  );
}

export default function AppContainer() {
  return (
    <EsriModulesProvider>
      <AuthenticationProvider>
        <App />
      </AuthenticationProvider>
    </EsriModulesProvider>
  );
}
