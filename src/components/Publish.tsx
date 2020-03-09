/** @jsx jsx */

import React from 'react';
import { jsx, css } from '@emotion/core';
// components
import ShowLessMore from 'components/ShowLessMore';
// contexts
import { AuthenticationContext } from 'contexts/Authentication';
import { SketchContext } from 'contexts/Sketch';
// utils
import { publish } from 'utils/arcGisRestUtils';

// --- styles (Publish) ---
const panelContainer = css`
  padding: 20px;
`;

const submitButtonStyles = css`
  margin-top: 10px;
`;

const sectionContainer = css`
  margin-bottom: 10px;
`;

const layerInfo = css`
  padding-bottom: 0.5em;
`;

// --- components (Publish) ---
function Publish() {
  const { portal } = React.useContext(AuthenticationContext);
  const {
    edits,
    sketchLayer, //
  } = React.useContext(SketchContext);

  function runPublish() {
    if (!portal) return;

    if (!sketchLayer) return;

    const layerEdits = edits.edits.filter(
      (editLayer) =>
        editLayer.id === sketchLayer.id && editLayer.name === sketchLayer.name,
    );

    publish({
      portal,
      layers: [sketchLayer],
      edits: layerEdits,
    })
      .then((res) => {
        console.log('publish res: ', res);
        alert('Publish complete.');
      })
      .catch((err) => console.error('publish error: ', err));
  }

  return (
    <div css={panelContainer}>
      <h2>Publish</h2>

      <div css={sectionContainer}>
        <p css={layerInfo}>
          <strong>Layer Name: </strong>
          {sketchLayer?.name}
        </p>
        <p css={layerInfo}>
          <strong>Scenario Name: </strong>
          {sketchLayer?.scenarioName}
        </p>
        <p css={layerInfo}>
          <strong>Scenario Description: </strong>
          <ShowLessMore
            text={sketchLayer?.scenarioDescription}
            charLimit={20}
          />
        </p>
      </div>

      <div>
        <button css={submitButtonStyles} onClick={runPublish}>
          Publish
        </button>
      </div>
    </div>
  );
}

export default Publish;
