/** @jsx jsx */

import { jsx, css } from '@emotion/core';

const toolbarStyles = css`
  padding: 8px;
  border-bottom: 1px solid #ccc;
`;

function Toolbar() {
  return (
    <div css={toolbarStyles}>
      <small>(Toolbar)</small>
    </div>
  );
}

export default Toolbar;
