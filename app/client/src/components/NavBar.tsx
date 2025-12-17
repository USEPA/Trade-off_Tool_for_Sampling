/** @jsxImportSource @emotion/react */

import React, {
  Fragment,
  MouseEvent as ReactMouseEvent,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { css } from '@emotion/react';
// components
import AddData from 'components/AddData';
import AdditionalTools from 'components/AdditionalTools';
import Calculate from 'components/Calculate';
import CalculateResults from 'components/CalculateResults';
import ConfigureOutput from 'components/ConfigureOutput';
import CreateDeconPlan from 'components/CreateDeconPlan';
import LoadingSpinner from 'components/LoadingSpinner';
import LocateSamples from 'components/LocateSamples';
import Publish from 'components/Publish';
import GettingStarted from 'components/GettingStarted';
// contexts
import { CalculateContext } from 'contexts/Calculate';
import { NavigationContext } from 'contexts/Navigation';
import { PublishContext } from 'contexts/Publish';
import { SketchContext } from 'contexts/Sketch';
// utils
import {
  useAutoConfigureOutput,
  useCalculateDeconPlan,
  useCalculatePlan,
} from 'utils/hooks';
// config
import { navPanelWidth } from 'config/appConfig';
import {
  deconPanels,
  isDecon,
  PanelType,
  samplingPanels,
} from 'config/navigation';
// types
import { AppType } from 'types/Navigation';
// styles
import '@reach/dialog/styles.css';
import { appTheme, colors } from 'styles';

const panelWidth = '325px';
const resultsPanelWidth = '500px';
const panelCollapseButtonWidth = '32px';
const buttonColor = colors.darkblue2();
const buttonVisitedColor = colors.darkaqua();

// --- styles (NavButton) ---
const navButtonStyles = (selected: boolean) => css`
  display: flex;
  align-items: center;
  text-align: justify;
  color: ${selected ? appTheme.headerColorSelected : appTheme.headerColor};
  background-color: ${selected
    ? appTheme.headerBackgroundColorSelected
    : 'transparent'};
  margin: 0;
  padding: 0;
  font-size: 14px;

  /* 
      shift the button so the icon centers with the 
      left side of the button 
    */
  height: 40px;
  width: calc(100% - 30px);
  margin-left: calc(0.75em + 20px);
`;

const verticalButtonBar = (color: string) => {
  return css`
    border-left: 6px solid ${color};
    height: 0.5em;
    margin-left: 25px;
  `;
};

const navIconStyles = (color: string) => {
  return css`
    font-size: 16px;
    padding: 13px;
    margin-left: -23px;
    margin-right: 10px;
    border-radius: 50%;
    color: white;
    background-color: ${color};
    width: 40px;
    height: 40px;
    text-align: center;
  `;
};

const navTextStyles = css`
  width: 80px;
`;

// --- components (NavButton) ---
type NavButtonProps = {
  panel: PanelType;
  panelIndex: number;
  selectedPanel: PanelType | null;
  visitedStepIndex: number;
  onClick: (ev: ReactMouseEvent<HTMLElement>) => void;
};

function NavButton({
  panel,
  panelIndex,
  selectedPanel,
  visitedStepIndex,
  onClick,
}: NavButtonProps) {
  const { value, label, iconClass } = panel;

  // check if this button is selected
  const selectedValue = selectedPanel && selectedPanel.value;
  const selected = value === selectedValue;

  // get the color of the button
  let color = buttonColor;
  if (panelIndex <= visitedStepIndex) color = buttonVisitedColor;

  return (
    <Fragment>
      <div
        css={verticalButtonBar(panelIndex < 1 ? 'transparent' : color)}
      ></div>
      <button
        data-testid={value}
        onClick={onClick}
        css={navButtonStyles(selected)}
      >
        <i className={iconClass} css={navIconStyles(color)} />
        <span css={navTextStyles}>{label}</span>
      </button>
    </Fragment>
  );
}

// --- styles (NavBar) ---
const helpOkContainerStyles = css`
  display: flex;
  justify-content: flex-end;
`;

const helpOkButtonStyles = css`
  padding: 0.625rem 1.25rem;
  border: 0;
  border-radius: 3px;
  font-family: inherit;
  font-weight: bold;
  font-size: 0.875rem;
  line-height: 1;
  cursor: pointer;
`;

const navPanelStyles = (height: number) => {
  return css`
    display: inline;
    float: left;
    position: relative;
    height: ${height}px;
    width: ${navPanelWidth};
    background-color: ${appTheme.headerBackgroundColor};
  `;
};

const navPanelContainerStyles = css`
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  height: 100%;
  padding: 15px 0;
  overflow: hidden auto;
  gap: 10px;
`;

const resourceTallyStyles = css`
  color: ${appTheme.resourceTallyColor};
  text-align: center;
  border-top: 5px solid ${buttonVisitedColor};
  border-bottom: 5px solid ${buttonVisitedColor};
  padding: 5px;
  font-size: 0.85rem;
`;

const tallyTitle = css`
  color: ${appTheme.resourceTallyColor};
  margin: 0;
  padding: 0 0 0.25em;
  font-size: 100%;
  font-weight: bold;
  line-height: 1.3;
`;

const resourceTallyContainerStyles = css`
  width: 100%;
  text-align: left;
`;

const subTallyStyles = css`
  margin-left: 15px;
`;

const mainTallyStyles = css`
  font-weight: bold;
`;

const resourceTallySeparator = css`
  border-top: none;
  border-bottom: 1px solid ${buttonVisitedColor};
  margin: 0.5rem 0 0.5rem 0.5rem;
`;

const helpIconStyles = css`
  font-size: 18px;
  padding: 7px;
  margin-left: 8px;
  margin-right: 10px;
  border-radius: 50%;
  color: ${isDecon() ? 'white' : buttonColor};
  background-color: ${isDecon() ? buttonColor : 'white'};
  width: 30px;
  height: 30px;
  text-align: center;
`;

const floatPanelStyles = ({
  width,
  height,
  left,
  expanded,
  zIndex,
}: {
  width: string;
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
    left: ${left};
    width: ${width};
    pointer-events: none;
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
    width: ${panelWidth};
    color: black;
    background-color: white;
  `;
};

const floatPanelScrollContainerStyles = css`
  overflow: auto;
  height: 100%;
`;

const resultsFloatPanelContentStyles = css`
  ${floatPanelContentStyles()}

  width: ${resultsPanelWidth};
  color: white;
  background-color: ${colors.darkblue()};
`;

const floatPanelButtonContainer = (expanded: boolean) => {
  return css`
    width: ${panelCollapseButtonWidth};

    display: inline;
    float: ${expanded ? 'right' : 'left'};
    position: relative;
    height: 100%;
  `;
};

const floatPanelTableContainer = css`
  display: table;
  height: 100%;
`;

const floatPanelTableCellContainer = css`
  display: table-cell;
`;

const collapsePanelButton = css`
  margin: 10px 0 !important;
  display: flex;
  justify-content: center;
  width: ${panelCollapseButtonWidth};
  padding: 1.5em 1em;
  border-radius: 0;
  background-color: white;
  color: black;
  pointer-events: all;
`;

const resultsCollapsePanelButton = css`
  display: flex;
  justify-content: center;
  width: ${panelCollapseButtonWidth};
  padding: 1.5em 1em;
  margin: 0;
  border-radius: 0;
  background-color: ${colors.darkblue()};
  color: white;
  pointer-events: all;
`;

// --- components (NavBar) ---
type Props = {
  appType: AppType;
  height: number;
};

function NavBar({ appType, height }: Props) {
  const { calculateResults, calculateResultsDecon } =
    useContext(CalculateContext);
  const {
    currentPanel,
    setCurrentPanel,
    goTo,
    setGoTo,
    gettingStartedOpen,
    setGettingStartedOpen,
    latestStepIndex,
    setLatestStepIndex,
    panelExpanded,
    setPanelExpanded,
    resultsExpanded,
    setResultsExpanded,
  } = useContext(NavigationContext);
  const {
    defaultConfigureOutput,
    manualConfigureOutput,
    setManualConfigureOutput,
  } = useContext(PublishContext);
  const {
    deconSketchLayer,
    edits,
    layers,
    map,
    setDeconSketchLayer,
    setEdits,
    setLayers,
    setStagingAreaLayer,
    stagingAreaLayer,
  } = useContext(SketchContext);

  useAutoConfigureOutput();

  const [panels] = useState(appType === 'decon' ? deconPanels : samplingPanels);

  const toggleExpand = useCallback(
    (panel: PanelType, panelIndex: number) => {
      if (panel === currentPanel) {
        setPanelExpanded(false);
        setCurrentPanel(null);
      } else {
        setPanelExpanded(true);
        setCurrentPanel(panel);
      }

      if (panelIndex > latestStepIndex) setLatestStepIndex(panelIndex);
    },
    [
      currentPanel,
      setCurrentPanel,
      latestStepIndex,
      setLatestStepIndex,
      setPanelExpanded,
    ],
  );

  useEffect(() => {
    if (!goTo) return;

    // find the requested panel
    let goToPanel: PanelType | null = null;
    let goToPanelIndex = -1;
    panels.forEach((panel, index: number) => {
      if (panel.value === goTo) {
        goToPanel = panel;
        goToPanelIndex = index;
      }
    });

    // open the panel if it was found
    if (goToPanel) toggleExpand(goToPanel, goToPanelIndex);

    setGoTo('');
  }, [goTo, panels, setGoTo, toggleExpand]);

  useEffect(() => {
    if (calculateResults.status !== 'none') {
      setResultsExpanded(true);
    }
  }, [calculateResults, setResultsExpanded]);

  useEffect(() => {
    if (calculateResultsDecon.status !== 'none') {
      setResultsExpanded(true);
    }
  }, [calculateResultsDecon, setResultsExpanded]);

  // determine how far to the right the expand/collapse buttons should be
  let expandLeft = navPanelWidth;
  if (panelExpanded) {
    if (
      currentPanel?.value !== 'calculate' ||
      calculateResults.panelOpen === false ||
      !resultsExpanded
    ) {
      expandLeft = `calc(${navPanelWidth} + ${panelWidth})`;
    } else {
      expandLeft = `calc(${navPanelWidth} + ${panelWidth} + ${resultsPanelWidth})`;
    }
  } else if (
    currentPanel?.value === 'calculate' &&
    calculateResults.panelOpen === true &&
    resultsExpanded
  ) {
    expandLeft = `calc(${navPanelWidth} + ${resultsPanelWidth})`;
  }

  // run calculations to update the running tally
  useCalculatePlan(appType);
  useCalculateDeconPlan();

  const pannelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (pannelRef.current) {
      pannelRef.current.scroll({ top: 0, left: 0, behavior: 'smooth' });
    }
  }, [currentPanel]);

  // clean up layers without a name when leaving additionalTools tab
  const [lastPanel, setLastPanel] = useState<PanelType | null>(currentPanel);
  useEffect(() => {
    if (currentPanel === lastPanel) return;
    setLastPanel(currentPanel);

    if (!currentPanel || currentPanel.value === 'additionalTools') return;

    const editsWithoutNames = edits.edits.filter((edit) => !edit.name);
    if (editsWithoutNames.length > 0) {
      // get analysis layer ids for removing linked operation layers
      const analysisLayerIds = editsWithoutNames
        .filter((e) => e.type === 'layer-aoi-analysis')
        .map((e) => e.layerId);
      const deconOpIds = edits.edits
        .filter(
          (e) =>
            e.type === 'layer-decon' &&
            analysisLayerIds.includes(e.analysisLayerId),
        )
        .map((e) => e.layerId);
      const idsToRemove = [
        ...analysisLayerIds,
        ...deconOpIds,
        ...editsWithoutNames.map((e) => e.layerId),
      ];

      // filter out layers without names and linked layers
      const newEdits = edits.edits.filter(
        (edit) => !idsToRemove.includes(edit.layerId),
      );
      setEdits({
        count: edits.count + 1,
        edits: newEdits,
      });

      // set next available decon sketch layer
      if (deconSketchLayer && !deconSketchLayer.name) {
        const newDeconLayer = newEdits.find(
          (l) => l.type === 'layer-aoi-analysis',
        );
        setDeconSketchLayer(newDeconLayer ?? null);
      }

      setLayers((layers) => {
        // get ids to remove including parent layers
        const fullIdsToRemove: string[] = [];
        layers.forEach((l) => {
          const parentId = l.parentLayer?.id ?? '';
          if (idsToRemove.includes(l.layerId) || idsToRemove.includes(parentId))
            fullIdsToRemove.push(l.layerId);
        });
        const newLayers = layers.filter(
          (l) => !fullIdsToRemove.includes(l.layerId),
        );

        if (stagingAreaLayer && !stagingAreaLayer.name) {
          const newStagingLayer = newLayers.find(
            (l) => l.layerType === 'Staging Area Mask',
          );
          setStagingAreaLayer(newStagingLayer ?? null);
        }

        const mapLayersToRemove = map?.layers?.filter((l) =>
          fullIdsToRemove.includes(l.id),
        );
        if (mapLayersToRemove) map?.removeMany(mapLayersToRemove.toArray());

        return newLayers;
      });
    }
  }, [
    currentPanel,
    deconSketchLayer,
    edits,
    lastPanel,
    layers,
    map,
    setDeconSketchLayer,
    setEdits,
    setLayers,
    stagingAreaLayer,
    setStagingAreaLayer,
  ]);

  // clean up layers without a name when leaving additionalTools tab
  useEffect(() => {
    if (!currentPanel || currentPanel.value === 'configureOutput') return;
    if (!manualConfigureOutput) return;

    if (
      JSON.stringify(manualConfigureOutput) ===
      JSON.stringify(defaultConfigureOutput)
    ) {
      setManualConfigureOutput(null);
    }
  }, [
    currentPanel,
    defaultConfigureOutput,
    manualConfigureOutput,
    setManualConfigureOutput,
  ]);

  return (
    <Fragment>
      <GettingStarted isOpen={gettingStartedOpen}>
        <div css={helpOkContainerStyles}>
          <button
            className="btn"
            css={helpOkButtonStyles}
            onClick={(_ev) => setGettingStartedOpen(false)}
          >
            Close
          </button>
        </div>
      </GettingStarted>
      <div css={navPanelStyles(height)}>
        <div css={navPanelContainerStyles}>
          <div>
            {panels.map((panel, index) => {
              return (
                <NavButton
                  key={index}
                  panel={panel}
                  panelIndex={index}
                  selectedPanel={currentPanel}
                  visitedStepIndex={latestStepIndex}
                  onClick={() => setGoTo(panel.value)}
                />
              );
            })}
          </div>

          {appType === 'sampling' && (
            <Fragment>
              {calculateResults.status === 'fetching' && <LoadingSpinner />}
              {calculateResults.status === 'success' &&
                calculateResults.data && (
                  <div css={resourceTallyStyles}>
                    <h2 css={tallyTitle}>Resource Tally</h2>
                    <div css={resourceTallyContainerStyles}>
                      <div css={mainTallyStyles}>
                        Total Cost: $
                        {Math.round(
                          calculateResults.data['TOTAL_COST'],
                        ).toLocaleString()}
                      </div>
                      <div css={subTallyStyles}>
                        <i className="fas fa-users fa-fw" /> $
                        {Math.round(
                          calculateResults.data['TOTAL_SAMPLING_COST'],
                        ).toLocaleString()}
                      </div>
                      <div css={subTallyStyles}>
                        <i className="fas fa-flask fa-fw" /> $
                        {Math.round(
                          calculateResults.data['TOTAL_LAB_COST'],
                        ).toLocaleString()}
                      </div>
                      <div css={mainTallyStyles}>
                        Max Time Day(s):{' '}
                        {Math.round(
                          calculateResults.data['TOTAL_TIME'],
                        ).toLocaleString()}
                      </div>
                      <div css={subTallyStyles}>
                        <i className="fas fa-users fa-fw" />{' '}
                        {(
                          Math.round(
                            calculateResults.data['SAMPLING_TIME'] * 10,
                          ) / 10
                        ).toLocaleString()}
                      </div>
                      <div css={subTallyStyles}>
                        <i className="fas fa-flask fa-fw" />{' '}
                        {(
                          Math.round(
                            calculateResults.data['LAB_ANALYSIS_TIME'] * 10,
                          ) / 10
                        ).toLocaleString()}
                      </div>
                      <hr css={resourceTallySeparator} />
                    </div>
                    {calculateResults.data['LIMITING_TIME_FACTOR'] && (
                      <div>
                        <span css={mainTallyStyles}>Limiting Factor</span>
                        <br />
                        {calculateResults.data['LIMITING_TIME_FACTOR'] ===
                          'Sampling' && <i className="fas fa-users fa-fw" />}
                        {calculateResults.data['LIMITING_TIME_FACTOR'] ===
                          'Analysis' && (
                          <i className="fas fa-flask fa-fw" />
                        )}{' '}
                        <span>
                          {calculateResults.data['LIMITING_TIME_FACTOR']}
                        </span>
                      </div>
                    )}
                  </div>
                )}
            </Fragment>
          )}

          {appType === 'decon' && (
            <Fragment>
              {calculateResultsDecon.status === 'fetching' && (
                <LoadingSpinner />
              )}
              {calculateResultsDecon.status === 'failure' && (
                <div css={resourceTallyStyles}>
                  An error occurred. Please try again.
                </div>
              )}
              {calculateResultsDecon.status === 'success' &&
                calculateResultsDecon.data && (
                  <div css={resourceTallyStyles}>
                    <h2 css={tallyTitle}>Resource Tally</h2>
                    <div css={resourceTallyContainerStyles}>
                      <div css={mainTallyStyles}>
                        Total Cost: $
                        {Math.round(
                          calculateResultsDecon.data['TOTAL_COST'],
                        ).toLocaleString()}
                      </div>
                      <div css={mainTallyStyles}>
                        Max Time Day(s):{' '}
                        {Math.round(
                          calculateResultsDecon.data['TOTAL_TIME'],
                        ).toLocaleString()}
                      </div>
                      <div css={mainTallyStyles}>
                        Total Waste Volume (m<sup>3</sup>):{' '}
                        {Math.round(
                          calculateResultsDecon.data['WASTE_VOLUME_TOTAL'],
                        ).toLocaleString()}
                      </div>
                      <div css={mainTallyStyles}>
                        Total Waste Mass (kg):{' '}
                        {Math.round(
                          calculateResultsDecon.data['WASTE_WEIGHT_TOTAL'],
                        ).toLocaleString()}
                      </div>
                    </div>
                  </div>
                )}

              <div />
            </Fragment>
          )}

          <button
            onClick={(_ev) => setGettingStartedOpen(!gettingStartedOpen)}
            css={navButtonStyles(false)}
          >
            <i className="fas fa-question" css={helpIconStyles} />
            Help
          </button>
        </div>
      </div>
      {currentPanel && (
        <div
          css={floatPanelStyles({
            width: panelWidth,
            height,
            left: navPanelWidth,
            expanded: panelExpanded,
            zIndex: 2,
          })}
        >
          <div css={floatPanelContentStyles(false)}>
            <div
              ref={pannelRef}
              id="tots-panel-scroll-container"
              css={floatPanelScrollContainerStyles}
            >
              {currentPanel.value === 'addData' && (
                <AddData appType={appType} />
              )}
              {currentPanel.value === 'additionalTools' && (
                <AdditionalTools appType={appType} />
              )}
              {currentPanel.value === 'locateSamples' && <LocateSamples />}
              {currentPanel.value === 'decon' && <CreateDeconPlan />}
              {currentPanel.value === 'calculate' && (
                <Calculate appType={appType} />
              )}
              {currentPanel.value === 'configureOutput' && (
                <ConfigureOutput appType={appType} />
              )}
              {currentPanel.value === 'publish' && (
                <Publish appType={appType} />
              )}
            </div>
          </div>
        </div>
      )}
      {currentPanel?.value === 'calculate' &&
        calculateResults.panelOpen === true && (
          <div
            css={floatPanelStyles({
              width: resultsPanelWidth,
              height,
              left: `calc(${navPanelWidth} + ${
                panelExpanded ? panelWidth : '0px'
              })`,
              expanded: resultsExpanded,
              zIndex: 2,
            })}
          >
            <div css={resultsFloatPanelContentStyles}>
              <CalculateResults />
            </div>
          </div>
        )}
      {(currentPanel || calculateResults.panelOpen === true) && (
        <div
          css={floatPanelStyles({
            width: panelCollapseButtonWidth,
            height,
            left: expandLeft,
            expanded: true,
            zIndex: 1,
          })}
        >
          <div css={floatPanelButtonContainer(panelExpanded)}>
            <div css={floatPanelTableContainer}>
              <div css={floatPanelTableCellContainer}>
                {currentPanel && (
                  <button
                    css={collapsePanelButton}
                    aria-label={`${panelExpanded ? 'Collapse' : 'Expand'} ${
                      currentPanel.label
                    } Panel`}
                    onClick={() => setPanelExpanded(!panelExpanded)}
                  >
                    <i
                      className={
                        panelExpanded
                          ? 'fas fa-angle-left'
                          : 'fas fa-angle-right'
                      }
                    />
                  </button>
                )}
                {currentPanel?.value === 'calculate' &&
                  calculateResults.panelOpen === true && (
                    <button
                      css={resultsCollapsePanelButton}
                      aria-label={`${
                        resultsExpanded ? 'Collapse' : 'Expand'
                      } Calculate Results Panel`}
                      onClick={() => setResultsExpanded(!resultsExpanded)}
                    >
                      <i
                        className={
                          resultsExpanded
                            ? 'fas fa-angle-left'
                            : 'fas fa-angle-right'
                        }
                      />
                    </button>
                  )}
              </div>
            </div>
          </div>
        </div>
      )}
    </Fragment>
  );
}

export default NavBar;
