/** @jsxImportSource @emotion/react */

import React from 'react';
import { Global, css } from '@emotion/react';
import { useWindowSize } from '@reach/window-size';
import esriConfig from '@arcgis/core/config';
import * as urlUtils from '@arcgis/core/core/urlUtils';
// components
import AlertDialog from 'components/AlertDialog';
import ErrorBoundary from 'components/ErrorBoundary';
import NavBar from 'components/NavBar';
import Toolbar from 'components/Toolbar';
import SplashScreen from 'components/SplashScreen';
import TestingToolbar from 'components/TestingToolbar';
import Map from 'components/Map';
import { ReactTable } from 'components/ReactTable';
// contexts
import { AuthenticationProvider } from 'contexts/Authentication';
import { CalculateProvider, CalculateContext } from 'contexts/Calculate';
import { DialogProvider, DialogContext } from 'contexts/Dialog';
import { LookupFilesProvider, useServicesContext } from 'contexts/LookupFiles';
import { NavigationProvider, NavigationContext } from 'contexts/Navigation';
import { PublishProvider } from 'contexts/Publish';
import { SketchProvider, SketchContext } from 'contexts/Sketch';
// utilities
import { getEnvironmentString } from 'utils/arcGisRestUtils';
import { logCallToGoogleAnalytics } from 'utils/fetchUtils';
import { useSessionStorage } from 'utils/hooks';
import { getSampleTableColumns } from 'utils/sketchUtils';
import { isIE } from 'utils/utils';
// config
import { epaMarginOffset, navPanelWidth } from 'config/appConfig';
import { unsupportedBrowserMessage } from 'config/errorMessages';
// styles
import '@reach/dialog/styles.css';

const resizerHeight = 10;
const esrifooterheight = 16;
const expandButtonHeight = 32;
const minMapHeight = 180;
var startY = 0;

declare global {
  interface Window {
    ga: Function;
    gaTarget: string;
    googleAnalyticsMapping: any[];
    logErrorToGa: Function;
    logToGa: Function;
  }
}

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

  .esri-popup__main-container {
    max-height: 465px !important;
    min-width: 460px !important;
  }

  .esri-popup__action-text {
    display: none;
  }
`;

const errorContainerStyles = css`
  margin: 10px;
`;

const appStyles = (offset: number) => css`
  display: flex;
  flex-direction: column;
  height: calc(100vh - ${offset}px);
  min-height: 675px;
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
    overflow: hidden;
  `;
};

const floatButtonPanelStyles = ({
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
    display: flex;
    z-index: ${zIndex};
    position: absolute;
    height: 32px;
    bottom: ${(expanded ? height : 0) + esrifooterheight}px;
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
  height: 100%;
`;

const collapsePanelButton = css`
  margin: 0;
  height: ${expandButtonHeight}px;
  width: 64px;
  border-radius: 0;
  background-color: white;
  color: black;
  pointer-events: all;
`;

const resizerContainerStyles = css`
  height: ${resizerHeight}px;
  width: 100%;
  display: flex;
  justify-content: center;
  pointer-events: auto;
  cursor: row-resize;
`;

const resizerButtonStyles = css`
  height: 2px;
  width: 25px;
  margin-top: 4px;
  background: #b0b0b0 none;
`;

const tablePanelHeaderStyles = css`
  height: 30px;
  width: 100%;
  color: #444;
  background-color: #efefef;
  border: 1px solid #afafaf;
  padding: 0;
`;

const sampleTableHeaderStyles = css`
  margin: 0 10px;
  font-weight: bold;
`;

const zoomButtonContainerStyles = css`
  text-align: center;
`;

const zoomButtonStyles = css`
  background-color: transparent;
  color: black;
  margin: 0;
  padding: 3px 6px;
  font-size: 16px;
`;

function App() {
  const { calculateResults } = React.useContext(CalculateContext);
  const {
    currentPanel,
    panelExpanded,
    resultsExpanded,
    tablePanelExpanded,
    setTablePanelExpanded,
    tablePanelHeight,
    setTablePanelHeight,
    trainingMode,
  } = React.useContext(NavigationContext);
  const {
    mapView,
    layers,
    selectedSampleIds,
    setSelectedSampleIds,
    selectedScenario,
  } = React.useContext(SketchContext);

  const services = useServicesContext();
  useSessionStorage();

  const { height, width } = useWindowSize();

  // calculate height of div holding actions info
  const [contentHeight, setContentHeight] = React.useState(0);
  const [toolbarHeight, setToolbarHeight] = React.useState(0);
  const mapRef = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    if (!mapRef?.current) return;

    const mapHeight = mapRef.current.getBoundingClientRect().height;
    if (contentHeight !== mapHeight) setContentHeight(mapHeight);

    // adjust the table height if necessary
    const maxTableHeight =
      contentHeight - esrifooterheight - toolbarHeight - expandButtonHeight;
    if (maxTableHeight > 0 && tablePanelHeight >= maxTableHeight) {
      setTablePanelHeight(maxTableHeight);
    }
  }, [
    width,
    height,
    mapRef,
    contentHeight,
    tablePanelHeight,
    setTablePanelHeight,
    toolbarHeight,
  ]);

  // calculate height of div holding actions info
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

    setOffset(totsRef.current.offsetTop);
  }, [totsRef]);

  // count the number of samples
  const sampleData: any[] = [];
  layers.forEach((layer) => {
    if (!layer.sketchLayer || layer.sketchLayer.type === 'feature') return;
    if (layer?.parentLayer?.id !== selectedScenario?.layerId) return;
    if (layer.layerType === 'Samples' || layer.layerType === 'VSP') {
      const graphics = layer.sketchLayer.graphics.toArray();
      graphics.sort((a, b) =>
        a.attributes.PERMANENT_IDENTIFIER.localeCompare(
          b.attributes.PERMANENT_IDENTIFIER,
        ),
      );
      graphics.forEach((sample) => {
        sampleData.push({
          graphic: sample,
          ...sample.attributes,
        });
      });
    }
  });

  // calculate the width of the table
  let tablePanelWidth = 150;
  if (currentPanel && panelExpanded) tablePanelWidth += 325;
  if (
    resultsExpanded &&
    currentPanel?.value === 'calculate' &&
    calculateResults.panelOpen === true
  ) {
    tablePanelWidth += 500;
  }

  // determine which rows of the table should be selected
  const ids: { [key: string]: boolean } = {};
  let selectionMethod: 'row-click' | 'sample-click' = 'sample-click';
  sampleData.forEach((sample, index) => {
    const selectedIndex = selectedSampleIds.findIndex(
      (item) => item.PERMANENT_IDENTIFIER === sample.PERMANENT_IDENTIFIER,
    );
    const selectedItem = selectedSampleIds.find(
      (item) => item.PERMANENT_IDENTIFIER === sample.PERMANENT_IDENTIFIER,
    );
    if (selectedItem && selectedIndex !== -1) {
      ids[selectedItem.PERMANENT_IDENTIFIER] = true;
      selectionMethod = selectedSampleIds[selectedIndex].selection_method;
    }
  });
  const initialSelectedRowIds = {
    selectionMethod,
    ids,
  };

  // setup esri interceptors for logging to google analytics
  const [interceptorsInitialized, setInterceptorsInitialized] =
    React.useState(false);
  React.useEffect(() => {
    if (interceptorsInitialized || !esriConfig?.request?.interceptors) return;

    var callId = 0;
    var callDurations: any = {};

    if (services.status === 'success') {
      // Have ESRI use the proxy for communicating with the TOTS GP Server
      urlUtils.addProxyRule({
        proxyUrl: services.data.proxyUrl,
        urlPrefix: 'https://ags.erg.com',
      });
      urlUtils.addProxyRule({
        proxyUrl: services.data.proxyUrl,
        urlPrefix: 'http://ags.erg.com',
      });
    }

    if (!esriConfig?.request?.interceptors) return;

    // intercept esri calls to gispub
    const urls: string[] = ['https://www.arcgis.com/sharing/rest/'];
    esriConfig.request.interceptors.push({
      urls,

      // Workaround for ESRI CORS cacheing issue, when switching between
      // environments.
      before: function (params) {
        // if this environment has a phony variable use it
        const envString = getEnvironmentString();
        if (envString) {
          params.requestOptions.query[envString] = 1;
        }

        // add the callId to the query so we can tie the response back
        params.requestOptions.query['callId'] = callId;

        // add the call's start time to the dictionary
        callDurations[callId] = performance.now();

        // increment the callId
        callId = callId + 1;
      },

      // Log esri api calls to Google Analytics
      after: function (response: any) {
        // get the execution time for the call
        const callId = response.requestOptions.query.callId;
        const startTime = callDurations[callId];

        logCallToGoogleAnalytics(response.url, 200, startTime);

        // delete the execution time from the dictionary
        delete callDurations[callId];
      },

      error: function (error) {
        // get the execution time for the call
        const details = error.details;
        const callId = details.requestOptions.query.callId;
        const startTime = callDurations[callId];

        logCallToGoogleAnalytics(
          details.url,
          details.httpStatus ? details.httpStatus : error.message,
          startTime,
        );

        // delete the execution time from the dictionary
        delete callDurations[callId];
      },
    });

    setInterceptorsInitialized(true);
  }, [interceptorsInitialized, services]);

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
                      id="tots-map-div"
                      css={mapHeightStyles(
                        tablePanelExpanded ? tablePanelHeight : 0,
                      )}
                    >
                      {toolbarHeight && <Map height={toolbarHeight} />}
                    </div>
                  </div>
                  {sampleData.length > 0 && (
                    <div
                      id="tots-table-button-div"
                      css={floatButtonPanelStyles({
                        width: tablePanelWidth,
                        height: tablePanelHeight,
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
                      id="tots-table-div"
                      css={floatPanelStyles({
                        width: tablePanelWidth,
                        height: tablePanelHeight,
                        left: `${tablePanelWidth}px`,
                        expanded: true,
                        zIndex: 2,
                      })}
                    >
                      <div css={floatPanelContentStyles(false)}>
                        <div
                          css={resizerContainerStyles}
                          onMouseDown={(e) => {
                            e = e || window.event;
                            e.preventDefault();
                            startY = e.clientY;

                            const mapDiv =
                              document.getElementById('tots-map-div'); // adjust height
                            const tableDiv =
                              document.getElementById('tots-table-div'); // adjust height
                            const reactTableElm =
                              document.getElementById('tots-samples-table');
                            const buttonDiv = document.getElementById(
                              'tots-table-button-div',
                            ); // move top

                            let mapHeight = 0;
                            let tableHeight = 0;
                            if (!mapDiv || !tableDiv || !buttonDiv) return;

                            mapHeight = mapDiv.clientHeight;
                            tableHeight = tableDiv.clientHeight;

                            document.onmouseup = () => {
                              /* stop moving when mouse button is released:*/
                              document.onmouseup = null;
                              document.onmousemove = null;

                              // set the table panel height
                              setTablePanelHeight(tableDiv.clientHeight);

                              // clear the styles set
                              tableDiv.style.height = '';
                              mapDiv.style.height = '';
                              buttonDiv.style.bottom = '';
                            };
                            // call a function whenever the cursor moves:
                            document.onmousemove = (e: MouseEvent) => {
                              e = e || window.event;
                              e.preventDefault();

                              if (!mapDiv || !tableDiv || !buttonDiv) return;

                              // get size info
                              const panelHeight = contentHeight - toolbarHeight;
                              const mouseOffset = startY - e.clientY;
                              let newMapHeight = mapHeight - mouseOffset;
                              let newTableHeight = tableHeight + mouseOffset;
                              const maxTableHeight = panelHeight - minMapHeight;

                              // prevent map being taller then content box
                              if (
                                newMapHeight + resizerHeight >=
                                contentHeight
                              ) {
                                newMapHeight = contentHeight - resizerHeight;
                                newTableHeight = resizerHeight;
                              }

                              // prevent table being taller then content box
                              if (newTableHeight >= maxTableHeight) {
                                newMapHeight = contentHeight - maxTableHeight;
                                newTableHeight = maxTableHeight;
                              }

                              // set the height directly for faster performance
                              mapDiv.style.height = `${newMapHeight}px`;
                              tableDiv.style.height = `${newTableHeight}px`;
                              buttonDiv.style.bottom = `${
                                newTableHeight + esrifooterheight
                              }px`;

                              if (reactTableElm) {
                                reactTableElm.style.height = `${
                                  newTableHeight - resizerHeight - 30
                                }px`;
                              }
                            };
                          }}
                        >
                          <div css={resizerButtonStyles}></div>
                        </div>
                        <div
                          id="tots-attributes-panel-scroll-container"
                          css={floatPanelScrollContainerStyles}
                        >
                          <div css={tablePanelHeaderStyles}>
                            <span css={sampleTableHeaderStyles}>
                              Samples (Count: {sampleData.length})
                            </span>
                          </div>
                          <div>
                            <ReactTable
                              id="tots-samples-table"
                              data={sampleData}
                              idColumn={'PERMANENT_IDENTIFIER'}
                              striped={true}
                              height={tablePanelHeight - resizerHeight - 30}
                              initialSelectedRowIds={initialSelectedRowIds}
                              onSelectionChange={(row: any) => {
                                const PERMANENT_IDENTIFIER =
                                  row.original.PERMANENT_IDENTIFIER;
                                const DECISIONUNITUUID =
                                  row.original.DECISIONUNITUUID;
                                setSelectedSampleIds((selectedSampleIds) => {
                                  if (
                                    selectedSampleIds.findIndex(
                                      (item) =>
                                        item.PERMANENT_IDENTIFIER ===
                                        PERMANENT_IDENTIFIER,
                                    ) !== -1
                                  ) {
                                    const samples = selectedSampleIds.filter(
                                      (item) =>
                                        item.PERMANENT_IDENTIFIER !==
                                        PERMANENT_IDENTIFIER,
                                    );

                                    return samples.map((sample) => {
                                      return {
                                        PERMANENT_IDENTIFIER,
                                        DECISIONUNITUUID,
                                        selection_method: 'row-click',
                                      };
                                    });
                                  }

                                  return [
                                    // ...selectedSampleIds, // Uncomment this line to allow multiple selections
                                    {
                                      PERMANENT_IDENTIFIER,
                                      DECISIONUNITUUID,
                                      selection_method: 'row-click',
                                    },
                                  ];
                                });
                              }}
                              sortBy={[
                                {
                                  id: 'DECISIONUNIT',
                                  desc: false,
                                },
                                {
                                  id: 'TYPE',
                                  desc: false,
                                },
                                {
                                  id: 'PERMANENT_IDENTIFIER',
                                  desc: false,
                                },
                              ]}
                              getColumns={(tableWidth: any) => {
                                return [
                                  {
                                    Header: () => null,
                                    id: 'zoom-button',
                                    renderCell: true,
                                    width: 30,
                                    Cell: ({ row }: { row: any }) => (
                                      <div css={zoomButtonContainerStyles}>
                                        <button
                                          css={zoomButtonStyles}
                                          onClick={(event) => {
                                            event.stopPropagation();

                                            // select the sample
                                            setSelectedSampleIds([
                                              {
                                                PERMANENT_IDENTIFIER:
                                                  row.original
                                                    .PERMANENT_IDENTIFIER,
                                                DECISIONUNITUUID:
                                                  row.original.DECISIONUNITUUID,
                                                selection_method: 'row-click',
                                              },
                                            ]);

                                            // zoom to the graphic
                                            if (!mapView) return;
                                            mapView.goTo(row.original.graphic);
                                            mapView.zoom = mapView.zoom - 1;
                                          }}
                                        >
                                          <i className="fas fa-search-plus" />
                                          <span className="sr-only">
                                            Zoom to sample
                                          </span>
                                        </button>
                                      </div>
                                    ),
                                  },
                                  ...getSampleTableColumns({
                                    tableWidth,
                                    includeContaminationFields: trainingMode,
                                  }),
                                ];
                              }}
                            />
                          </div>
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
    <LookupFilesProvider>
      <DialogProvider>
        <AuthenticationProvider>
          <CalculateProvider>
            <NavigationProvider>
              <PublishProvider>
                <SketchProvider>
                  <App />
                </SketchProvider>
              </PublishProvider>
            </NavigationProvider>
          </CalculateProvider>
        </AuthenticationProvider>
      </DialogProvider>
    </LookupFilesProvider>
  );
}
