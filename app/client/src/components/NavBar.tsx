/** @jsxImportSource @emotion/react */

import React, {
  Fragment,
  MouseEvent as ReactMouseEvent,
  useCallback,
  useContext,
  useEffect,
} from 'react';
import { css } from '@emotion/react';
// components
import AddData from 'components/AddData';
import Calculate from 'components/Calculate';
import CalculateResults from 'components/CalculateResults';
import ConfigureOutput from 'components/ConfigureOutput';
import LoadingSpinner from 'components/LoadingSpinner';
import LocateSamples from 'components/LocateSamples';
import Publish from 'components/Publish';
import Search from 'components/Search';
import GettingStarted from 'components/GettingStarted';
// contexts
import { CalculateContext } from 'contexts/Calculate';
import { NavigationContext } from 'contexts/Navigation';
// config
import { navPanelWidth } from 'config/appConfig';
import { panels, PanelType } from 'config/navigation';
// styles
import '@reach/dialog/styles.css';
import { colors } from 'styles';
import { useCalculatePlan } from 'utils/hooks';

const panelWidth = '325px';
const resultsPanelWidth = '500px';
const panelCollapseButtonWidth = '32px';
const buttonColor = colors.darkblue2();
const buttonVisitedColor = colors.darkaqua();

// --- styles (NavButton) ---
const navButtonStyles = (selected: boolean) => {
  return css`
    display: flex;
    align-items: center;
    text-align: justify;
    color: ${selected ? 'black' : 'white'};
    background-color: ${selected ? colors.white() : 'transparent'};
    margin: 0;
    padding: 0;
    font-size: 14px;

    /* 
      shift the button so the icon centers with the 
      left side of the button 
    */
    width: calc(100% - 30px);
    margin-left: calc(0.75em + 23px);
  `;
};

const verticalButtonBar = (color: string) => {
  return css`
    border-left: 6px solid ${color};
    height: 1.1764em;
    margin-left: 30px;
  `;
};

const navIconStyles = (color: string) => {
  return css`
    font-size: 18px;
    padding: 14px;
    margin-left: -23px;
    margin-right: 10px;
    border-radius: 50%;
    color: white;
    background-color: ${color};
    width: 46px;
    height: 46px;
    text-align: center;
  `;
};

const navTextStyles = css`
  width: 70px;
`;

// --- components (NavButton) ---
type NavButtonProps = {
  panel: PanelType;
  selectedPanel: PanelType | null;
  visitedStepIndex: number;
  onClick: (ev: ReactMouseEvent<HTMLElement>) => void;
};

function NavButton({
  panel,
  selectedPanel,
  visitedStepIndex,
  onClick,
}: NavButtonProps) {
  const { value, label, iconClass } = panel;

  // check if this button is selected
  const selectedValue = selectedPanel && selectedPanel.value;
  const selected = value === selectedValue;

  // get the index of the panel
  const panelIndex = panels.findIndex((item) => item.value === panel.value);

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
    background-color: ${colors.darkblue()};
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
  color: white;
  text-align: center;
  border-top: 5px solid ${buttonVisitedColor};
  border-bottom: 5px solid ${buttonVisitedColor};
  padding: 5px;
  font-size: 0.85rem;
`;

const tallyTitle = css`
  color: white;
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
`;

const helpIconStyles = css`
  font-size: 18px;
  padding: 7px;
  margin-left: 8px;
  margin-right: 10px;
  border-radius: 50%;
  color: ${buttonColor};
  background-color: white;
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
  height: number;
};

function NavBar({ height }: Props) {
  const { calculateResults } = useContext(CalculateContext);
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
  }, [goTo, setGoTo, toggleExpand]);

  useEffect(() => {
    if (calculateResults.status !== 'none') {
      setResultsExpanded(true);
    }
  }, [calculateResults, setResultsExpanded]);

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
  useCalculatePlan();

  return (
    <Fragment>
      <GettingStarted isOpen={gettingStartedOpen}>
        <div css={helpOkContainerStyles}>
          <button
            className="btn"
            css={helpOkButtonStyles}
            onClick={(ev) => setGettingStartedOpen(false)}
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
                  selectedPanel={currentPanel}
                  visitedStepIndex={latestStepIndex}
                  onClick={() => setGoTo(panel.value)}
                />
              );
            })}
          </div>

          {calculateResults.status === 'fetching' && <LoadingSpinner />}
          {calculateResults.status === 'success' && calculateResults.data && (
            <div css={resourceTallyStyles}>
              <h3 css={tallyTitle}>Resource Tally</h3>
              <div css={resourceTallyContainerStyles}>
                <div css={mainTallyStyles}>
                  Total Cost: $
                  {Math.round(
                    calculateResults.data['Total Cost'],
                  ).toLocaleString()}
                </div>
                <div css={subTallyStyles}>
                  <i className="fas fa-users fa-fw" /> $
                  {Math.round(
                    calculateResults.data['Total Sampling Cost'],
                  ).toLocaleString()}
                </div>
                <div css={subTallyStyles}>
                  <i className="fas fa-flask fa-fw" /> $
                  {Math.round(
                    calculateResults.data['Total Analysis Cost'],
                  ).toLocaleString()}
                </div>
                <div css={mainTallyStyles}>
                  Max Time day(s):{' '}
                  {calculateResults.data['Total Time'].toLocaleString()}
                </div>
                <div css={subTallyStyles}>
                  <i className="fas fa-users fa-fw" />{' '}
                  {(
                    Math.round(
                      calculateResults.data['Time to Complete Sampling'] * 10,
                    ) / 10
                  ).toLocaleString()}
                </div>
                <div css={subTallyStyles}>
                  <i className="fas fa-flask fa-fw" />{' '}
                  {(
                    Math.round(
                      calculateResults.data['Time to Complete Analyses'] * 10,
                    ) / 10
                  ).toLocaleString()}
                </div>
                <hr css={resourceTallySeparator} />
              </div>
              {calculateResults.data['Limiting Time Factor'] && (
                <div>
                  <span css={mainTallyStyles}>Limiting Factor</span>
                  <br />
                  {calculateResults.data['Limiting Time Factor'] ===
                    'Sampling' && <i className="fas fa-users fa-fw" />}
                  {calculateResults.data['Limiting Time Factor'] ===
                    'Analysis' && <i className="fas fa-flask fa-fw" />}{' '}
                  <span>{calculateResults.data['Limiting Time Factor']}</span>
                </div>
              )}
            </div>
          )}

          <button
            onClick={(ev) => setGettingStartedOpen(!gettingStartedOpen)}
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
              id="tots-panel-scroll-container"
              css={floatPanelScrollContainerStyles}
            >
              {currentPanel.value === 'search' && <Search />}
              {currentPanel.value === 'addData' && <AddData />}
              {currentPanel.value === 'locateSamples' && <LocateSamples />}
              {currentPanel.value === 'calculate' && <Calculate />}
              {currentPanel.value === 'configureOutput' && <ConfigureOutput />}
              {currentPanel.value === 'publish' && <Publish />}
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
            zIndex: 3,
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
