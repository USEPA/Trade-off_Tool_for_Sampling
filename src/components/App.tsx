// emotion @jsx pragma docs: https://emotion.sh/docs/css-prop#jsx-pragma
/** @jsx jsx */

import React from 'react';
import { Global, jsx, css } from '@emotion/core';
import { useWindowSize } from '@reach/window-size';
// components
import AlertDialog from 'components/AlertDialog';
import ErrorBoundary from 'components/ErrorBoundary';
import NavBar from 'components/NavBar';
import Toolbar from 'components/Toolbar';
import SplashScreen from 'components/SplashScreen';
import TestingToolbar from 'components/TestingToolbar';
import Map from 'components/Map';
// contexts
import { AuthenticationProvider } from 'contexts/Authentication';
import { CalculateProvider } from 'contexts/Calculate';
import { DialogProvider, DialogContext } from 'contexts/Dialog';
import { NavigationProvider } from 'contexts/Navigation';
import { SketchProvider } from 'contexts/Sketch';
import { EsriModulesProvider } from 'contexts/EsriModules';
// utilities
import { useSessionStorage } from 'utils/hooks';
import { isIE } from 'utils/utils';
// config
import { epaMarginOffset, navPanelWidth } from 'config/appConfig';
import { unsupportedBrowserMessage } from 'config/errorMessages';
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

const errorContainerStyles = css`
  margin: 10px;
`;

const appStyles = (offset: number) => css`
  display: flex;
  flex-direction: column;
  height: calc(100vh - ${offset}px);
  width: calc(100% + ${epaMarginOffset * 2 + 'px'});
  margin-left: -${epaMarginOffset}px;
`;

const containerStyles = css`
  height: 100%;
`;

const mapPanelStyles = css`
  float: right;
  position: relative;
  height: 100%;
  width: calc(100% - ${navPanelWidth});
`;

function App() {
  useSessionStorage();

  const { height, width } = useWindowSize();

  // calculate height of div holding actions info
  const [contentHeight, setContentHeight] = React.useState(0);
  const mapRef = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    if (!mapRef?.current) return;

    const mapHeight = mapRef.current.getBoundingClientRect().height;
    if (contentHeight !== mapHeight) setContentHeight(mapHeight);
  }, [width, height, mapRef, contentHeight]);

  // calculate height of div holding actions info
  const [toolbarHeight, setToolbarHeight] = React.useState(0);
  const toolbarRef = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    if (!toolbarRef?.current) return;

    const barHeight = toolbarRef.current.getBoundingClientRect().height;
    if (toolbarHeight !== barHeight) setToolbarHeight(barHeight);
  }, [width, height, toolbarRef, toolbarHeight]);

  const [
    sizeCheckInitialized,
    setSizeCheckInitialized, //
  ] = React.useState(false);
  const { setOptions } = React.useContext(DialogContext);
  React.useEffect(() => {
    if (sizeCheckInitialized) return;

    if (width < 1024 || height < 600) {
      setOptions({
        title: '',
        ariaLabel: 'Small Screen Warning',
        description:
          'This site contains data uploading and map editing features best used in a desktop web browser.',
      });
    }

    setSizeCheckInitialized(true);
  }, [width, height, sizeCheckInitialized, setOptions]);

  const totsRef = React.useRef<HTMLDivElement>(null);
  const [offset, setOffset] = React.useState(0);
  React.useEffect(() => {
    if (!totsRef?.current) return;

    setOffset(totsRef.current.getBoundingClientRect().top);
  }, [totsRef]);

  return (
    <React.Fragment>
      <Global styles={gloablStyles} />

      <div className="tots" ref={totsRef}>
        <ErrorBoundary>
          {isIE() ? (
            <div css={errorContainerStyles}>{unsupportedBrowserMessage}</div>
          ) : (
            <React.Fragment>
              <SplashScreen />
              <AlertDialog />
              {window.location.search.includes('devMode=true') && (
                <TestingToolbar />
              )}
              <div css={appStyles(offset)}>
                <div css={containerStyles}>
                  <div ref={toolbarRef}>
                    <Toolbar />
                  </div>
                  <NavBar height={contentHeight - toolbarHeight} />
                  <div css={mapPanelStyles} ref={mapRef}>
                    {toolbarHeight && <Map height={toolbarHeight} />}
                  </div>
                </div>
              </div>
            </React.Fragment>
          )}
        </ErrorBoundary>
      </div>
    </React.Fragment>
  );
}

export default function AppContainer() {
  return (
    <EsriModulesProvider>
      <DialogProvider>
        <AuthenticationProvider>
          <CalculateProvider>
            <NavigationProvider>
              <SketchProvider>
                <App />
              </SketchProvider>
            </NavigationProvider>
          </CalculateProvider>
        </AuthenticationProvider>
      </DialogProvider>
    </EsriModulesProvider>
  );
}
