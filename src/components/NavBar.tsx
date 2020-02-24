// emotion @jsx pragma docs: https://emotion.sh/docs/css-prop#jsx-pragma
/** @jsx jsx */

import React from 'react';
import { jsx, css } from '@emotion/core';
// components
import AddData from 'components/AddData';
import Calculate from 'components/Calculate';
import LocateSamples from 'components/LocateSamples';
import Publish from 'components/Publish';
import Search from 'components/Search';
import SplashScreenContent from 'components/SplashScreenContent';
// config
import { navPanelWidth } from 'config/appConfig';
// styles
import '@reach/dialog/styles.css';
import { colors } from 'styles';

const panelWidth = '325px';
const panelCollapseButtonWidth = '10px';

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
    background-color: ${selected ? '#FFFFFF' : 'transparent'};
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
  let color = '#01213B';
  if (panelIndex <= visitedStepIndex) color = '#00bde3';

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
    background-color: #012e51;
    padding-top: 15px;
  `;
};

const lastNavButtonStyles = css`
  ${navButtonStyles(false)}

  position: absolute;
  bottom: 15px;
`;

const helpIconStyles = css`
  font-size: 18px;
  padding: 7px;
  margin-left: 8px;
  margin-right: 10px;
  border-radius: 50%;
  color: #01213b;
  background-color: white;
  width: 30px;
  height: 30px;
  text-align: center;
`;

const floatPanelStyles = (height: number) => {
  return css`
    z-index: 99;
    position: absolute;
    height: ${height}px;
    left: ${navPanelWidth};
    width: ${panelWidth};
  `;
};

const floatPanelContentStyles = (expanded: boolean) => css`
  background-color: white;
  width: calc(${panelWidth} - ${panelCollapseButtonWidth});

  display: ${expanded ? 'inline' : 'none'};
  float: left;
  position: relative;
  height: 100%;
  overflow: auto;
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
  display: flex;
  justify-content: center;
  width: ${panelCollapseButtonWidth};
  padding: 1.5em 1em;
  margin: 0;
  border-radius: 0;
  background-color: white;
  color: black;
`;

// --- components (NavBar) ---
type Props = {
  height: number;
};

function NavBar({ height }: Props) {
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

  const [helpOpen, setHelpOpen] = React.useState(false);

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
        <button
          onClick={(ev) => setHelpOpen(!helpOpen)}
          css={lastNavButtonStyles}
        >
          <i className="fas fa-question" css={helpIconStyles} />
          Help
        </button>
      </div>
      <div css={floatPanelStyles(height)}>
        {currentPanel && (
          <React.Fragment>
            <div css={floatPanelContentStyles(expanded)}>
              {currentPanel.value === 'search' && <Search />}
              {currentPanel.value === 'addData' && <AddData />}
              {currentPanel.value === 'locateSamples' && <LocateSamples />}
              {currentPanel.value === 'calculate' && <Calculate />}
              {currentPanel.value === 'publish' && <Publish />}
            </div>
            <div css={floatPanelButtonContainer(expanded)}>
              <div css={floatPanelTableContainer}>
                <div css={floatPanelTableCellContainer}>
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
                </div>
              </div>
            </div>
          </React.Fragment>
        )}
      </div>
    </React.Fragment>
  );
}

export default NavBar;
