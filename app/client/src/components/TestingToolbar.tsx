/** @jsxImportSource @emotion/react */

import React, { useContext } from 'react';
import { css } from '@emotion/react';
// contexts
import { SketchContext } from 'contexts/Sketch';

const toolbarStyles = css`
  padding: 8px;
  background-color: lightgray;

  button {
    margin-bottom: 5px;
  }
`;

const buttonStyles = css`
  margin-top: 0.25rem;
  margin-right: 0.75rem;
`;

function TestingToolbar() {
  const { layers, map, mapView, sceneView, sketchVM } =
    useContext(SketchContext);

  return (
    <div css={toolbarStyles}>
      <button css={buttonStyles} onClick={() => console.log('map: ', map)}>
        Log Map
      </button>
      <button
        css={buttonStyles}
        onClick={() => {
          console.log('mapView: ', mapView);
          console.log('sceneView: ', sceneView);
        }}
      >
        Log Views
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
