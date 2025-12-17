/** @jsxImportSource @emotion/react */

import React, { Fragment, useContext, useEffect, useState } from 'react';
import { css } from '@emotion/react';
import Graphic from '@arcgis/core/Graphic';
import GroupLayer from '@arcgis/core/layers/GroupLayer';
import SimpleMarkerSymbol from '@arcgis/core/symbols/SimpleMarkerSymbol';
// components
import { AccordionList, AccordionItem } from 'components/Accordion';
import ColorPicker from 'components/ColorPicker';
import { EditScenario, EditLayer } from 'components/EditLayerMetaData';
import GenerateSamples from 'components/GenerateSamples';
import MessageBox from 'components/MessageBox';
import NavigationButton from 'components/NavigationButton';
import Select from 'components/Select';
// contexts
import { LookupFilesContext } from 'contexts/LookupFiles';
import { SketchContext } from 'contexts/Sketch';
// types
import { LayerType } from 'types/Layer';
import { EditsType, ScenarioEditsType } from 'types/Edits';
// config
import { PolygonSymbol, SampleSelectType } from 'config/sampleAttributes';
// utils
import { use3dSketch, useDynamicPopup, useStartOver } from 'utils/hooks';
import {
  activateSketchButton,
  convertToPoint,
  createLayer,
  createSampleLayer,
  deepCopyObject,
  findLayerInEdits,
  generateUUID,
  getCurrentDateTime,
  getDefaultSamplingMaskLayer,
  getNextScenarioLayer,
  getScenarios,
  getSketchableLayers,
  updateLayerEdits,
} from 'utils/sketchUtils';
import { getNewName, getScenarioName } from 'utils/utils';
// styles
import { isDecon, reactSelectStyles } from 'styles';

// --- styles (SketchButton) ---
const buttonContainerStyles = css`
  display: flex;
  align-items: end;
`;

const panelContainer = css`
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  min-height: 100%;

  .sketch-button-selected {
    background-color: #e7f6f8;
  }

  .sketch-button-selected > div {
    border: 2px solid #01bde3;
  }
`;

const sectionContainer = css`
  padding: 20px;
`;

const sectionContainerWidthOnly = css`
  padding: 0 20px;
`;

const layerSelectStyles = css`
  margin-bottom: 10px;
`;

const sketchButtonContainerStyles = css`
  margin-left: 1px;
  margin-top: 1px;
`;

const sketchButtonStyles = css`
  position: relative;
  height: 90px;
  width: 33.33%;
  background-color: white;
  color: black;
  border: 1px solid #ccc;
  border-radius: 0;
  margin: 0 0 -1px -1px;

  &::before,
  &::after {
    content: '';
    display: block;
    padding-top: 50%;
  }

  &:hover,
  &:focus {
    background-color: #e7f6f8;
    cursor: pointer;
  }
`;

const textContainerStyles = css`
  position: absolute;
  top: 0;
  left: 0;
  bottom: 0;
  right: 0;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const textStyles = css`
  max-height: 85px;
  word-break: break-word;
`;

const sampleCountStyles = css`
  font-size: 26px;
  color: #0085e3;
`;

// --- components (SketchButton) ---
type SketchButtonProps = {
  value: string;
  label: string;
  iconClass: string;
  layers: LayerType[];
  selectedScenario: ScenarioEditsType | null;
  onClick: () => void;
};

function SketchButton({
  value,
  label,
  iconClass,
  layers,
  selectedScenario,
  onClick,
}: SketchButtonProps) {
  // put an ellipses on the end if the text is to long
  const displayLabel = label.length > 30 ? `${label.substr(0, 30)}...` : label;
  let count = 0;

  layers.forEach((layer) => {
    if (layer.layerType !== 'Samples' && layer.layerType !== 'VSP') return;
    if (layer.sketchLayer?.type !== 'graphics') return;
    if (layer?.parentLayer?.id !== selectedScenario?.layerId) return;

    layer.sketchLayer.graphics.forEach((graphic) => {
      if (graphic.attributes.TYPEUUID === value) count += 1;
    });
  });

  return (
    <button
      id={`draw-sample-${value}`}
      title={`Draw a ${label}: ${count}`}
      className="sketch-button"
      onClick={() => onClick()}
      css={sketchButtonStyles}
    >
      <div css={textContainerStyles}>
        <div css={textStyles}>
          <i className={iconClass} />
          <br />
          {displayLabel}
          {count > 0 && (
            <Fragment>
              <br />
              <span css={sampleCountStyles}>{count}</span>
            </Fragment>
          )}
        </div>
      </div>
    </button>
  );
}

// --- styles (LocateSamples) ---
const headerContainer = css`
  display: flex;
  align-items: center;
  justify-content: space-evenly;
`;

const headerStyles = css`
  margin: 0;
  padding: 0;
`;

const iconButtonContainerStyles = css`
  display: flex;
  justify-content: space-between;
`;

const iconButtonStyles = css`
  width: 25px;
  margin: 0 2px;
  padding: 0.25em 0;
  color: black;
  background-color: white;
  border-radius: 0;
  line-height: 16px;
  text-decoration-line: none;
  font-weight: bold;

  &:hover {
    background-color: white;
  }
`;

const deleteButtonStyles = css`
  width: 75px;
  margin-bottom: 0;
  padding: 0.25em 0;
  color: black;
  background-color: white;
  border-radius: 0;
  line-height: 16px;
  text-decoration-line: none;
  font-weight: bold;

  &:hover {
    background-color: white;
  }
`;

const lineSeparatorStyles = css`
  border-bottom: 1px solid #d8dfe2;
`;

const sketchGroupingStyles = css`
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
`;

const verticalCenterTextStyles = css`
  display: flex;
  align-items: center;
`;

// --- components (LocateSamples) ---
function LocateSamples() {
  const { sampleTypes } = useContext(LookupFilesContext);
  const {
    defaultSymbols,
    setDefaultSymbolSingle,
    displayDimensions,
    edits,
    setEdits,
    layersInitialized,
    layers,
    setLayers,
    map,
    selectedScenario,
    setSelectedScenario,
    sketchLayer,
    setSketchLayer,
    aoiSketchLayer,
    setAoiSketchLayer,
    sketchVM,
    aoiSketchVM,
    sampleAttributes,
    userDefinedOptions,
    userDefinedAttributes,
    displayGeometryType,
    sceneView,
    mapView,
  } = useContext(SketchContext);
  const startOver = useStartOver();
  const { endSketch, startSketch } = use3dSketch('sampling');
  const getPopupTemplate = useDynamicPopup('sampling');

  // Sets the sketchLayer to the first layer in the layer selection drop down,
  // if available. If the drop down is empty, an empty sketchLayer will be
  // created.
  const [
    sketchLayerInitialized,
    setSketchLayerInitialized, //
  ] = useState(false);
  useEffect(() => {
    if (!map || !layersInitialized || sketchLayerInitialized) return;

    setSketchLayerInitialized(true);

    const { nextScenario, nextLayer } = getNextScenarioLayer(
      edits,
      layers,
      selectedScenario,
      sketchLayer,
    );

    if (nextScenario) setSelectedScenario(nextScenario);
    if (nextLayer) setSketchLayer(nextLayer);
  }, [
    edits,
    layersInitialized,
    layers,
    setLayers,
    map,
    selectedScenario,
    setSelectedScenario,
    sketchLayer,
    setSketchLayer,
    sketchLayerInitialized,
  ]);

  // Initializes the aoi layer for performance reasons
  useEffect(() => {
    if (!map || !layersInitialized || aoiSketchLayer) return;

    const maskLayer = layers.find((l) => l.name === 'Sketched Sampling Mask');
    if (maskLayer) {
      setAoiSketchLayer(maskLayer);
      return;
    }

    const newAoiSketchLayer = getDefaultSamplingMaskLayer();

    // add the layer to the map
    setLayers((layers) => {
      return [...layers, newAoiSketchLayer];
    });

    // set the active sketch layer
    setAoiSketchLayer(newAoiSketchLayer);
  }, [
    map,
    aoiSketchLayer,
    layers,
    setAoiSketchLayer,
    layersInitialized,
    setLayers,
  ]);

  // Handle a user clicking one of the sketch buttons
  function sketchButtonClick(label: string) {
    if (!sketchVM || !map || !sketchLayer || !sceneView || !mapView) return;

    // put the sketch layer on the map, if it isn't there already and
    // is not part of a group layer
    const layerIndex = map.layers.findIndex(
      (layer) => layer.id === sketchLayer.layerId,
    );
    if (
      layerIndex === -1 &&
      !sketchLayer.parentLayer &&
      sketchLayer.sketchLayer
    ) {
      map.add(sketchLayer.sketchLayer);
    }

    // save changes from other sketchVM and disable to prevent
    // interference
    if (aoiSketchVM) {
      aoiSketchVM.cancel();
    }

    // determine whether the sketch button draws points or polygons
    const attributes = sampleAttributes[label as any];
    const shapeType = attributes.ShapeType;

    // make the style of the button active
    const wasSet = activateSketchButton(`draw-sample-${label}`);

    // update the sketchVM symbol
    let symbolType = 'Samples';
    if (Object.prototype.hasOwnProperty.call(defaultSymbols.symbols, label))
      symbolType = label;

    const isPath = attributes.POINT_STYLE.includes('path|');
    const pointProps = {
      color: defaultSymbols.symbols[symbolType].color,
      outline: defaultSymbols.symbols[symbolType].outline,
      style: isPath ? 'path' : attributes.POINT_STYLE,
    } as any;
    if (isPath) pointProps.path = attributes.POINT_STYLE.replace('path|', '');

    sketchVM['2d'].polygonSymbol = defaultSymbols.symbols[symbolType] as any;
    sketchVM['2d'].pointSymbol = new SimpleMarkerSymbol(pointProps);
    sketchVM['3d'].polygonSymbol = defaultSymbols.symbols[symbolType] as any;
    sketchVM['3d'].pointSymbol = new SimpleMarkerSymbol(pointProps);

    // let the user draw/place the shape
    if (wasSet) startSketch(shapeType);
    else endSketch();
  }

  // Changes the selected layer if the scenario is changed. The first
  // available layer in the scenario will be chosen. If the scenario
  // has no layers, then the first availble unlinked layer is chosen.
  useEffect(() => {
    if (!selectedScenario || selectedScenario.type !== 'scenario') return;
    if (
      sketchLayer &&
      (!sketchLayer.parentLayer ||
        sketchLayer.parentLayer.id === selectedScenario.layerId)
    ) {
      return;
    }

    // select the first layer within the selected scenario
    if (selectedScenario.layers.length > 0) {
      const newSketchLayer = layers.find(
        (layer) => layer.layerId === selectedScenario.layers[0].layerId,
      );
      if (newSketchLayer) {
        setSketchLayer(newSketchLayer);
        return;
      }
    }

    // select the first unlinked layer
    const newSketchLayer = layers.find(
      (layer) =>
        (layer.layerType === 'Samples' || layer.layerType === 'VSP') &&
        !layer.parentLayer,
    );
    if (newSketchLayer) setSketchLayer(newSketchLayer);
    else setSketchLayer(null);
  }, [layers, selectedScenario, sketchLayer, setSketchLayer]);

  // scenario and layer edit UI visibility controls
  const [addScenarioVisible, setAddScenarioVisible] = useState(false);
  const [editScenarioVisible, setEditScenarioVisible] = useState(false);
  const [addLayerVisible, setAddLayerVisible] = useState(false);
  const [editLayerVisible, setEditLayerVisible] = useState(false);

  // get a list of scenarios from edits
  const scenarios = getScenarios(edits);

  // build the list of layers to be displayed in the sample layer dropdown
  const sampleLayers: { label: string; options: LayerType[] }[] = [];
  if (
    selectedScenario &&
    selectedScenario.type === 'scenario' &&
    selectedScenario.layers.length > 0
  ) {
    // get layers for the selected scenario
    sampleLayers.push({
      label: selectedScenario.label,
      options: getSketchableLayers(layers, selectedScenario.layers),
    });
  }

  // get unlinked layers
  sampleLayers.push({
    label: 'Unlinked Layers',
    options: getSketchableLayers(layers, edits.edits),
  });

  const establishedSampleTypes: SampleSelectType[] = [];
  const innovativeSampleTypes: SampleSelectType[] = [];
  sampleTypes?.sampleSelectOptions?.forEach((s) => {
    if (s.isInnovative) innovativeSampleTypes.push(s);
    else establishedSampleTypes.push(s);
  });

  return (
    <div css={panelContainer}>
      <div>
        <div css={sectionContainer}>
          <h2 css={headerStyles}>Create Plan</h2>
          <div css={headerContainer}>
            <button css={deleteButtonStyles} onClick={startOver}>
              <i className="fas fa-redo-alt" />
              <br />
              Start Over
            </button>
            <button
              css={deleteButtonStyles}
              onClick={() => {
                if (!sketchVM || !sketchLayer) return;

                // make a copy of the edits context variable
                const editsCopy = updateLayerEdits({
                  appType: 'sampling',
                  edits,
                  layer: sketchLayer,
                  type: 'delete',
                  changes: sketchVM[displayDimensions].layer.graphics,
                });

                setEdits(editsCopy);

                sketchVM[displayDimensions].layer.removeAll();
                (
                  sketchVM[displayDimensions].layer as any
                ).parent.layers.forEach((layer: any) => {
                  if (
                    layer.id ===
                    sketchVM[displayDimensions].layer.id + '-points'
                  ) {
                    layer.removeAll();
                  }
                  if (
                    layer.id ===
                    sketchVM[displayDimensions].layer.id + '-hybrid'
                  ) {
                    layer.removeAll();
                  }
                });
              }}
            >
              <i className="fas fa-trash-alt" />
              <br />
              Delete All Samples
            </button>
          </div>
        </div>
        <div css={lineSeparatorStyles} />
        <div css={sectionContainer}>
          {selectedScenario ? (
            <p>
              An empty sample layer is loaded by default. Use the "Active
              Sampling Layer" controls to link, add, modify, and/or delete the
              sampling layer associated with the active plan. You may associate
              multiple layers with a plan by selecting sampling layers from the
              menu and clicking the link icon. The menu will display linked
              layers and indicate other layers available for linking. Use the
              “unlink” control to remove a layer from a plan.
            </p>
          ) : (
            <Fragment>
              <p>
                Create a sampling plan with one or more layers. Layers can
                represent unique areas of interest or decision units that are
                differentiated by the user-defined descriptions (e.g., Floor 1,
                East Stairwell, Team 1, etc.). Enter a plan name and description
                and click Save.
              </p>
              <MessageBox
                severity="warning"
                title=""
                message="Note: Your work in TOTS only persists as long as your current browser session. Be sure to download results and/or publish your plan to retain a copy of your work."
              />
            </Fragment>
          )}

          {scenarios.length === 0 ? (
            <EditScenario addDefaultSampleLayer={true} appType="sampling" />
          ) : (
            <Fragment>
              <div css={iconButtonContainerStyles}>
                <div css={verticalCenterTextStyles}>
                  <label htmlFor="scenario-select-input">Specify Plan</label>
                </div>
                <div>
                  {selectedScenario && selectedScenario.type === 'scenario' && (
                    <Fragment>
                      <button
                        css={iconButtonStyles}
                        title="Delete Plan"
                        onClick={() => {
                          // remove all of the child layers
                          setLayers((layers) => {
                            return layers.filter(
                              (layer) =>
                                selectedScenario.layers.findIndex(
                                  (scenarioLayer) =>
                                    scenarioLayer.layerId === layer.layerId,
                                ) === -1,
                            );
                          });

                          // remove the scenario from edits
                          const newEdits: EditsType = {
                            count: edits.count + 1,
                            edits: edits.edits.filter(
                              (item) =>
                                item.layerId !== selectedScenario.layerId,
                            ),
                          };
                          setEdits(newEdits);

                          // select the next available scenario
                          const scenarios = getScenarios(newEdits);
                          setSelectedScenario(
                            scenarios.length > 0 ? scenarios[0] : null,
                          );

                          if (!map) return;

                          // make the new selection visible
                          if (scenarios.length > 0) {
                            const newSelection = map.layers.find(
                              (layer) => layer.id === scenarios[0].layerId,
                            );
                            if (newSelection) newSelection.visible = true;
                          }

                          // remove the scenario from the map
                          const mapLayer = map.layers.find(
                            (layer) => layer.id === selectedScenario.layerId,
                          );
                          map.remove(mapLayer);
                        }}
                      >
                        <i className="fas fa-trash-alt" />
                        <span className="sr-only">Delete Plan</span>
                      </button>
                      <button
                        css={iconButtonStyles}
                        title="Clone Scenario"
                        onClick={(_ev) => {
                          if (!map) return;

                          // get the name for the new layer
                          const newScenarioName = getScenarioName(
                            edits,
                            selectedScenario.label,
                          );

                          // get the edits from the selected scenario
                          const selectedScenarioEdits = findLayerInEdits(
                            edits.edits,
                            selectedScenario.layerId,
                          ).editsScenario;
                          if (!selectedScenarioEdits) return;

                          // copy the edits for that scenario
                          const copiedScenario: ScenarioEditsType =
                            deepCopyObject(selectedScenarioEdits);

                          // find the selected group layer
                          const selectedGroupLayer = map.layers.find(
                            (layer) => layer.id === copiedScenario.layerId,
                          );

                          // create a new group layer for the cloned scenario
                          const groupLayer = new GroupLayer({
                            title: newScenarioName,
                            visible: selectedGroupLayer.visible,
                            listMode: selectedGroupLayer.listMode,
                          });

                          // update the name and id for the copied scenario
                          copiedScenario.addedFrom = 'sketch';
                          copiedScenario.editType = 'add';
                          copiedScenario.hasContaminationRan = false;
                          copiedScenario.id = -1;
                          copiedScenario.label = newScenarioName;
                          copiedScenario.layerId = groupLayer.id;
                          copiedScenario.name = newScenarioName;
                          copiedScenario.pointsId = -1;
                          copiedScenario.portalId = '';
                          copiedScenario.scenarioName = newScenarioName;
                          copiedScenario.status = 'added';
                          copiedScenario.value = groupLayer.id;

                          // loop through and generate new uuids for layers/graphics
                          const timestamp = getCurrentDateTime();
                          copiedScenario.layers.forEach((layer) => {
                            // update info for layer
                            const layerUuid = generateUUID();
                            layer.addedFrom = 'sketch';
                            layer.editType = 'add';
                            layer.hasContaminationRan = false;
                            layer.id = -1;
                            layer.layerId = layerUuid;
                            layer.pointsId = -1;
                            layer.portalId = '';
                            layer.status = 'added';
                            layer.uuid = layerUuid;

                            // update info for combine adds, published, and updates
                            const newAdds = [...layer.adds, ...layer.updates];
                            layer.published.forEach((sample) => {
                              const alreadyAdded =
                                newAdds.findIndex(
                                  (addedSample) =>
                                    addedSample.attributes
                                      .PERMANENT_IDENTIFIER ===
                                    sample.attributes.PERMANENT_IDENTIFIER,
                                ) > -1;
                              if (!alreadyAdded) newAdds.push(sample);
                            });
                            layer.adds = newAdds;

                            // update info for adds
                            layer.adds.forEach((sample) => {
                              const sampleUuid = generateUUID();
                              sample.attributes.CREATEDDATE = timestamp;
                              sample.attributes.DECISIONUNITUUID = layerUuid;
                              sample.attributes.GLOBALID = sampleUuid;
                              sample.attributes.OBJECTID = -1;
                              sample.attributes.PERMANENT_IDENTIFIER =
                                sampleUuid;
                              sample.attributes.UPDATEDDATE = timestamp;
                            });

                            // clear out deletes, updates, and published
                            layer.deletes = [];
                            layer.updates = [];
                            layer.published = [];
                          });

                          const newLayers: LayerType[] = [];
                          const scenarioLayers: __esri.GraphicsLayer[] = [];
                          copiedScenario.layers.forEach((layer) => {
                            scenarioLayers.push(
                              ...createLayer({
                                defaultSymbols,
                                editsLayer: layer,
                                getPopupTemplate,
                                newLayers,
                                parentLayer: groupLayer,
                              }),
                            );
                          });
                          groupLayer.addMany(scenarioLayers);
                          map.add(groupLayer);

                          setLayers((layers) => {
                            return [...layers, ...newLayers];
                          });

                          const fullCopyEdits: EditsType =
                            deepCopyObject(edits);
                          fullCopyEdits.edits.push(copiedScenario);

                          setEdits(fullCopyEdits);

                          setSelectedScenario(copiedScenario);
                        }}
                      >
                        <i className="fas fa-clone" />
                        <span className="sr-only">Clone Scenario</span>
                      </button>
                      {selectedScenario.status !== 'published' && (
                        <button
                          css={iconButtonStyles}
                          title={editScenarioVisible ? 'Cancel' : 'Edit Plan'}
                          onClick={() => {
                            setAddScenarioVisible(false);
                            setEditScenarioVisible(!editScenarioVisible);
                          }}
                        >
                          <i
                            className={
                              editScenarioVisible
                                ? 'fas fa-times'
                                : 'fas fa-edit'
                            }
                          />
                          <span className="sr-only">
                            {editScenarioVisible ? 'Cancel' : 'Edit Plan'}
                          </span>
                        </button>
                      )}
                    </Fragment>
                  )}
                  <button
                    css={iconButtonStyles}
                    title={addScenarioVisible ? 'Cancel' : 'Add Plan'}
                    onClick={() => {
                      setEditScenarioVisible(false);
                      setAddScenarioVisible(!addScenarioVisible);
                    }}
                  >
                    <i
                      className={
                        addScenarioVisible ? 'fas fa-times' : 'fas fa-plus'
                      }
                    />
                    <span className="sr-only">
                      {addScenarioVisible ? 'Cancel' : 'Add Plan'}
                    </span>
                  </button>
                </div>
              </div>
              <Select
                id="scenario-select-input-container"
                inputId="scenario-select-input"
                css={layerSelectStyles}
                styles={reactSelectStyles as any}
                isDisabled={addScenarioVisible || editScenarioVisible}
                value={selectedScenario}
                onChange={(ev) => {
                  const newScenario = ev as ScenarioEditsType;
                  setSelectedScenario(newScenario);

                  // update the visiblity of layers
                  layers.forEach((layer) => {
                    const layersToIgnore = [
                      'AOI Analysis',
                      'AOI Assessed',
                      'Decon Mask',
                      'Image Analysis',
                    ];
                    if (layersToIgnore.includes(layer.layerType)) return;

                    if (layer.parentLayer) {
                      layer.parentLayer.visible =
                        layer.parentLayer.id === newScenario.layerId
                          ? true
                          : false;
                      return;
                    }

                    if (
                      layer.layerType === 'Samples' ||
                      layer.layerType === 'VSP'
                    ) {
                      if (layer.sketchLayer) layer.sketchLayer.visible = false;
                    }
                  });

                  setEdits((edits) => ({
                    count: edits.count + 1,
                    edits: edits.edits.map((edit) => {
                      if (edit.type === 'layer-aoi-analysis') return edit;

                      let visible = edit.visible;
                      if (edit.type === 'scenario') {
                        visible =
                          edit.layerId === newScenario.layerId ? true : false;
                      }
                      if (edit.type === 'layer') {
                        if (
                          edit.layerType === 'Samples' ||
                          edit.layerType === 'VSP'
                        ) {
                          visible = false;
                        }
                      }

                      return {
                        ...edit,
                        visible,
                      };
                    }),
                  }));
                }}
                options={scenarios}
              />
              {addScenarioVisible && (
                <EditScenario
                  appType="sampling"
                  onSave={(saveResults) => {
                    if (saveResults?.status !== 'success') return;
                    setAddScenarioVisible(false);
                  }}
                />
              )}
              {editScenarioVisible && (
                <EditScenario
                  appType="sampling"
                  initialScenario={selectedScenario}
                  onSave={(saveResults) => {
                    if (saveResults?.status !== 'success') return;
                    setEditScenarioVisible(false);
                  }}
                />
              )}
            </Fragment>
          )}

          {selectedScenario && !addScenarioVisible && !editScenarioVisible && (
            <Fragment>
              <div css={iconButtonContainerStyles}>
                <div css={verticalCenterTextStyles}>
                  <label htmlFor="sampling-layer-select-input">
                    Active
                    <br />
                    Sampling Layer
                  </label>
                </div>
                <div css={buttonContainerStyles}>
                  {sketchLayer && (
                    <Fragment>
                      {sketchLayer.parentLayer ? (
                        <button
                          css={iconButtonStyles}
                          title="Unlink Layer"
                          onClick={() => {
                            if (!map) return;

                            // update edits (move the layer to the root)
                            setEdits((edits) => {
                              const {
                                scenarioIndex,
                                layerIndex,
                                editsScenario,
                                editsLayer,
                              } = findLayerInEdits(
                                edits.edits,
                                sketchLayer.layerId,
                              );

                              if (
                                editsScenario &&
                                editsScenario.type === 'scenario'
                              ) {
                                editsScenario.layers = [
                                  ...editsScenario.layers.slice(0, layerIndex),
                                  ...editsScenario.layers.slice(layerIndex + 1),
                                ];
                                if (editsScenario.status === 'published') {
                                  editsScenario.status = 'edited';
                                }

                                return {
                                  count: edits.count + 1,
                                  edits: [
                                    ...edits.edits.slice(0, scenarioIndex),
                                    editsScenario,
                                    ...edits.edits.slice(scenarioIndex + 1),
                                    {
                                      ...editsLayer,
                                      visible: false,
                                    },
                                  ],
                                };
                              }

                              return {
                                count: edits.count + 1,
                                edits: [...edits.edits, editsLayer],
                              };
                            });

                            // remove the layer from the parent group layer and add to map
                            if (sketchLayer.sketchLayer) {
                              sketchLayer.sketchLayer.visible = false;
                              sketchLayer.parentLayer?.remove(
                                sketchLayer.sketchLayer,
                              );
                              map.add(sketchLayer.sketchLayer);
                            }
                            if (sketchLayer.pointsLayer) {
                              sketchLayer.pointsLayer.visible = false;
                              sketchLayer.parentLayer?.remove(
                                sketchLayer.pointsLayer,
                              );
                              map.add(sketchLayer.pointsLayer);
                            }
                            if (sketchLayer.hybridLayer) {
                              sketchLayer.hybridLayer.visible = false;
                              sketchLayer.parentLayer?.remove(
                                sketchLayer.hybridLayer,
                              );
                              map.add(sketchLayer.hybridLayer);
                            }

                            // update layers (clear parent layer)
                            setLayers((layers) => {
                              const layerIndex = layers.findIndex(
                                (layer) =>
                                  layer.layerId === sketchLayer.layerId,
                              );

                              if (layerIndex === -1) return layers;

                              const layer = layers[layerIndex];
                              layer.parentLayer = null;

                              return [
                                ...layers.slice(0, layerIndex),
                                layer,
                                ...layers.slice(layerIndex + 1),
                              ];
                            });

                            // update sketchLayer (clear parent layer)
                            setSketchLayer((sketchLayer) => {
                              if (!sketchLayer) return sketchLayer;

                              return {
                                ...sketchLayer,
                                parentLayer: null,
                              };
                            });

                            // update the selected scenario
                            setSelectedScenario((selectedScenario) => {
                              if (
                                !selectedScenario ||
                                selectedScenario.type !== 'scenario'
                              )
                                return selectedScenario;

                              return {
                                ...selectedScenario,
                                layers: selectedScenario.layers.filter(
                                  (layer) =>
                                    layer.layerId !== sketchLayer.layerId,
                                ),
                              };
                            });
                          }}
                        >
                          <i className="fas fa-unlink" />
                          <span className="sr-only">Unlink Layer</span>
                        </button>
                      ) : (
                        <button
                          css={iconButtonStyles}
                          title="Link Layer"
                          onClick={() => {
                            if (!map || !selectedScenario) return;

                            // update edits (move the layer to the selected scenario)
                            const editsCopy = updateLayerEdits({
                              appType: 'sampling',
                              edits,
                              scenario: selectedScenario,
                              layer: sketchLayer,
                              type: 'move',
                            });
                            setEdits(editsCopy);

                            // find the new parent layer
                            const groupLayer = map.layers.find(
                              (layer) => layer.id === selectedScenario.layerId,
                            ) as __esri.GroupLayer;
                            if (!groupLayer) return;

                            // add the layer to the parent group layer
                            if (sketchLayer.sketchLayer)
                              groupLayer.add(sketchLayer.sketchLayer);
                            if (sketchLayer.pointsLayer) {
                              groupLayer.add(sketchLayer.pointsLayer);
                            }
                            if (sketchLayer.hybridLayer) {
                              groupLayer.add(sketchLayer.hybridLayer);
                            }

                            // show the newly added layer
                            if (
                              displayGeometryType === 'points' &&
                              sketchLayer.pointsLayer
                            ) {
                              sketchLayer.pointsLayer.visible = true;
                            } else if (
                              displayGeometryType === 'hybrid' &&
                              sketchLayer.hybridLayer
                            ) {
                              sketchLayer.hybridLayer.visible = true;
                            } else if (sketchLayer.sketchLayer) {
                              sketchLayer.sketchLayer.visible = true;
                            }

                            // update layers (set parent layer)
                            setLayers((layers) => {
                              const layerIndex = layers.findIndex(
                                (layer) =>
                                  layer.layerId === sketchLayer.layerId,
                              );

                              if (layerIndex === -1) return layers;

                              const layer = layers[layerIndex];
                              layer.parentLayer = groupLayer;

                              return [
                                ...layers.slice(0, layerIndex),
                                layer,
                                ...layers.slice(layerIndex + 1),
                              ];
                            });

                            // update sketchLayer (clear parent layer)
                            setSketchLayer((sketchLayer) => {
                              if (!sketchLayer) return sketchLayer;

                              return {
                                ...sketchLayer,
                                parentLayer: groupLayer,
                              };
                            });

                            // update the selectedScenario to keep the active layer dropdown
                            // synced up
                            const scenario = editsCopy.edits.find(
                              (edit) =>
                                edit.type === 'scenario' &&
                                edit.layerId === selectedScenario.layerId,
                            );
                            if (scenario)
                              setSelectedScenario(
                                scenario as ScenarioEditsType,
                              );
                          }}
                        >
                          <i className="fas fa-link" />
                          <span className="sr-only">Link Layer</span>
                        </button>
                      )}
                      <button
                        css={iconButtonStyles}
                        title="Delete Layer"
                        onClick={() => {
                          // remove the layer from layers
                          setLayers((layers) => {
                            return layers.filter(
                              (layer) => layer.layerId !== sketchLayer.layerId,
                            );
                          });

                          const parentLayer = sketchLayer.parentLayer;
                          if (parentLayer) {
                            // remove the scenario from edits
                            setEdits((edits) => {
                              const index = edits.edits.findIndex(
                                (edit) => edit.layerId === parentLayer.id,
                              );

                              const editedScenario = edits.edits[
                                index
                              ] as ScenarioEditsType;
                              editedScenario.layers =
                                editedScenario.layers.filter(
                                  (layer) =>
                                    layer.layerId !== sketchLayer.layerId,
                                );

                              return {
                                count: edits.count + 1,
                                edits: [
                                  ...edits.edits.slice(0, index),
                                  editedScenario,
                                  ...edits.edits.slice(index + 1),
                                ],
                              };
                            });

                            if (sketchLayer.sketchLayer)
                              parentLayer.remove(sketchLayer.sketchLayer);
                            if (sketchLayer.pointsLayer)
                              parentLayer.remove(sketchLayer.pointsLayer);
                            if (sketchLayer.hybridLayer)
                              parentLayer.remove(sketchLayer.hybridLayer);
                          } else {
                            // remove the scenario from edits
                            setEdits((edits) => {
                              return {
                                count: edits.count + 1,
                                edits: edits.edits.filter(
                                  (item) =>
                                    item.layerId !== sketchLayer.layerId,
                                ),
                              };
                            });
                          }

                          // select the next available layer
                          let newSketchLayerIndex: number = -1;

                          // check in the selected scenario first, then in the root of edits
                          if (
                            selectedScenario &&
                            selectedScenario.type === 'scenario'
                          ) {
                            const index = selectedScenario.layers.findIndex(
                              (layer) => layer.layerId !== sketchLayer.layerId,
                            );
                            if (index > -1) {
                              newSketchLayerIndex = layers.findIndex(
                                (layer) =>
                                  layer.layerId ===
                                  selectedScenario.layers[index].layerId,
                              );
                            }
                          }
                          if (newSketchLayerIndex === -1) {
                            const index = edits.edits.findIndex(
                              (layer) =>
                                layer.type === 'layer' &&
                                (layer.layerType === 'Samples' ||
                                  layer.layerType === 'VSP') &&
                                layer.layerId !== sketchLayer.layerId,
                            );
                            if (index > -1) {
                              newSketchLayerIndex = layers.findIndex(
                                (layer) =>
                                  layer.layerId === edits.edits[index].layerId,
                              );
                            }
                          }

                          setSketchLayer(
                            newSketchLayerIndex > -1
                              ? layers[newSketchLayerIndex]
                              : null,
                          );

                          // remove the scenario from the map
                          const parent = parentLayer
                            ? parentLayer
                            : map
                              ? map
                              : null;
                          if (parent && sketchLayer.sketchLayer)
                            parent.remove(sketchLayer.sketchLayer);
                        }}
                      >
                        <i className="fas fa-trash-alt" />
                        <span className="sr-only">Delete Layer</span>
                      </button>
                      <button
                        css={iconButtonStyles}
                        title="Clone Layer"
                        onClick={(_ev) => {
                          // get the name for the new layer
                          const newLayerName = getNewName(
                            layers.map((layer) => layer.label),
                            sketchLayer.label,
                          );

                          // create the layer
                          const tempLayer = createSampleLayer(
                            isDecon(),
                            newLayerName,
                            sketchLayer.parentLayer,
                          );
                          if (
                            !map ||
                            sketchLayer.sketchLayer?.type !== 'graphics' ||
                            tempLayer.sketchLayer?.type !== 'graphics' ||
                            !tempLayer.pointsLayer ||
                            tempLayer.pointsLayer.type !== 'graphics' ||
                            !tempLayer.hybridLayer ||
                            tempLayer.hybridLayer.type !== 'graphics'
                          )
                            return;

                          const clonedGraphics: __esri.Graphic[] = [];
                          const clonedPointGraphics: __esri.Graphic[] = [];
                          const clonedHybridGraphics: __esri.Graphic[] = [];
                          sketchLayer.sketchLayer.graphics.forEach(
                            (graphic) => {
                              const uuid = generateUUID();
                              const clonedGraphic = new Graphic({
                                attributes: {
                                  ...graphic.attributes,
                                  GLOBALID: uuid,
                                  PERMANENT_IDENTIFIER: uuid,
                                  DECISIONUNIT: tempLayer.name,
                                  DECISIONUNITUUID: tempLayer.uuid,
                                },
                                geometry: graphic.geometry,
                                popupTemplate: graphic.popupTemplate,
                                symbol: graphic.symbol,
                              });
                              clonedGraphics.push(clonedGraphic);

                              clonedPointGraphics.push(
                                convertToPoint(clonedGraphic),
                              );
                              clonedHybridGraphics.push(
                                clonedGraphic.attributes.ShapeType === 'point'
                                  ? convertToPoint(clonedGraphic)
                                  : clonedGraphic.clone(),
                              );
                            },
                          );

                          tempLayer.sketchLayer.addMany(clonedGraphics);
                          tempLayer.pointsLayer.addMany(clonedPointGraphics);
                          tempLayer.hybridLayer.addMany(clonedHybridGraphics);

                          // add the new layer to layers
                          setLayers((layers) => {
                            return [...layers, tempLayer];
                          });

                          // clone the active layer in edits
                          // make a copy of the edits context variable
                          const editsCopy = updateLayerEdits({
                            appType: 'sampling',
                            changes: tempLayer.sketchLayer.graphics,
                            edits,
                            scenario: selectedScenario,
                            layer: tempLayer,
                            type: 'add',
                          });
                          setEdits(editsCopy);

                          // add the layer to the scenario's group layer, a scenario is selected
                          const groupLayer = map.layers.find(
                            (layer) => layer.id === selectedScenario?.layerId,
                          );
                          if (groupLayer && groupLayer.type === 'group') {
                            const tempGroupLayer =
                              groupLayer as __esri.GroupLayer;
                            tempGroupLayer.add(tempLayer.sketchLayer);
                            if (tempLayer.pointsLayer) {
                              tempGroupLayer.add(tempLayer.pointsLayer);
                            }
                            if (tempLayer.hybridLayer) {
                              tempGroupLayer.add(tempLayer.hybridLayer);
                            }
                          }

                          // make the new layer the active sketch layer
                          setSketchLayer(tempLayer);

                          setSelectedScenario((selectedScenario) => {
                            if (
                              !selectedScenario ||
                              selectedScenario.type !== 'scenario'
                            )
                              return selectedScenario;

                            const scenario = editsCopy.edits.find(
                              (edit) =>
                                edit.type === 'scenario' &&
                                edit.layerId === selectedScenario.layerId,
                            ) as ScenarioEditsType;
                            const newLayer = scenario.layers.find(
                              (layer) => layer.layerId === tempLayer.layerId,
                            );

                            if (!newLayer) return selectedScenario;

                            return {
                              ...selectedScenario,
                              layers: [...selectedScenario.layers, newLayer],
                            };
                          });
                        }}
                      >
                        <i className="fas fa-clone" />
                        <span className="sr-only">Clone Layer</span>
                      </button>
                      <button
                        css={iconButtonStyles}
                        title={editLayerVisible ? 'Cancel' : 'Edit Layer'}
                        onClick={() => {
                          setAddLayerVisible(false);
                          setEditLayerVisible(!editLayerVisible);
                        }}
                      >
                        <i
                          className={
                            editLayerVisible ? 'fas fa-times' : 'fas fa-edit'
                          }
                        />
                        <span className="sr-only">
                          {editLayerVisible ? 'Cancel' : 'Edit Layer'}
                        </span>
                      </button>
                    </Fragment>
                  )}
                  <button
                    css={iconButtonStyles}
                    title={addLayerVisible ? 'Cancel' : 'Add Layer'}
                    onClick={() => {
                      setEditLayerVisible(false);
                      setAddLayerVisible(!addLayerVisible);
                    }}
                  >
                    <i
                      className={
                        addLayerVisible ? 'fas fa-times' : 'fas fa-plus'
                      }
                    />
                    <span className="sr-only">
                      {addLayerVisible ? 'Cancel' : 'Add Layer'}
                    </span>
                  </button>
                </div>
              </div>
              <Select
                id="sampling-layer-select"
                inputId="sampling-layer-select-input"
                css={layerSelectStyles}
                styles={reactSelectStyles as any}
                isDisabled={addLayerVisible || editLayerVisible}
                value={sketchLayer}
                onChange={(ev) => setSketchLayer(ev as LayerType)}
                options={sampleLayers}
              />
              {addLayerVisible && (
                <EditLayer
                  appType="sampling"
                  onSave={() => setAddLayerVisible(false)}
                />
              )}
              {editLayerVisible && (
                <EditLayer
                  appType="sampling"
                  initialLayer={sketchLayer}
                  onSave={() => setEditLayerVisible(false)}
                />
              )}
            </Fragment>
          )}
        </div>

        {selectedScenario && (
          <Fragment>
            <div css={sectionContainerWidthOnly}>
              <p>
                In the panels below, add targeted and/ or multiple samples to
                the plan.
              </p>
              <ColorPicker
                title="Default Sample Symbology"
                symbol={defaultSymbols.symbols['Samples']}
                onChange={(symbol: PolygonSymbol) => {
                  setDefaultSymbolSingle('Samples', symbol);
                }}
              />
            </div>
            <AccordionList>
              <AccordionItem
                title={'Add Targeted Samples'}
                initiallyExpanded={true}
              >
                <div css={sectionContainer}>
                  <p>
                    Click on a sample type to enable TOTS drawing mode. Click on
                    the map layer to draw a sample point. Optionally, add any
                    relevant notes. Click Save. Repeat these steps to continue
                    adding targeted samples. Use the "Add Multiple Random
                    Samples" feature below to add more than one sample point at
                    a time.
                  </p>
                  <div css={sketchGroupingStyles}>
                    {establishedSampleTypes.length > 0 && (
                      <div>
                        <h3>Established Sample Types</h3>
                        <div css={sketchButtonContainerStyles}>
                          {establishedSampleTypes.map(
                            (option: any, index: number) => {
                              const sampleTypeUuid = option.value;
                              const sampleType = option.label;

                              if (
                                !Object.prototype.hasOwnProperty.call(
                                  sampleAttributes,
                                  sampleTypeUuid,
                                )
                              ) {
                                return null;
                              }

                              const shapeType =
                                sampleAttributes[sampleTypeUuid].ShapeType;
                              const edited =
                                Object.prototype.hasOwnProperty.call(
                                  userDefinedAttributes.sampleTypes,
                                  sampleTypeUuid,
                                );
                              return (
                                <SketchButton
                                  key={index}
                                  layers={layers}
                                  value={sampleTypeUuid}
                                  selectedScenario={
                                    selectedScenario as ScenarioEditsType
                                  }
                                  label={
                                    edited
                                      ? `${sampleType} (edited)`
                                      : sampleType
                                  }
                                  iconClass={
                                    shapeType === 'point'
                                      ? 'fas fa-pen-fancy'
                                      : 'fas fa-draw-polygon'
                                  }
                                  onClick={() =>
                                    sketchButtonClick(sampleTypeUuid)
                                  }
                                />
                              );
                            },
                          )}
                        </div>
                      </div>
                    )}
                    {innovativeSampleTypes.length > 0 && (
                      <div>
                        <h3>Innovative Sample Types</h3>
                        <div css={sketchButtonContainerStyles}>
                          {innovativeSampleTypes.map(
                            (option: any, index: number) => {
                              const sampleTypeUuid = option.value;
                              const sampleType = option.label;

                              if (
                                !Object.prototype.hasOwnProperty.call(
                                  sampleAttributes,
                                  sampleTypeUuid,
                                )
                              ) {
                                return null;
                              }

                              const shapeType =
                                sampleAttributes[sampleTypeUuid].ShapeType;
                              const edited =
                                Object.prototype.hasOwnProperty.call(
                                  userDefinedAttributes.sampleTypes,
                                  sampleTypeUuid,
                                );
                              return (
                                <SketchButton
                                  key={index}
                                  layers={layers}
                                  value={sampleTypeUuid}
                                  selectedScenario={
                                    selectedScenario as ScenarioEditsType
                                  }
                                  label={
                                    edited
                                      ? `${sampleType} (edited)`
                                      : sampleType
                                  }
                                  iconClass={
                                    shapeType === 'point'
                                      ? 'fas fa-pen-fancy'
                                      : 'fas fa-draw-polygon'
                                  }
                                  onClick={() =>
                                    sketchButtonClick(sampleTypeUuid)
                                  }
                                />
                              );
                            },
                          )}
                        </div>
                      </div>
                    )}
                    {userDefinedOptions.length > 0 && (
                      <div>
                        <h3>Custom Sample Types</h3>
                        <div css={sketchButtonContainerStyles}>
                          {userDefinedOptions.map((option, index) => {
                            if (option.isPredefined) return null;

                            const sampleTypeUuid = option.value;
                            const shapeType =
                              sampleAttributes[sampleTypeUuid as any].ShapeType;
                            return (
                              <SketchButton
                                key={index}
                                value={sampleTypeUuid}
                                label={option.label}
                                layers={layers}
                                selectedScenario={
                                  selectedScenario as ScenarioEditsType
                                }
                                iconClass={
                                  shapeType === 'point'
                                    ? 'fas fa-pen-fancy'
                                    : 'fas fa-draw-polygon'
                                }
                                onClick={() =>
                                  sketchButtonClick(sampleTypeUuid)
                                }
                              />
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </AccordionItem>
              <AccordionItem title="Add Multiple Random Samples">
                <div css={sectionContainer}>
                  <GenerateSamples id="gen-random" type="random" />
                </div>
              </AccordionItem>
              <AccordionItem title="Add Statistical Sampling Approach">
                <div css={sectionContainer}>
                  <GenerateSamples id="gen-statistic" type="statistic" />
                </div>
              </AccordionItem>
            </AccordionList>
          </Fragment>
        )}
      </div>
      <div css={sectionContainer}>
        <NavigationButton currentPanel="locateSamples" />
      </div>
    </div>
  );
}

export default LocateSamples;
