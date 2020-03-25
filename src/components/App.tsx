// emotion @jsx pragma docs: https://emotion.sh/docs/css-prop#jsx-pragma
/** @jsx jsx */

import React from 'react';
import { Global, jsx, css } from '@emotion/core';
import { useWindowSize } from '@reach/window-size';
import { DialogOverlay, DialogContent } from '@reach/dialog';
// components
import NavBar from 'components/NavBar';
import Toolbar from 'components/Toolbar';
import SplashScreen from 'components/SplashScreen';
import TestingToolbar from 'components/TestingToolbar';
import Map from 'components/Map';
// contexts
import { AuthenticationProvider } from 'contexts/Authentication';
import { CalculateProvider } from 'contexts/Calculate';
import { NavigationProvider } from 'contexts/Navigation';
import { SketchProvider } from 'contexts/Sketch';
import { EsriModulesProvider } from 'contexts/EsriModules';
// utilities
import { useSessionStorage } from 'utils/hooks';
// config
import { epaMarginOffset, navPanelWidth } from 'config/appConfig';
// styles
import '@reach/dialog/styles.css';
import { colors } from 'styles';

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
  height: calc(100vh);
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

const overlayStyles = css`
  &[data-reach-dialog-overlay] {
    z-index: 1000;
    background-color: ${colors.black(0.75)};
  }
`;

const dialogStyles = css`
  color: ${colors.white()};
  background-color: ${colors.epaBlue};

  &[data-reach-dialog-content] {
    position: relative;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    margin: 0;
    padding: 1.5rem;
    width: auto;
    max-width: 35rem;
  }

  p {
    margin-top: 1rem;
    margin-bottom: 0;
    padding-bottom: 0;
    font-size: 0.875rem;
    line-height: 1.375;

    &:first-of-type {
      margin-top: 0;
    }
  }
`;

const buttonContainerStyles = css`
  display: flex;
  justify-content: flex-end;
`;

const buttonStyles = css`
  margin: 0;
  padding: 0.625rem 1.25rem;
  border: 0;
  border-radius: 3px;
  font-family: inherit;
  font-weight: bold;
  font-size: 0.875rem;
  line-height: 1;
  color: ${colors.black()};
  background-color: ${colors.white(0.875)};
  cursor: pointer;
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
  const [
    smallScreenDialogOpen,
    setSmallScreenDialogOpen, //
  ] = React.useState(false);
  React.useEffect(() => {
    if (sizeCheckInitialized) return;

    if (width < 1024 || height < 600) setSmallScreenDialogOpen(true);

    setSizeCheckInitialized(true);
  }, [width, height, sizeCheckInitialized]);

  return (
    <React.Fragment>
      <Global styles={gloablStyles} />

      <div className="tots">
        <SplashScreen />
        <DialogOverlay css={overlayStyles} isOpen={smallScreenDialogOpen}>
          <DialogContent css={dialogStyles} aria-label="Small Screen Warning">
            This site contains data uploading and map editing features best used
            in a desktop web browser.
            <br />
            <div css={buttonContainerStyles}>
              <button
                className="btn"
                css={buttonStyles}
                onClick={(ev) => setSmallScreenDialogOpen(false)}
              >
                OK
              </button>
            </div>
          </DialogContent>
        </DialogOverlay>
        <TestingToolbar />
        <div css={appStyles}>
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
      </div>
    </React.Fragment>
  );
}

export default function AppContainer() {
  return (
    <EsriModulesProvider>
      <AuthenticationProvider>
        <CalculateProvider>
          <NavigationProvider>
            <SketchProvider>
              <App />
            </SketchProvider>
          </NavigationProvider>
        </CalculateProvider>
      </AuthenticationProvider>
    </EsriModulesProvider>
  );
}
