// emotion @jsx pragma docs: https://emotion.sh/docs/css-prop#jsx-pragma
/** @jsx jsx */

import React from 'react';
import { jsx, css } from '@emotion/core';
// components
import AddData from 'components/AddData';
import Calculate from 'components/Calculate';
import CalculateResults from 'components/CalculateResults';
import LoadingSpinner from 'components/LoadingSpinner';
import LocateSamples from 'components/LocateSamples';
import Publish from 'components/Publish';
import Search from 'components/Search';
import SplashScreenContent from 'components/SplashScreenContent';
// contexts
import { CalculateContext } from 'contexts/Calculate';
// config
import { navPanelWidth } from 'config/appConfig';
// styles
import '@reach/dialog/styles.css';
import { colors } from 'styles';
import { useCalculatePlan } from 'utils/hooks';

const panelWidth = '325px';
const resultsPanelWidth = '500px';
const panelCollapseButtonWidth = '32px';
const buttonColor = colors.darkblue2();
const buttonVisitedColor = colors.darkaqua();

type PanelType = {
  value: string;
  label: string;
  iconClass: string;
};

const panels: PanelType[] = [
  {
    value: 'search',
    label: 'Search',
    iconClass: 'fas fa-search',
  },
  {
    value: 'addData',
    label: 'Add Data',
    iconClass: 'fas fa-layer-group',
  },
  {
    value: 'locateSamples',
    label: 'Create Plan',
    iconClass: 'fas fa-thumbtack',
  },
  {
    value: 'calculate',
    label: 'Calculate Resources',
    iconClass: 'fas fa-calculator',
  },
  {
    value: 'publish',
    label: 'Publish Plan',
    iconClass: 'fas fa-upload',
  },
];

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

// --- components (NavButton) ---
type NavButtonProps = {
  panel: PanelType;
  selectedPanel: PanelType | null;
  visitedStepIndex: number;
  onClick: (panel: PanelType, panelIndex: number) => void;
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
    <React.Fragment>
      <div
        css={verticalButtonBar(panelIndex < 1 ? 'transparent' : color)}
      ></div>
      <button
        onClick={(ev) => onClick(panel, panelIndex)}
        css={navButtonStyles(selected)}
      >
        <i className={iconClass} css={navIconStyles(color)} />
        {label}
      </button>
    </React.Fragment>
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
  background-color: ${colors.white(0.875)};
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
`;

const resourceTallyStyles = css`
  color: white;
  text-align: center;
  border-top: 5px solid ${buttonVisitedColor};
  border-bottom: 5px solid ${buttonVisitedColor};
  padding: 5px;

  i {
    color: ${buttonVisitedColor};
  }
`;

const resourceTallyContainerStyles = css`
  display: inline-block;
  text-align: left;
`;

const resourceTallySeparator = css`
  border-top: none;
  border-bottom: 1px solid ${buttonVisitedColor};
`;

const limitingFactorStyles = css`
  color: ${buttonVisitedColor};
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

const floatPanelStyles = (
  width: string,
  height: number,
  left: string,
  expanded: boolean,
) => {
  return css`
    display: ${expanded ? 'block' : 'none'};
    z-index: 99;
    position: absolute;
    height: ${height}px;
    left: ${left};
    width: ${width};
    pointer-events: none;
  `;
};

const floatPanelContentStyles = css`
  float: left;
  position: relative;
  height: 100%;
  overflow: auto;
  pointer-events: all;

  /* styles to be overridden */
  width: ${panelWidth};
  color: black;
  background-color: white;
`;

const resultsFloatPanelContentStyles = css`
  ${floatPanelContentStyles}

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
  vertical-align: middle;
`;

const collapsePanelButton = css`
  margin-bottom: 10px !important;
  display: flex;
  justify-content: center;
  width: ${panelCollapseButtonWidth};
  padding: 1.5em 1em;
  margin: 0;
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
  const { calculateResults } = React.useContext(CalculateContext);
  const [
    currentPanel,
    setCurrentPanel, //
  ] = React.useState<PanelType | null>(null);
  const [latestStepIndex, setLatestStepIndex] = React.useState(-1);
  const [expanded, setExpanded] = React.useState(false);
  const toggleExpand = (panel: PanelType, panelIndex: number) => {
    if (panel === currentPanel) {
      setExpanded(false);
      setCurrentPanel(null);
    } else {
      setExpanded(true);
      setCurrentPanel(panel);
    }

    if (panelIndex > latestStepIndex) setLatestStepIndex(panelIndex);
  };

  const [resultsExpanded, setResultsExpanded] = React.useState(false);
  React.useEffect(() => {
    if (calculateResults.status !== 'none') {
      setResultsExpanded(true);
    }
  }, [calculateResults]);

  const [helpOpen, setHelpOpen] = React.useState(false);

  // determine how far to the right the expand/collapse buttons should be
  let expandLeft = navPanelWidth;
  if (expanded) {
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

  useCalculatePlan();

  return (
    <React.Fragment>
      <SplashScreenContent isOpen={helpOpen}>
        <div css={helpOkContainerStyles}>
          <button
            className="btn"
            css={helpOkButtonStyles}
            onClick={(ev) => setHelpOpen(false)}
          >
            OK
          </button>
        </div>
      </SplashScreenContent>
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
                  onClick={toggleExpand}
                />
              );
            })}
          </div>

          {calculateResults.status === 'fetching' && <LoadingSpinner />}
          {calculateResults.status === 'success' && calculateResults.data && (
            <div css={resourceTallyStyles}>
              <h4>Resource Tally</h4>
              <div css={resourceTallyContainerStyles}>
                <i className="fas fa-dollar-sign fa-fw" />{' '}
                {calculateResults.data['Total Cost'].toLocaleString()}
                <br />
                <i className="far fa-clock fa-fw" />{' '}
                {calculateResults.data['Total Time'].toLocaleString()} day(s)
                <hr css={resourceTallySeparator} />
              </div>
              {calculateResults.data['Limiting Time Factor'] && (
                <React.Fragment>
                  Limiting Factor
                  <br />
                  {calculateResults.data['Limiting Time Factor'] ===
                    'Sampling' && <i className="fas fa-users fa-fw" />}
                  {calculateResults.data['Limiting Time Factor'] ===
                    'Analysis' && <i className="fas fa-flask fa-fw" />}{' '}
                  <span css={limitingFactorStyles}>
                    {calculateResults.data['Limiting Time Factor']}
                  </span>
                </React.Fragment>
              )}
            </div>
          )}

          <button
            onClick={(ev) => setHelpOpen(!helpOpen)}
            css={navButtonStyles(false)}
          >
            <i className="fas fa-question" css={helpIconStyles} />
            Help
          </button>
        </div>
      </div>
      {currentPanel && (
        <div
          css={floatPanelStyles(panelWidth, height, navPanelWidth, expanded)}
        >
          <div css={floatPanelContentStyles}>
            {currentPanel.value === 'search' && <Search />}
            {currentPanel.value === 'addData' && <AddData />}
            {currentPanel.value === 'locateSamples' && <LocateSamples />}
            {currentPanel.value === 'calculate' && <Calculate />}
            {currentPanel.value === 'publish' && <Publish />}
          </div>
        </div>
      )}
      {currentPanel?.value === 'calculate' &&
        calculateResults.panelOpen === true && (
          <div
            css={floatPanelStyles(
              resultsPanelWidth,
              height,
              `calc(${navPanelWidth} + ${expanded ? panelWidth : '0px'})`,
              resultsExpanded,
            )}
          >
            <div css={resultsFloatPanelContentStyles}>
              <CalculateResults />
            </div>
          </div>
        )}
      {(currentPanel || calculateResults.panelOpen === true) && (
        <div
          css={floatPanelStyles(
            panelCollapseButtonWidth,
            height,
            expandLeft,
            true,
          )}
        >
          <div css={floatPanelButtonContainer(expanded)}>
            <div css={floatPanelTableContainer}>
              <div css={floatPanelTableCellContainer}>
                {currentPanel && (
                  <button
                    css={collapsePanelButton}
                    onClick={() => setExpanded(!expanded)}
                  >
                    <i
                      className={
                        expanded ? 'fas fa-angle-left' : 'fas fa-angle-right'
                      }
                    />
                  </button>
                )}
                {currentPanel?.value === 'calculate' &&
                  calculateResults.panelOpen === true && (
                    <button
                      css={resultsCollapsePanelButton}
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
    </React.Fragment>
  );
}

export default NavBar;
