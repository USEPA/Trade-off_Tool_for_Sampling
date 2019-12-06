// emotion @jsx pragma docs: https://emotion.sh/docs/css-prop#jsx-pragma
/** @jsx jsx */

import React from 'react';
import { Global, jsx, css } from '@emotion/core';
// components
import LoginBar from 'components/LoginBar';
import Toolbar from 'components/Toolbar';
import Map from 'components/Map';
// contexts
import { EsriModulesProvider, EsriModulesContext } from 'contexts/EsriModules';

const gloablStyles = css`
  body {
    margin: 0;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto',
      'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans',
      'Helvetica Neue', sans-serif;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
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
  const { modulesLoaded } = React.useContext(EsriModulesContext);

  if (!modulesLoaded) return <span>Loading...</span>;

  return (
    <React.Fragment>
      <Global styles={gloablStyles} />
      <LoginBar />
      <div css={appStyles}>
        <Toolbar />
        <Map />
      </div>
    </React.Fragment>
  );
}

export default function AppContainer() {
  return (
    <EsriModulesProvider>
      <App />
    </EsriModulesProvider>
  );
}
