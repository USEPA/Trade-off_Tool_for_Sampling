/** @jsxImportSource @emotion/react */

import React, { useContext } from 'react';
import { css } from '@emotion/react';
// contexts
import { NavigationContext } from 'contexts/Navigation';
// types
import {
  deconPanels,
  isDecon,
  PanelValueType,
  samplingPanels,
} from 'config/navigation';

// --- styles (NavigationButton) ---
const containerStyles = css`
  display: flex;
  gap: 6px;
  justify-content: flex-end;
  margin-top: 10px;
`;

// --- components (NavigationButton) ---
type Props = {
  currentPanel: PanelValueType;
  includeSkipToPublish?: boolean;
};

function NavigationButton({
  currentPanel,
  includeSkipToPublish = false,
}: Props) {
  const { setGoTo } = useContext(NavigationContext);

  const panelConfig = isDecon() ? deconPanels : samplingPanels;
  const currentIndex = panelConfig.findIndex(
    (panel) => panel.value === currentPanel,
  );
  const nextPanel = panelConfig[currentIndex + 1]?.value;

  if (!nextPanel) return null;
  return (
    <div css={containerStyles}>
      {includeSkipToPublish && (
        <button onClick={(_ev) => setGoTo('publish')}>Skip to Publish</button>
      )}
      <button onClick={(_ev) => setGoTo(nextPanel)}>Next</button>
    </div>
  );
}

export default NavigationButton;
