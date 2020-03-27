/** @jsx jsx */

import React from 'react';
import { jsx, css } from '@emotion/core';
// contexts
import { SketchContext } from 'contexts/Sketch';
// types
import { LayerType } from 'types/Layer';
// utils
import { updateLayerEdits } from 'utils/sketchUtils';
// styles
import { colors } from 'styles';

// --- styles (EditLayerMetaData) ---
const inputStyles = css`
  width: 100%;
  height: 36px;
  margin: 0;
  padding-left: 8px;
  border: 1px solid #ccc;
  border-radius: 4px;
`;

const saveButtonContainerStyles = css`
  display: flex;
  justify-content: flex-end;
`;

const saveButtonStyles = (status: string) => {
  let backgroundColor = '';
  if (status === 'success') {
    backgroundColor = `background-color: ${colors.green()};`;
  }
  if (status === 'failure') {
    backgroundColor = `background-color: ${colors.red()};`;
  }

  return css`
    margin: 5px 0;
    ${backgroundColor}
  `;
};

// --- components (EditLayerMetaData) ---
function EditLayerMetaData() {
  const {
    edits,
    setEdits,
    layers,
    setLayers,
    sketchLayer,
    setSketchLayer,
  } = React.useContext(SketchContext);

  const [
    saveStatus,
    setSaveStatus, //
  ] = React.useState<'none' | 'changes' | 'success' | 'failure'>('none');
  function updateLayersState(sketchLayer: LayerType) {
    // find the layer being edited
    const index = layers.findIndex(
      (layer) => layer.id === sketchLayer.id && layer.name === sketchLayer.name,
    );

    if (index === -1) {
      setSaveStatus('failure');
    } else {
      // make a copy of the edits context variable
      const editsCopy = updateLayerEdits({
        edits,
        layer: sketchLayer,
        type: 'properties',
      });
      setEdits(editsCopy);

      // updated the edited layer
      setLayers([
        ...layers.slice(0, index),
        sketchLayer,
        ...layers.slice(index + 1),
      ]);
      setSaveStatus('success');
    }
  }

  if (!sketchLayer) return null;

  return (
    <div>
      <label htmlFor="scenario-name-input">Scenario Name</label>
      <input
        id="scenario-name-input"
        disabled={!sketchLayer}
        css={inputStyles}
        value={sketchLayer.scenarioName}
        onChange={(ev) => {
          const newValue = ev.target.value;
          setSaveStatus('changes');
          if (sketchLayer) {
            setSketchLayer((sketchLayer: LayerType | null) => {
              if (!sketchLayer) return sketchLayer;
              return { ...sketchLayer, scenarioName: newValue };
            });
          }
        }}
      />

      <label htmlFor="scenario-description-input">Scenario Description</label>
      <input
        id="scenario-description-input"
        disabled={!sketchLayer}
        css={inputStyles}
        value={sketchLayer.scenarioDescription}
        onChange={(ev) => {
          const newValue = ev.target.value;
          setSaveStatus('changes');
          if (sketchLayer) {
            setSketchLayer((sketchLayer: LayerType | null) => {
              if (!sketchLayer) return sketchLayer;
              return { ...sketchLayer, scenarioDescription: newValue };
            });
          }
        }}
      />

      <div css={saveButtonContainerStyles}>
        <button
          css={saveButtonStyles(saveStatus)}
          disabled={saveStatus !== 'changes'}
          onClick={(ev) => {
            if (sketchLayer) updateLayersState(sketchLayer);
          }}
        >
          {saveStatus === 'none' && 'Save'}
          {saveStatus === 'changes' && 'Save'}
          {saveStatus === 'success' && (
            <React.Fragment>
              <i className="fas fa-check" /> Saved
            </React.Fragment>
          )}
          {saveStatus === 'failure' && (
            <React.Fragment>
              <i className="fas fa-exclamation-triangle" /> Error
            </React.Fragment>
          )}
        </button>
      </div>
    </div>
  );
}

export default EditLayerMetaData;
