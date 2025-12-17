/** @jsxImportSource @emotion/react */

import React, { useContext } from 'react';
import { css } from '@emotion/react';
// contexts
import { SketchContext } from 'contexts/Sketch';
// utils
import { clearDB } from 'utils/browserStorage';

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
  const {
    aoiSketchVM,
    layers,
    map,
    mapView,
    sceneView,
    selectedScenario,
    sketchVM,
  } = useContext(SketchContext);

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
        onClick={() => {
          console.log('selectedScenario: ', selectedScenario);
        }}
      >
        Log Selected Scenario
      </button>
      <button
        css={buttonStyles}
        onClick={() => console.log('layers: ', layers)}
      >
        Log Layers
      </button>
      <button
        css={buttonStyles}
        onClick={() => {
          console.log('sketchVM: ', sketchVM);
          console.log('aoiSketchVM: ', aoiSketchVM);
        }}
      >
        Log SketchVMs
      </button>
      <button css={buttonStyles} onClick={clearDB}>
        Clear IndexedDB Data
      </button>
    </div>
  );
}

export default TestingToolbar;
