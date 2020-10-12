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
import { CalculateProvider, CalculateContext } from 'contexts/Calculate';
import { DialogProvider, DialogContext } from 'contexts/Dialog';
import { NavigationProvider, NavigationContext } from 'contexts/Navigation';
import { SketchProvider, SketchContext } from 'contexts/Sketch';
import { EsriModulesProvider } from 'contexts/EsriModules';
// utilities
import { useSessionStorage } from 'utils/hooks';
import { isIE } from 'utils/utils';
// config
import { epaMarginOffset, navPanelWidth } from 'config/appConfig';
import { unsupportedBrowserMessage } from 'config/errorMessages';
// styles
import '@reach/dialog/styles.css';

const tablepanelheight = 200;
const esrifooterheight = 16;

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

    input {
      &:disabled {
        color: #999;
        background-color: #f2f2f2;
        border-color: #fff;
      }
    }
  }

  .sr-only {
    position: absolute;
    left: -10000px;
    top: auto;
    width: 1px;
    height: 1px;
    overflow: hidden;
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
  position: relative;
`;

const mapPanelStyles = css`
  float: right;
  position: relative;
  height: 100%;
  width: calc(100% - ${navPanelWidth});
`;

const mapHeightStyles = (tableHeight: number) => {
  return css`
    height: calc(100% - ${tableHeight}px);
  `;
};

const floatPanelStyles = ({
  width,
  height,
  left,
  expanded,
  zIndex,
}: {
  width: number;
  height: number;
  left: string;
  expanded: boolean;
  zIndex: number;
}) => {
  return css`
    display: ${expanded ? 'block' : 'none'};
    z-index: ${zIndex};
    position: absolute;
    height: ${height}px;
    bottom: 0;
    left: ${left};
    width: calc(100% - ${width}px);
    pointer-events: none;
  `;
};

const floatButtonPanelStyles = ({
  width,
  left,
  expanded,
  zIndex,
}: {
  width: number;
  left: string;
  expanded: boolean;
  zIndex: number;
}) => {
  return css`
    display: flex;
    z-index: ${zIndex};
    position: absolute;
    height: 32px;
    bottom: ${(expanded ? tablepanelheight : 0) + esrifooterheight}px;
    left: ${left};
    width: calc(100% - ${width}px);
    pointer-events: none;
    justify-content: center;
  `;
};

const floatPanelContentStyles = (includeOverflow: boolean = true) => {
  return css`
    float: left;
    position: relative;
    height: 100%;
    ${includeOverflow ? 'overflow: auto;' : ''}
    pointer-events: all;

    /* styles to be overridden */
    width: 100%;
    color: black;
    background-color: white;
  `;
};

const floatPanelScrollContainerStyles = css`
  overflow: auto;
  height: 100%;
`;

const collapsePanelButton = css`
  margin: 0;
  width: 64px;
  border-radius: 0;
  background-color: white;
  color: black;
  pointer-events: all;
`;

function App() {
  const { calculateResults } = React.useContext(CalculateContext);
  const { currentPanel, panelExpanded, resultsExpanded } = React.useContext(
    NavigationContext,
  );
  const { layers } = React.useContext(SketchContext);

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

  // count the number of samples
  let numSamples = 0;
  layers.forEach((layer) => {
    if (!layer.sketchLayer || layer.sketchLayer.type === 'feature') return;
    if (layer.layerType === 'Samples' || layer.layerType === 'VSP') {
      numSamples += layer.sketchLayer.graphics.length;
    }
  });

  // calculate the width of the table
  const [tablePanelExpanded, setTablePanelExpanded] = React.useState(false);
  let tablePanelWidth = 150;
  if (currentPanel && panelExpanded) tablePanelWidth += 325;
  if (
    resultsExpanded &&
    currentPanel?.value === 'calculate' &&
    calculateResults.panelOpen === true
  ) {
    tablePanelWidth += 500;
  }

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
                    <div
                      css={mapHeightStyles(
                        tablePanelExpanded ? tablepanelheight : 0,
                      )}
                    >
                      {toolbarHeight && <Map height={toolbarHeight} />}
                    </div>
                  </div>
                  {numSamples > 0 && (
                    <div
                      css={floatButtonPanelStyles({
                        width: tablePanelWidth,
                        left: `${tablePanelWidth}px`,
                        expanded: tablePanelExpanded,
                        zIndex: 1,
                      })}
                    >
                      <button
                        css={collapsePanelButton}
                        aria-label={`${
                          tablePanelExpanded ? 'Collapse' : 'Expand'
                        } Table Panel`}
                        onClick={() =>
                          setTablePanelExpanded(!tablePanelExpanded)
                        }
                      >
                        <i
                          className={
                            tablePanelExpanded
                              ? 'fas fa-chevron-down'
                              : 'fas fa-chevron-up'
                          }
                        />
                      </button>
                    </div>
                  )}
                  {tablePanelExpanded && (
                    <div
                      css={floatPanelStyles({
                        width: tablePanelWidth,
                        height: tablepanelheight,
                        left: `${tablePanelWidth}px`,
                        expanded: true,
                        zIndex: 2,
                      })}
                    >
                      <div css={floatPanelContentStyles(false)}>
                        <div
                          id="tots-panel-scroll-container"
                          css={floatPanelScrollContainerStyles}
                        >
                          The table should go here.
                        </div>
                      </div>
                    </div>
                  )}
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
