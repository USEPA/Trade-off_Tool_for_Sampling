/** @jsxImportSource @emotion/react */

import React from 'react';
import { css } from '@emotion/react';
// contexts
import { NavigationContext } from 'contexts/Navigation';
// types
import { PanelValueType } from 'config/navigation';

// --- styles (NavigationButton) ---
const containerStyles = css`
  justify-content: flex-end;
`;

const nextButtonStyles = css`
  float: right;
  margin-top: 10px;
`;

// --- components (NavigationButton) ---
type Props = {
  goToPanel: PanelValueType;
};

function NavigationButton({ goToPanel }: Props) {
  const { setGoTo } = React.useContext(NavigationContext);

  return (
    <div css={containerStyles}>
      <button
        css={nextButtonStyles}
        onClick={(ev) => {
          setGoTo(goToPanel);
        }}
      >
        Next
      </button>
    </div>
  );
}

export default NavigationButton;
