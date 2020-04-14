/** @jsx jsx */

import React from 'react';
import { jsx, css } from '@emotion/core';
// components
import LoadingSpinner from 'components/LoadingSpinner';
import MessageBox from 'components/MessageBox';
// contexts
import { AuthenticationContext } from 'contexts/Authentication';
import { SketchContext } from 'contexts/Sketch';
// types
import { LayerType } from 'types/Layer';
// utils
import { isServiceNameAvailable } from 'utils/arcGisRestUtils';
import { updateLayerEdits } from 'utils/sketchUtils';
// styles
import { colors } from 'styles';

export type SaveStatusType =
  | 'none'
  | 'changes'
  | 'fetching'
  | 'success'
  | 'failure'
  | 'fetch-failure'
  | 'name-not-available';

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
type Props = {
  buttonText?: string;
  initialStatus?: SaveStatusType;
  onSave?: (saveStatus: SaveStatusType) => void;
};

function EditLayerMetaData({
  buttonText = 'Save',
  initialStatus = 'none',
  onSave,
}: Props) {
  const {
    portal,
    signedIn, //
  } = React.useContext(AuthenticationContext);
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
  ] = React.useState<SaveStatusType>(initialStatus);

  // Runs the callback for setting the parent's state.
  React.useEffect(() => {
    if (!onSave) return;

    onSave(saveStatus);
  }, [onSave, saveStatus]);

  // Saves the scenario name and description to the layer and edits objects.
  function updateLayersState() {
    if (!sketchLayer) return;

    // find the layer being edited
    const index = layers.findIndex(
      (layer) => layer.layerId === sketchLayer.layerId,
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

  // Handles saving of the layer's scenario name and description fields.
  // Also checks the uniqueness of the scenario name, if the user is signed in.
  function handleSave() {
    if (!sketchLayer) return;

    // if the user hasn't signed in go ahead and save the
    // scenario name and description
    if (!portal || !signedIn) {
      updateLayersState();
      return;
    }

    setSaveStatus('fetching');

    // if the user is signed in, go ahead and check if the
    // service (scenario) name is availble before continuing
    isServiceNameAvailable(portal, sketchLayer.scenarioName)
      .then((res: any) => {
        if (!res.available) {
          setSaveStatus('name-not-available');
          return;
        }

        updateLayersState();
      })
      .catch((err: any) => {
        console.error('isServiceNameAvailable error', err);
        setSaveStatus('failure');
      });
  }

  if (!sketchLayer) return null;

  return (
    <form
      onSubmit={(ev) => {
        ev.preventDefault();
      }}
    >
      <label htmlFor="scenario-name-input">Scenario Name</label>
      <input
        id="scenario-name-input"
        disabled={!sketchLayer}
        css={inputStyles}
        maxLength={250}
        placeholder="Published layer name"
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
        maxLength={2048}
        placeholder="Layer description (2048 characters)"
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

      {saveStatus === 'fetching' && <LoadingSpinner />}
      {saveStatus === 'failure' && (
        <MessageBox
          severity="error"
          title="Web Service Error"
          message="An error occurred in the web service"
        />
      )}
      {saveStatus === 'name-not-available' && (
        <MessageBox
          severity="warning"
          title="Scenario Name Not Available"
          message={`The "${sketchLayer?.scenarioName}" name is already in use. Please rename the scenario and try again.`}
        />
      )}
      <div css={saveButtonContainerStyles}>
        <button
          css={saveButtonStyles(saveStatus)}
          type="submit"
          disabled={
            saveStatus === 'none' ||
            saveStatus === 'fetching' ||
            saveStatus === 'success'
          }
          onClick={handleSave}
        >
          {(saveStatus === 'none' ||
            saveStatus === 'changes' ||
            saveStatus === 'fetching') &&
            buttonText}
          {saveStatus === 'success' && (
            <React.Fragment>
              <i className="fas fa-check" /> Saved
            </React.Fragment>
          )}
          {(saveStatus === 'failure' ||
            saveStatus === 'fetch-failure' ||
            saveStatus === 'name-not-available') && (
            <React.Fragment>
              <i className="fas fa-exclamation-triangle" /> Error
            </React.Fragment>
          )}
        </button>
      </div>
    </form>
  );
}

export default EditLayerMetaData;
