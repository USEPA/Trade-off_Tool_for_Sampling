/** @jsx jsx */

import React from 'react';
import { jsx, css } from '@emotion/core';
import Select from 'components/Select';
// types
import { EditsType } from 'types/Edits';
import { FieldInfos, LayerType } from 'types/Layer';
// utils
import { getSketchableLayers } from 'utils/sketchUtils';
// styles
import { colors, linkButtonStyles } from 'styles';

type SaveStatusType = 'none' | 'success' | 'failure';

// --- styles (FeatureTool) ---
const containerStyles = css`
  padding: 6px;
  background-color: white;

  .sketch-button-selected {
    background-color: #f0f0f0;
    cursor: pointer;
  }

  .sketch-button-hidden {
    display: none;
  }
`;

const noteStyles = css`
  resize: vertical;
  min-height: 75px;
  width: 100%;
`;

const saveButtonContainerStyles = css`
  display: flex;
  justify-content: flex-end;
  height: 40.47px;
  align-items: center;
`;

const inputContainerStyles = css`
  margin-bottom: 10px;
`;

const iconStyles = css`
  margin-right: 5px;
`;

const saveButtonStyles = (status: SaveStatusType) => css`
  margin: 5px 0;
  ${status === 'failure' ? `background-color: ${colors.red()};` : ''}

  &:disabled {
    cursor: default;
    opacity: 0.65;
  }
`;

// --- components (FeatureTool) ---
type Props = {
  feature: any;
  selectedGraphicsIds: Array<string>;
  edits: EditsType;
  layers: LayerType[];
  fieldInfos: FieldInfos;
  onClick: (
    ev: React.MouseEvent<HTMLElement>,
    feature: any,
    type: string,
    newLayer?: LayerType | null,
  ) => void;
};

function MapPopup({
  feature,
  selectedGraphicsIds,
  edits,
  layers,
  fieldInfos,
  onClick,
}: Props) {
  // initializes the note and graphicNote whenever the graphic selection changes
  const [graphicNote, setGraphicNote] = React.useState('');
  const [note, setNote] = React.useState('');
  const [saveStatus, setSaveStatus] = React.useState<SaveStatusType>('none');
  React.useEffect(() => {
    // Reset the note if either no graphics are selected or multiple graphics
    // are selected. The note field only works if one graphic is selected.
    if (selectedGraphicsIds.length !== 1) {
      if (graphicNote) setGraphicNote('');
      if (note) setNote('');
      if (saveStatus !== 'none') setSaveStatus('none');
      return;
    }

    // Get the note from the graphics attributes
    if (feature?.graphic?.attributes) {
      let newNote = feature.graphic.attributes.Notes;
      newNote = newNote ? newNote : '';
      if (graphicNote !== newNote) {
        setGraphicNote(newNote);
        setNote(newNote);
        setSaveStatus('none');
      }
    }
  }, [graphicNote, note, saveStatus, feature, selectedGraphicsIds]);

  // Reset the note, in the textbox, when the user selects a different sample.
  React.useEffect(() => {
    setNote(graphicNote);
  }, [selectedGraphicsIds, graphicNote]);

  // Resets the layerInitialized state when the graphic selection changes
  const [layerInitialized, setLayerInitialized] = React.useState(false);
  React.useEffect(() => {
    setLayerInitialized(false);
  }, [selectedGraphicsIds]);

  // Initializes the selected layer
  const [selectedLayer, setSelectedLayer] = React.useState<LayerType | null>(
    null,
  );
  React.useEffect(() => {
    if (layerInitialized) return;

    if (feature?.graphic?.layer) {
      const activeLayerId = feature.graphic.layer.id;
      // find the layer
      const sketchLayer = layers.find(
        (layer) => layer.layerId === activeLayerId,
      );

      // set the selectedLayer if different
      if (sketchLayer && sketchLayer.layerId !== selectedLayer?.layerId) {
        setSelectedLayer(sketchLayer);
      }
      if (!sketchLayer && selectedLayer) {
        setSelectedLayer(null);
      }

      setLayerInitialized(true);
    } else {
      if (selectedLayer) setSelectedLayer(null);
    }
  }, [layerInitialized, feature, selectedLayer, layers]);

  // Resets the save status if the user changes the note
  React.useEffect(() => {
    if (graphicNote !== note && saveStatus === 'success') setSaveStatus('none');
  }, [graphicNote, note, saveStatus]);

  const [showMore, setShowMore] = React.useState(false);

  if (!feature || selectedGraphicsIds.length === 0) return null;

  // get the layers the graphic can be moved to
  const layerOptions: { label: string; options: LayerType[] }[] = [];
  edits.edits.forEach((edit) => {
    if (edit.type === 'layer') return;
    if (edit.layerType !== 'Samples' && edit.layerType !== 'VSP') return;

    layerOptions.push({
      label: edit.label,
      options: getSketchableLayers(layers, edit.layers),
    });
  });

  layerOptions.push({
    label: 'Unlinked Layers',
    options: getSketchableLayers(layers, edits.edits),
  });

  // get the sketch layer id
  const activeLayer = feature?.graphic?.layer;
  const activeLayerId = activeLayer?.id;

  return (
    <div css={containerStyles}>
      {selectedGraphicsIds.length === 1 && (
        <React.Fragment>
          <div css={inputContainerStyles}>
            {fieldInfos.length > 0 && (
              <table className="esri-widget__table">
                <tbody>
                  {fieldInfos.map((fieldInfo, index) => {
                    if (!showMore && index > 4) return null;

                    return (
                      <tr key={index}>
                        <th className="esri-feature__field-header">
                          {fieldInfo.label}
                        </th>
                        <td className="esri-feature__field-data">
                          {feature.graphic.attributes[fieldInfo.fieldName]}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
            <button
              css={linkButtonStyles}
              onClick={() => setShowMore(!showMore)}
            >
              <i
                css={iconStyles}
                className={`fas fa-arrow-${showMore ? 'up' : 'down'}`}
              />
              Show {showMore ? 'Less' : 'More'}
            </button>
          </div>
          {activeLayer?.title !== 'Sketched Sampling Mask' && (
            <React.Fragment>
              <div css={inputContainerStyles}>
                <label htmlFor="layer-change-select-input">Layer:</label>
                <Select
                  id="layer-change-select"
                  inputId="layer-change-select-input"
                  value={selectedLayer}
                  onChange={(ev) => {
                    setSaveStatus('none');
                    setSelectedLayer(ev as LayerType);
                  }}
                  options={layerOptions}
                />
              </div>
              <div>
                <label htmlFor="graphic-note">Note: </label>
                <br />
                <textarea
                  id="graphic-note"
                  css={noteStyles}
                  value={note}
                  onChange={(ev) => {
                    setSaveStatus('none');
                    setNote(ev.target.value);
                  }}
                />
              </div>
              <div css={saveButtonContainerStyles}>
                <button
                  css={saveButtonStyles(saveStatus)}
                  disabled={
                    graphicNote === note &&
                    activeLayerId === selectedLayer?.layerId
                  }
                  onClick={(ev) => {
                    // set the notes
                    if (feature?.graphic) {
                      feature.graphic.attributes['Notes'] = note;
                      setGraphicNote(note);

                      // move the graphic if it is on a different layer
                      if (activeLayerId !== selectedLayer?.layerId) {
                        onClick(ev, feature, 'Move', selectedLayer);
                      } else {
                        onClick(ev, feature, 'Save');
                      }

                      setSaveStatus('success');
                    } else {
                      setSaveStatus('failure');
                    }
                  }}
                >
                  {saveStatus === 'none' && 'Save'}
                  {saveStatus === 'failure' && (
                    <React.Fragment>
                      <i className="fas fa-exclamation-triangle" /> Error
                    </React.Fragment>
                  )}
                </button>
              </div>
            </React.Fragment>
          )}
        </React.Fragment>
      )}
    </div>
  );
}

export default MapPopup;
