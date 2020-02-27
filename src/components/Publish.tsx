/** @jsx jsx */

import React from 'react';
import { jsx, css } from '@emotion/core';
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

// --- components (Publish) ---
function Publish() {
  const { portal } = React.useContext(AuthenticationContext);
  const { edits, setEdits, layers } = React.useContext(SketchContext);

  function runPublish() {
    if (!portal) return;

    const sampleLayers = layers.filter(
      (layer) => layer.layerType === 'Samples' || layer.layerType === 'VSP',
    );
    if (sampleLayers.length === 0) return;

    publish({
      portal,
      layers: sampleLayers,
      edits,
    })
      .then((res) => {
        console.log('publish res: ', res);
        setEdits({ count: 0, edits: [] });

        alert('Publish complete.');
      })
      .catch((err) => console.error('publish error: ', err));
  }

  return (
    <div css={panelContainer}>
      <h2>Publish</h2>
      <div>
        <button css={submitButtonStyles} onClick={runPublish}>
          Publish
        </button>
      </div>
    </div>
  );
}

export default Publish;
