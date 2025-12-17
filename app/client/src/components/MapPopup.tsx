/** @jsxImportSource @emotion/react */

import React, {
  Dispatch,
  Fragment,
  SetStateAction,
  useEffect,
  useState,
} from 'react';
import { createRoot } from 'react-dom/client';
import { css } from '@emotion/react';
import Select from 'components/Select';
//components
import MessageBox from 'components/MessageBox';
// types
import { EditsType } from 'types/Edits';
import { FieldInfos, LayerType } from 'types/Layer';
import { LayerProps } from 'types/Misc';
import { AppType } from 'types/Navigation';
// utils
import {
  getSketchableLayers,
  getZValue,
  setGeometryZValues,
} from 'utils/sketchUtils';
import { parseSmallFloat } from 'utils/utils';
// styles
import { colors, linkButtonStyles, reactSelectStyles } from 'styles';

type SaveStatusType = 'none' | 'success' | 'failure';

const maxFields = 4;

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
  min-height: 40px;
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
  appType: AppType;
  features: any[];
  edits: EditsType;
  setEdits: Dispatch<SetStateAction<EditsType>>;
  layers: LayerType[];
  fieldInfos: FieldInfos;
  layerProps: LayerProps;
  includeControls?: boolean;
  onClick: (
    appType: AppType,
    edits: EditsType,
    setEdits: Dispatch<SetStateAction<EditsType>>,
    layers: LayerType[],
    features: any[],
    type: string,
    newLayer?: LayerType | null,
  ) => void;
};

function MapPopup({
  appType,
  features,
  edits,
  setEdits,
  layers,
  fieldInfos,
  layerProps,
  includeControls = true,
  onClick,
}: Props) {
  // initializes the note and graphicNote whenever the graphic selection changes
  const [graphicNote, setGraphicNote] = useState('');
  const [note, setNote] = useState('');
  const [saveStatus, setSaveStatus] = useState<SaveStatusType>('none');
  useEffect(() => {
    // Get the note from the graphics attributes
    let allNotesSame = true;
    let firstNote = features?.[0]?.graphic?.attributes?.Notes;
    features.forEach((feature) => {
      const tempNote = feature?.graphic?.attributes?.Notes;
      if (firstNote !== tempNote) allNotesSame = false;
    });

    firstNote = firstNote ? firstNote : '';
    if (allNotesSame && graphicNote !== firstNote) {
      setGraphicNote(firstNote);
      setNote(firstNote);
      setSaveStatus('none');
    }
  }, [graphicNote, features]);

  // Reset the note, in the textbox, when the user selects a different sample.
  useEffect(() => {
    setNote(graphicNote);
  }, [features, graphicNote]);

  // Resets the layerInitialized state when the graphic selection changes
  const [layerInitialized, setLayerInitialized] = useState(false);
  useEffect(() => {
    setLayerInitialized(false);
  }, [features]);

  // Initializes the selected layer
  const [selectedLayer, setSelectedLayer] = useState<LayerType | null>(null);
  useEffect(() => {
    if (layerInitialized) return;

    if (features.length === 1 && features[0].graphic?.layer) {
      const activeLayerId = features[0].graphic.layer.id
        .replace('-points', '')
        .replace('-hybrid', '');
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
    } else if (features.length > 1) {
      let allSameLayer = true;
      const firstLayerId = features[0].graphic.layer.id
        .replace('-points', '')
        .replace('-hybrid', '');
      features.forEach((feature) => {
        const layerId = feature.graphic.layer.id
          .replace('-points', '')
          .replace('-hybrid', '');
        if (firstLayerId !== layerId) allSameLayer = false;
      });

      // find the layer
      const sketchLayer = layers.find(
        (layer) => layer.layerId === firstLayerId,
      );

      // set the selectedLayer if different
      if (
        allSameLayer &&
        sketchLayer &&
        sketchLayer.layerId !== selectedLayer?.layerId
      ) {
        setSelectedLayer(sketchLayer);
      } else {
        setSelectedLayer(null);
      }

      setLayerInitialized(true);
    } else {
      if (selectedLayer) setSelectedLayer(null);
    }
  }, [layerInitialized, features, selectedLayer, layers]);

  // Resets the save status if the user changes the note
  useEffect(() => {
    if (graphicNote !== note && saveStatus === 'success') setSaveStatus('none');
  }, [graphicNote, note, saveStatus]);

  const [graphicElevation, setGraphicElevation] = useState(0);
  const [elevation, setElevation] = useState(0);
  useEffect(() => {
    // Get the note from the graphics attributes
    let allSameZ = true;
    const firstZ = getZValue(features?.[0]?.graphic);
    features.forEach((feature) => {
      const tempZ = getZValue(feature?.graphic);
      if (firstZ !== tempZ) allSameZ = false;
    });

    if (allSameZ && graphicElevation !== firstZ) {
      setGraphicElevation(firstZ);
      setElevation(firstZ);
      setSaveStatus('none');
    }
  }, [graphicElevation, features]);

  // Reset the note, in the textbox, when the user selects a different sample.
  useEffect(() => {
    setElevation(graphicElevation);
  }, [features, graphicElevation]);

  // Resets the save status if the user changes the note
  useEffect(() => {
    if (graphicElevation !== elevation && saveStatus === 'success')
      setSaveStatus('none');
  }, [graphicElevation, elevation, saveStatus]);

  const [showMore, setShowMore] = useState(false);

  if (features?.length === 0) return null;

  // get the layers the graphic can be moved to
  const layerOptions: { label: string; options: LayerType[] }[] = [];
  edits.edits.forEach((edit) => {
    if (edit.type !== 'scenario') return;
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
  const activeLayer = features?.[0].graphic?.layer;
  const activeLayerId = activeLayer?.id
    .replace('-points', '')
    .replace('-hybrid', '');

  // get the notes character limit from the defaultFields
  let notesCharacterLimit = 2000;
  layerProps.defaultFields.forEach((field) => {
    if (field.name !== 'Notes' || !field.length) return;
    notesCharacterLimit = field.length;
  });

  let allNotesEmpty = true;
  let allNotesSame = true;
  const firstNote = features?.[0]?.graphic?.attributes?.Notes;
  features.forEach((feature) => {
    const tempNote = feature?.graphic?.attributes?.Notes;
    if (tempNote) allNotesEmpty = false;
    if (firstNote !== tempNote) allNotesSame = false;
  });

  return (
    <div css={containerStyles}>
      {fieldInfos.length > 0 && (
        <div css={inputContainerStyles}>
          <table className="esri-widget__table">
            <tbody>
              {fieldInfos.map((fieldInfo, index) => {
                if (includeControls && !showMore && index > maxFields)
                  return null;

                return (
                  <tr key={index}>
                    <th className="esri-feature__field-header">
                      {fieldInfo.label}
                    </th>
                    <td className="esri-feature__field-data">
                      {features[0].graphic.attributes[fieldInfo.fieldName]}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {includeControls && fieldInfos.length > maxFields && (
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
          )}
        </div>
      )}
      {includeControls && activeLayer?.title !== 'Sketched Sampling Mask' && (
        <Fragment>
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
              menuPortalTarget={document.body}
              styles={reactSelectStyles as any}
            />
          </div>
          <div>
            <label htmlFor="graphic-elevation">Elevation (m): </label>
            <br />
            <input
              id="graphic-elevation"
              type="number"
              css={noteStyles}
              value={elevation}
              onChange={(ev) => {
                setSaveStatus('none');
                setElevation(ev.target.valueAsNumber);
              }}
            />
          </div>
          <div>
            <label htmlFor="graphic-note">Note: </label>
            <br />
            <textarea
              id="graphic-note"
              css={noteStyles}
              value={note}
              maxLength={notesCharacterLimit}
              placeholder={
                !allNotesEmpty && !allNotesSame && fieldInfos.length === 0
                  ? `${appType === 'decon' ? 'Decon applications' : 'Samples'} have different notes...`
                  : ''
              }
              onChange={(ev) => {
                setSaveStatus('none');
                setNote(ev.target.value);
              }}
            />
            <br />
            <span>
              {note.length} / {notesCharacterLimit} characters
            </span>
          </div>
          {!allNotesEmpty &&
            graphicNote !== note &&
            fieldInfos.length === 0 && (
              <div>
                <MessageBox
                  severity="warning"
                  title="Notes will be overwritten"
                  message={`Some selected ${appType === 'decon' ? 'decon applications' : 'samples'} already have notes. Saving will overwrite those existing notes.`}
                />
              </div>
            )}
          <div css={saveButtonContainerStyles}>
            <button
              css={saveButtonStyles(saveStatus)}
              disabled={
                graphicNote === note &&
                activeLayerId === selectedLayer?.layerId &&
                graphicElevation === elevation
              }
              onClick={async (_ev) => {
                // set the notes
                try {
                  if (graphicNote !== note) {
                    features.forEach((feature) => {
                      feature.graphic.attributes['Notes'] = note;
                    });
                    setGraphicNote(note);
                  }

                  if (graphicElevation !== elevation) {
                    features.forEach((feature) => {
                      setGeometryZValues(feature.graphic.geometry, elevation);
                    });
                    setGraphicElevation(elevation);
                  }

                  // move the graphic if it is on a different layer
                  if (
                    activeLayerId
                      .replace('-points', '')
                      .replace('-hybrid', '') !==
                    selectedLayer?.layerId
                      .replace('-points', '')
                      .replace('-hybrid', '')
                  ) {
                    onClick(
                      appType,
                      edits,
                      setEdits,
                      layers,
                      features,
                      'Move',
                      selectedLayer,
                    );
                  } else if (graphicElevation !== elevation) {
                    onClick(
                      appType,
                      edits,
                      setEdits,
                      layers,
                      features,
                      'Update',
                      selectedLayer,
                    );
                  } else {
                    onClick(appType, edits, setEdits, layers, features, 'Save');
                  }

                  setSaveStatus('success');
                } catch (ex) {
                  console.error(ex);
                  setSaveStatus('failure');
                }
              }}
            >
              {(saveStatus === 'none' || saveStatus === 'success') && 'Save'}
              {saveStatus === 'failure' && (
                <Fragment>
                  <i className="fas fa-exclamation-triangle" /> Error
                </Fragment>
              )}
            </button>
          </div>
        </Fragment>
      )}
    </div>
  );
}

type MapPopupSimpleProps = {
  feature: any;
  fieldInfos: FieldInfos;
};

function MapPopupSimple({ feature, fieldInfos }: MapPopupSimpleProps) {
  const [showMore, setShowMore] = useState(false);

  return (
    <div css={containerStyles}>
      {fieldInfos.length > 0 && (
        <div css={inputContainerStyles}>
          <table className="esri-widget__table">
            <tbody>
              {fieldInfos.map((fieldInfo, index) => {
                if (!showMore && index > maxFields) return null;

                const fieldValue =
                  feature.graphic.attributes[fieldInfo.fieldName];
                const value =
                  fieldInfo.format === 'number'
                    ? (parseSmallFloat(fieldValue, 2) ?? '').toLocaleString()
                    : fieldValue;
                return (
                  <tr key={index}>
                    <th className="esri-feature__field-header">
                      {fieldInfo.label}
                    </th>
                    <td className="esri-feature__field-data">
                      {typeof value !== 'boolean'
                        ? value
                        : value
                          ? 'Yes'
                          : 'No'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {fieldInfos.length > maxFields && (
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
          )}
        </div>
      )}
    </div>
  );
}

export function contaminationMapPopup(feature: any) {
  const content = (
    <MapPopupSimple
      feature={feature}
      fieldInfos={[
        { label: 'Contamination Type', fieldName: 'CONTAMTYPE' },
        { label: 'Contamination Unit', fieldName: 'CONTAMUNIT' },
        { label: 'Contamination Value', fieldName: 'CONTAMVAL' },
        // { label: 'Contamination Reduced', fieldName: 'CONTAMREDUCED' },
        // { label: 'Contaminated', fieldName: 'CONTAMINATED' },
        // { label: 'Has Decontamination been Applied', fieldName: 'CONTAMHIT' },
        {
          fieldName: 'EXTERIOR',
          label: 'Contamination Value Building Exteriors',
        },
        {
          fieldName: 'INTERIOR',
          label: 'Contamination Value Building Interiors',
        },
        {
          fieldName: 'BRICK',
          label: 'Contamination Value Brick Buildings',
        },
        {
          fieldName: 'CONCRETE',
          label: 'Contamination Value Concrete Buildings',
        },
        {
          fieldName: 'STEEL',
          label: 'Contamination Value Steel Buildings',
        },
        {
          fieldName: 'WOOD',
          label: 'Contamination Value Wood Buildings',
        },
        {
          fieldName: 'OTHER',
          label: 'Contamination Value Other Buildings',
        },
        { label: 'FID', fieldName: 'FID' },
        { label: 'ID', fieldName: 'Id' },
      ]}
    />
  );

  // wrap the content for esri
  const contentContainer = document.createElement('div');
  createRoot(contentContainer).render(content);

  return contentContainer;
}

export function buildingMapPopup(feature: any) {
  feature.graphic.attributes.layerName =
    feature.graphic.layer.parent?.title ?? feature.graphic.layer.title;
  const fieldInfos: any[] = [
    { label: 'Layer', fieldName: 'layerName' },
    { label: 'Object ID', fieldName: 'OBJECTID' },
    { label: 'Building ID', fieldName: 'BUILD_ID' },
    { label: 'Building Occupancy Classification', fieldName: 'OCC_CLS' },
    { label: 'Primary Occupancy', fieldName: 'PRIM_OCC' },
    { label: 'Secondary Occupancy', fieldName: 'SEC_OCC' },
    { label: 'Model Building Type Code', fieldName: 'SOC' },
    { label: 'Address', fieldName: 'PROP_ADDR' },
    { label: 'City', fieldName: 'PROP_CITY' },
    { label: 'State', fieldName: 'PROP_ST' },
    { label: 'ZIP Code', fieldName: 'PROP_ZIP' },
    { label: 'Outbuilding or Non-Primary Structure', fieldName: 'OUTBLDG' },
    { label: 'Height (meters)', fieldName: 'HEIGHT', format: 'number' },
    {
      label: 'Footprint Square Meters',
      fieldName: 'SQMETERS',
      format: 'number',
    },
    { label: 'Footprint Square Feet', fieldName: 'SQFEET', format: 'number' },
    {
      label: 'Highest Ground Elevation (meters)',
      fieldName: 'H_ADJ_ELEV',
      format: 'number',
    },
    {
      label: 'Lowest Ground Elevation (meters)',
      fieldName: 'L_ADJ_ELEV',
      format: 'number',
    },
    {
      label: 'County FIPS',
      fieldName: 'FIPS',
    },
    { label: 'Census Tract Identifier', fieldName: 'CENSUSCODE' },
    { label: 'Production Date', fieldName: 'PROD_DATE' },
    { label: 'Source', fieldName: 'SOURCE' },
    {
      label: 'USNG Coordinates',
      fieldName: 'USNG',
    },
    { label: 'Longitude', fieldName: 'LONGITUDE' },
    { label: 'Latitude', fieldName: 'LATITUDE' },
    { label: 'Image Name', fieldName: 'IMAGE_NAME' },
    { label: 'Image Date', fieldName: 'IMAGE_DATE' },
    {
      label: 'Building Outline Validation Methodology',
      fieldName: 'VAL_METHOD',
    },
    { label: 'Remarks', fieldName: 'REMARKS' },
    { label: 'UUID', fieldName: 'UUID' },
    {
      label: 'State FIPS',
      fieldName: 'STATE_FIPS',
    },
    {
      label: 'Ext Area (square meters)',
      fieldName: 'extSqM',
      format: 'number',
    },
    {
      label: 'Ext Area (square feet)',
      fieldName: 'extSqFt',
      format: 'number',
    },
    {
      label: 'Int Area (square meters)',
      fieldName: 'intSqM',
      format: 'number',
    },
    {
      label: 'Int Area (square feet)',
      fieldName: 'intSqFt',
      format: 'number',
    },
    {
      label: 'Total Area (square meters)',
      fieldName: 'totalSqM',
      format: 'number',
    },
    {
      label: 'Total Area (square feet)',
      fieldName: 'totalSqFt',
      format: 'number',
    },
  ];

  if (window.location.search.includes('devMode=true')) {
    fieldInfos.push(
      ...[
        {
          label: 'Roof Area (square meters)',
          fieldName: 'roofSqM',
          format: 'number',
        },
        {
          label: 'Footprint Area (square meters)',
          fieldName: 'footprintSqM',
          format: 'number',
        },
        {
          label: 'Floors Area (square meters)',
          fieldName: 'floorsSqM',
          format: 'number',
        },
        {
          label: 'Ceilings Area (square meters)',
          fieldName: 'ceilingsSqM',
          format: 'number',
        },
        {
          label: 'Ext Walls Area (square meters)',
          fieldName: 'extWallsSqM',
          format: 'number',
        },
        {
          label: 'Int Walls Area (square meters)',
          fieldName: 'intWallsSqM',
          format: 'number',
        },
        {
          label: 'Ext Volume (cubic meters)',
          fieldName: 'extVolumeCubM',
          format: 'number',
        },
        {
          label: 'Int Volume (cubic meters)',
          fieldName: 'intVolumeCubM',
          format: 'number',
        },
        {
          label: 'Int Contents Volume (cubic meters)',
          fieldName: 'intVolumeContentsCubM',
          format: 'number',
        },
        {
          label: 'Roof Area (square feet)',
          fieldName: 'roofSqFt',
          format: 'number',
        },
        {
          label: 'Footprint Area (square feet)',
          fieldName: 'footprintSqFt',
          format: 'number',
        },
        {
          label: 'Floors Area (square feet)',
          fieldName: 'floorsSqFt',
          format: 'number',
        },
        {
          label: 'Ceilings Area (square feet)',
          fieldName: 'ceilingsSqFt',
          format: 'number',
        },
        {
          label: 'Ext Walls Area (square feet)',
          fieldName: 'extWallsSqFt',
          format: 'number',
        },
        {
          label: 'Int Walls Area (square feet)',
          fieldName: 'intWallsSqFt',
          format: 'number',
        },
        {
          label: 'Ext Volume (cubic feet)',
          fieldName: 'extVolumeCubFt',
          format: 'number',
        },
        {
          label: 'Int Volume (cubic feet)',
          fieldName: 'intVolumeCubFt',
          format: 'number',
        },
        {
          label: 'Int Contents Volume (cubic feet)',
          fieldName: 'intVolumeContentsCubFt',
          format: 'number',
        },
        {
          label: 'Ext Brick Area (square meters)',
          fieldName: 'extBrickSqM',
          format: 'number',
        },
        {
          label: 'Int Brick Area (square meters)',
          fieldName: 'intBrickSqM',
          format: 'number',
        },
        {
          label: 'Ext Volume Brick (cubic meters)',
          fieldName: 'extVolumeBrickCubM',
          format: 'number',
        },
        {
          label: 'Int Volume Brick (cubic meters)',
          fieldName: 'intVolumeBrickCubM',
          format: 'number',
        },
        {
          label: 'Int Contents Volume Brick (cubic meters)',
          fieldName: 'intVolumeBrickContentsCubM',
          format: 'number',
        },
        {
          label: 'Ext Concrete Area (square meters)',
          fieldName: 'extConcreteSqM',
          format: 'number',
        },
        {
          label: 'Int Concrete Area (square meters)',
          fieldName: 'intConcreteSqM',
          format: 'number',
        },
        {
          label: 'Ext Volume Concrete (cubic meters)',
          fieldName: 'extVolumeConcreteCubM',
          format: 'number',
        },
        {
          label: 'Int Volume Concrete (cubic meters)',
          fieldName: 'intVolumeConcreteCubM',
          format: 'number',
        },
        {
          label: 'Int Contents Volume Concrete (cubic meters)',
          fieldName: 'intVolumeConcreteContentsCubM',
          format: 'number',
        },
        {
          label: 'Ext Steel Area (square meters)',
          fieldName: 'extSteelSqM',
          format: 'number',
        },
        {
          label: 'Int Steel Area (square meters)',
          fieldName: 'intSteelSqM',
          format: 'number',
        },
        {
          label: 'Ext Volume Steel (cubic meters)',
          fieldName: 'extVolumeSteelCubM',
          format: 'number',
        },
        {
          label: 'Int Volume Steel (cubic meters)',
          fieldName: 'intVolumeSteelCubM',
          format: 'number',
        },
        {
          label: 'Int Contents Volume Steel (cubic meters)',
          fieldName: 'intVolumeSteelContentsCubM',
          format: 'number',
        },
        {
          label: 'Ext Wood Area (square meters)',
          fieldName: 'extWoodSqM',
          format: 'number',
        },
        {
          label: 'Int Wood Area (square meters)',
          fieldName: 'intWoodSqM',
          format: 'number',
        },
        {
          label: 'Ext Volume Wood (cubic meters)',
          fieldName: 'extVolumeWoodCubM',
          format: 'number',
        },
        {
          label: 'Int Volume Wood (cubic meters)',
          fieldName: 'intVolumeWoodCubM',
          format: 'number',
        },
        {
          label: 'Int Contents Volume Wood (cubic meters)',
          fieldName: 'intVolumeWoodContentsCubM',
          format: 'number',
        },
        {
          label: 'Ext Other Area (square meters)',
          fieldName: 'extOtherSqM',
          format: 'number',
        },
        {
          label: 'Int Other Area (square meters)',
          fieldName: 'intOtherSqM',
          format: 'number',
        },
        {
          label: 'Ext Volume Other (cubic meters)',
          fieldName: 'extVolumeOtherCubM',
          format: 'number',
        },
        {
          label: 'Int Volume Other (cubic meters)',
          fieldName: 'intVolumeOtherCubM',
          format: 'number',
        },
        {
          label: 'Int Contents Volume Other (cubic meters)',
          fieldName: 'intVolumeOtherContentsCubM',
          format: 'number',
        },
        {
          label: 'Ext Brick Area (square feet)',
          fieldName: 'extBrickSqFt',
          format: 'number',
        },
        {
          label: 'Int Brick Area (square feet)',
          fieldName: 'intBrickSqFt',
          format: 'number',
        },
        {
          label: 'Ext Volume Brick (cubic feet)',
          fieldName: 'extVolumeBrickCubFt',
          format: 'number',
        },
        {
          label: 'Int Volume Brick (cubic feet)',
          fieldName: 'intVolumeBrickCubFt',
          format: 'number',
        },
        {
          label: 'Int Contents Volume Brick (cubic feet)',
          fieldName: 'intVolumeBrickContentsCubFt',
          format: 'number',
        },
        {
          label: 'Ext Concrete Area (square feet)',
          fieldName: 'extConcreteSqFt',
          format: 'number',
        },
        {
          label: 'Int Concrete Area (square feet)',
          fieldName: 'intConcreteSqFt',
          format: 'number',
        },
        {
          label: 'Ext Volume Concrete (cubic feet)',
          fieldName: 'extVolumeConcreteCubFt',
          format: 'number',
        },
        {
          label: 'Int Volume Concrete (cubic feet)',
          fieldName: 'intVolumeConcreteCubFt',
          format: 'number',
        },
        {
          label: 'Int Contents Volume Concrete (cubic feet)',
          fieldName: 'intVolumeConcreteContentsCubFt',
          format: 'number',
        },
        {
          label: 'Ext Steel Area (square feet)',
          fieldName: 'extSteelSqFt',
          format: 'number',
        },
        {
          label: 'Int Steel Area (square feet)',
          fieldName: 'intSteelSqFt',
          format: 'number',
        },
        {
          label: 'Ext Volume Steel (cubic feet)',
          fieldName: 'extVolumeSteelCubFt',
          format: 'number',
        },
        {
          label: 'Int Volume Steel (cubic feet)',
          fieldName: 'intVolumeSteelCubFt',
          format: 'number',
        },
        {
          label: 'Int Contents Volume Steel (cubic feet)',
          fieldName: 'intVolumeSteelContentsCubFt',
          format: 'number',
        },
        {
          label: 'Ext Wood Area (square feet)',
          fieldName: 'extWoodSqFt',
          format: 'number',
        },
        {
          label: 'Int Wood Area (square feet)',
          fieldName: 'intWoodSqFt',
          format: 'number',
        },
        {
          label: 'Ext Volume Wood (cubic feet)',
          fieldName: 'extVolumeWoodCubFt',
          format: 'number',
        },
        {
          label: 'Int Volume Wood (cubic feet)',
          fieldName: 'intVolumeWoodCubFt',
          format: 'number',
        },
        {
          label: 'Int Contents Volume Wood (cubic feet)',
          fieldName: 'intVolumeWoodContentsCubFt',
          format: 'number',
        },
        {
          label: 'Ext Other Area (square feet)',
          fieldName: 'extOtherSqFt',
          format: 'number',
        },
        {
          label: 'Int Other Area (square feet)',
          fieldName: 'intOtherSqFt',
          format: 'number',
        },
        {
          label: 'Ext Volume Other (cubic feet)',
          fieldName: 'extVolumeOtherCubFt',
          format: 'number',
        },
        {
          label: 'Int Volume Other (cubic feet)',
          fieldName: 'intVolumeOtherCubFt',
          format: 'number',
        },
        {
          label: 'Int Contents Volume Other (cubic feet)',
          fieldName: 'intVolumeOtherContentsCubFt',
          format: 'number',
        },
        { label: 'Contamination Type', fieldName: 'CONTAMTYPE' },
        {
          label: 'Activity (Initial)',
          fieldName: 'CONTAMVALINITIAL',
        },
        { label: 'Activity (Final)', fieldName: 'CONTAMVAL' },
        { label: 'Unit of Measure', fieldName: 'CONTAMUNIT' },
      ],
    );
  }

  const content = <MapPopupSimple feature={feature} fieldInfos={fieldInfos} />;

  // wrap the content for esri
  const contentContainer = document.createElement('div');
  createRoot(contentContainer).render(content);

  return contentContainer;
}

export function imageryAnalysisMapPopup(feature: any) {
  feature.graphic.attributes.layerName =
    feature.graphic.layer.parent?.title ?? feature.graphic.layer.title;
  const content = (
    <MapPopupSimple
      feature={feature}
      fieldInfos={[
        { label: 'Layer', fieldName: 'layerName' },
        { label: 'Category', fieldName: 'category' },
        { label: 'Grid Code', fieldName: 'gridcode' },
      ]}
    />
  );

  // wrap the content for esri
  const contentContainer = document.createElement('div');
  createRoot(contentContainer).render(content);

  return contentContainer;
}

export default MapPopup;
