/** @jsx jsx */

import React from 'react';
import { jsx, css } from '@emotion/core';
// contexts
import { SketchContext } from 'contexts/Sketch';
// config
import { epaMarginOffset } from 'config/appConfig';

const toolbarStyles = css`
  padding: 8px;
  background-color: lightgray;
  width: calc(100% + ${epaMarginOffset * 2 + 'px'});
  margin-left: -${epaMarginOffset}px;

  button {
    margin-bottom: 5px;
  }
`;

const buttonStyles = css`
  margin-top: 0.25rem;
  margin-right: 0.75rem;
`;

function TestingToolbar() {
  const { layers, map, mapView, sketchVM } = React.useContext(SketchContext);

  return (
    <div css={toolbarStyles}>
      <button css={buttonStyles} onClick={() => console.log('map: ', map)}>
        Log Map
      </button>
      <button css={buttonStyles} onClick={() => console.log('view: ', mapView)}>
        Log View
      </button>
      <button
        css={buttonStyles}
        onClick={() => console.log('layers: ', layers)}
      >
        Log Layers
      </button>
      <button
        css={buttonStyles}
        onClick={() => console.log('sketchVM: ', sketchVM)}
      >
        Log SketchVM
      </button>
      <button
        css={buttonStyles}
        onClick={() => {
          sessionStorage.clear();
        }}
      >
        Clear Session Data
      </button>
    </div>
  );
}

export default TestingToolbar;
