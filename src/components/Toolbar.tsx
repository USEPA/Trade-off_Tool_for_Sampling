import React from 'react';
import styled from '@emotion/styled/macro';

const ToolbarContainer = styled.div`
  padding: 0.5rem;
  border: 1px solid #ccc;
`;

function Toolbar() {
  return (
    <ToolbarContainer>
      <small>(Toolbar)</small>
    </ToolbarContainer>
  );
}

export default Toolbar;
