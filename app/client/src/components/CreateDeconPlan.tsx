/** @jsxImportSource @emotion/react */

import React, { Fragment, useContext, useEffect, useState } from 'react';
import { css } from '@emotion/react';
import { DialogContent, DialogOverlay } from '@reach/dialog';
import { CellContext } from '@tanstack/react-table';
// components
import CharacterizeAOI from 'components/CharacterizeAOI';
import { EditScenario } from 'components/EditLayerMetaData';
import InfoIcon from 'components/InfoIcon';
import LoadingSpinner from 'components/LoadingSpinner';
import MessageBox from 'components/MessageBox';
import NavigationButton from 'components/NavigationButton';
import {
  ReactTableEditable,
  ReactTableEditableCell,
} from 'components/ReactTable';
import Select from 'components/Select';
// config
import { SampleSelectType } from 'config/sampleAttributes';
// contexts
import { CalculateContext } from 'contexts/Calculate';
import { useLookupFiles } from 'contexts/LookupFiles';
import { NavigationContext } from 'contexts/Navigation';
import { SketchContext } from 'contexts/Sketch';
// types
import {
  ApproachTypes,
  BuildingApproachTypes,
  EditsType,
  LayerAoiAnalysisEditsType,
  LayerDeconEditsType,
  ScenarioDeconEditsType,
} from 'types/Edits';
import { LayerType } from 'types/Layer';
// utils
import { summarizedBuildingSurfaceTypes, useStartOver } from 'utils/hooks';
import {
  deepCopyObject,
  findLayerInEdits,
  generateUUID,
  getNextScenarioLayer,
  getScenariosDecon,
} from 'utils/sketchUtils';
import { formatNumber, getNewName, getScenarioName } from 'utils/utils';
// styles
import { colors, infoIconStyles, reactSelectStyles } from 'styles';

type SaveStatusType =
  | 'none'
  | 'changes'
  | 'fetching'
  | 'success'
  | 'failure'
  | 'fetch-failure'
  | 'name-not-available';

type ShapeTypeSelect = {
  value: string;
  label: string;
};

const pointStyles: ShapeTypeSelect[] = [
  { value: 'circle', label: 'Circle' },
  { value: 'cross', label: 'Cross' },
  { value: 'diamond', label: 'Diamond' },
  { value: 'square', label: 'Square' },
  { value: 'triangle', label: 'Triangle' },
  { value: 'x', label: 'X' },
  {
    value:
      'path|M17.14 3 8.86 3 3 8.86 3 17.14 8.86 23 17.14 23 23 17.14 23 8.86 17.14 3z',
    label: 'Octagon',
  },
];

const surfaceAreaInfoText =
  'Assumes decon operations are performed on 100% of surface area.';

// --- styles (CreateDeconPlan) ---
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

const layerSelectStyles = css`
  margin-bottom: 10px;
`;

const inlineMenuStyles = css`
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

const addButtonStyles = css`
  margin: 0;
  height: 38px; /* same height as ReactSelect */
`;

const submitButtonStyles = css`
  margin-top: 10px;

  &: disabled {
    cursor: default;
    opacity: 0.65;
  }
`;

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

const infoIconOperationsStyles = css`
  display: flex;
  align-items: end;

  span {
    display: inline-block;
    white-space: nowrap;
  }
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
  width: 125px;
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

const layerButtonContainerStyles = css`
  display: flex;
  flex-direction: column;
  justify-content: flex-end;

  div {
    display: flex;
    justify-content: flex-end;
  }
`;

const lineSeparatorStyles = css`
  border-bottom: 1px solid #d8dfe2;
`;

const verticalCenterTextStyles = css`
  display: flex;
  align-items: center;
`;

const fullWidthSelectStyles = css`
  width: 100%;
  margin-right: 10px;
`;

const inputStyles = css`
  width: 100%;
  height: 36px;
  margin: 0 0 10px 0;
  padding-left: 8px;
  border: 1px solid #ccc;
  border-radius: 4px;
`;

const saveButtonContainerStyles = css`
  display: flex;
  justify-content: flex-end;
`;

const opIndentStyles = css`
  margin-left: 0.75rem;
`;

const saveButtonStyles = (status: string) => {
  let backgroundColor = '';
  if (status === 'success') {
    backgroundColor = `background-color: ${colors.green()};`;
  }
  if (status === 'failure' || status === 'name-not-available') {
    backgroundColor = `background-color: ${colors.red()};`;
  }

  return css`
    margin: 5px 0;
    ${backgroundColor}

    &:disabled {
      cursor: default;
      opacity: 0.65;
    }
  `;
};

// --- components (CreateDeconPlan) ---
function CreateDeconPlan() {
  const { contaminationMap, setCalculateResultsDecon, setContaminationMap } =
    useContext(CalculateContext);
  const { setGoTo, setGoToOptions, trainingMode } =
    useContext(NavigationContext);
  const {
    deconOperation,
    deconSketchLayer,
    defaultDeconSelections,
    edits,
    setEdits,
    layersInitialized,
    layers,
    setLayers,
    map,
    selectedScenario,
    setDeconOperation,
    setDeconSketchLayer,
    setSelectedScenario,
    sketchLayer,
    setSketchLayer,
  } = useContext(SketchContext);
  const startOver = useStartOver();

  useEffect(() => {
    if (!selectedScenario || selectedScenario.type !== 'scenario-decon') return;

    if (selectedScenario.linkedLayerIds.length === 0) {
      setDeconOperation(null);
      return;
    }

    const firstId = selectedScenario.linkedLayerIds[0] ?? null;
    const firstLayer = layers.find((l) => l.layerId === firstId);
    setDeconOperation((deconOp) => {
      if (deconOp && selectedScenario.linkedLayerIds.includes(deconOp.layerId))
        return deconOp;
      return firstLayer ?? null;
    });
  }, [layers, selectedScenario, setDeconOperation]);

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

  const [lastDeconOpId, setLastDeconOpId] = useState('');
  useEffect(() => {
    if (!deconOperation) {
      setDeconSketchLayer(null);
      return;
    }
    if (deconOperation.layerId === lastDeconOpId) return;

    setLastDeconOpId(deconOperation.layerId);

    const deconLayer = edits.edits.find(
      (edit) =>
        edit.type === 'layer-decon' && edit.layerId === deconOperation.layerId,
    ) as LayerDeconEditsType;
    if (!deconLayer?.analysisLayerId) {
      setDeconSketchLayer(null);
      return;
    }

    const layer = edits.edits.find(
      (edit) =>
        edit.layerType === 'AOI Analysis' &&
        edit.layerId === deconLayer.analysisLayerId,
    ) as LayerAoiAnalysisEditsType;
    setDeconSketchLayer(layer ?? null);
  }, [deconOperation, edits, lastDeconOpId, setDeconSketchLayer]);

  // scenario and layer edit UI visibility controls
  const [addOperationVisible, setAddOperationVisible] = useState(false);
  const [editOperationVisible, setEditOperationVisible] = useState(false);
  const [addPlanVisible, setAddPlanVisible] = useState(false);
  const [editPlanVisible, setEditPlanVisible] = useState(false);
  const [newDeconOperationName, setNewDeconOperationName] = useState('');
  const [saveStatus, setSaveStatus] = useState<SaveStatusType>('none');

  // get a list of scenarios from edits
  const scenarios = getScenariosDecon(edits);

  const deconLayersAll = layers.filter((e) => e.layerType === 'Decon');

  // build the list of layers to be displayed in the sample layer dropdown
  const deconLayers: { label: string; options: LayerType[] }[] = [];
  if (selectedScenario?.type === 'scenario-decon') {
    const linkedDeconLayers = deconLayersAll.filter((d) =>
      selectedScenario.linkedLayerIds.includes(d.layerId),
    );
    // get layers for the selected scenario
    deconLayers.push({
      label: selectedScenario.label,
      options: linkedDeconLayers,
    });

    const linkedIds: string[] = [];
    edits.edits.forEach((edit) => {
      if (edit.type === 'scenario-decon') {
        linkedIds.push(...edit.linkedLayerIds);
      }
    });

    const unLinkedDeconLayers = deconLayersAll.filter(
      (d) => !linkedIds.includes(d.layerId),
    );
    // get unlinked layers
    deconLayers.push({
      label: 'Unlinked Operations',
      options: unLinkedDeconLayers,
    });
  }

  pointStyles.sort((a, b) => a.value.localeCompare(b.value));

  const [deconTechPopupOpen, setDeconTechPopupOpen] = useState(false);

  const isLinked =
    selectedScenario?.type === 'scenario-decon' &&
    selectedScenario?.linkedLayerIds.length > 0 &&
    selectedScenario.linkedLayerIds.findIndex(
      (id) => id === deconOperation?.layerId,
    ) > -1;

  // determine if the AOI characterization has been run
  const deconLayer = edits.edits.find(
    (l) =>
      l.type === 'layer-aoi-analysis' &&
      l.layerId === deconSketchLayer?.layerId,
  ) as LayerAoiAnalysisEditsType;
  const imageryLayer = deconLayer?.layers?.find(
    (l) => l.layerType === 'Image Analysis',
  );
  const buildingLayer = deconLayer?.layers?.find(
    (l) => l.layerType === 'AOI Assessed',
  );
  const hasAoiCharacterizationRan =
    buildingLayer &&
    imageryLayer &&
    (buildingLayer.adds.length > 0 || imageryLayer.adds.length > 0);

  return (
    <div css={panelContainer}>
      <div>
        <div css={sectionContainer}>
          <h2 css={headerStyles}>Create Decon Plan</h2>
          <div css={headerContainer}>
            <button css={deleteButtonStyles} onClick={startOver}>
              <i className="fas fa-redo-alt" />
              <br />
              Start Over
            </button>
          </div>
        </div>
        <div css={lineSeparatorStyles} />
        <div css={sectionContainer}>
          {selectedScenario ? (
            <strong>Step 1: Define a Decontamination Plan</strong>
          ) : (
            <Fragment>
              <strong>Step 1: Define a Decontamination Plan</strong>
              <p>
                Create a decon plan with one or more decon operations. Decon
                operations are associated with a specific area of interest (AOI)
                where specific decon strategies can be defined. Enter a plan
                name and description and click Save.
              </p>
              <MessageBox
                severity="warning"
                title=""
                message="Note: Your work in TODS only persists as long as your current browser session. Be sure to download results and/or publish your plan to retain a copy of your work."
              />
            </Fragment>
          )}

          {scenarios.length === 0 ? (
            <EditScenario
              appType="decon"
              onSave={(saveResults) => {
                if (saveResults?.status !== 'success') return;
                setEditPlanVisible(false);
              }}
            />
          ) : (
            <Fragment>
              <div css={iconButtonContainerStyles}>
                <div css={verticalCenterTextStyles}>
                  <label htmlFor="scenario-select-input">Specify Plan</label>
                </div>
                <div>
                  {selectedScenario && (
                    <Fragment>
                      <button
                        css={iconButtonStyles}
                        title="Delete Plan"
                        onClick={() => {
                          // remove all of the child layers
                          setLayers((layers) => {
                            return layers.filter(
                              (layer) =>
                                layer.layerId !== selectedScenario.layerId,
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
                          const scenarios = getScenariosDecon(newEdits);
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
                        title="Clone Plan"
                        onClick={(_ev) => {
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
                          if (selectedScenarioEdits?.type !== 'scenario-decon')
                            return;

                          // copy the edits for that scenario
                          const copiedScenario: ScenarioDeconEditsType =
                            deepCopyObject(selectedScenarioEdits);

                          // update the name and id for the copied scenario
                          const uuid = generateUUID();
                          copiedScenario.addedFrom = 'sketch';
                          copiedScenario.editType = 'add';
                          copiedScenario.id = -1;
                          copiedScenario.label = newScenarioName;
                          copiedScenario.layerId = uuid;
                          copiedScenario.linkedLayerIds = [];
                          copiedScenario.name = newScenarioName;
                          copiedScenario.portalId = '';
                          copiedScenario.scenarioName = newScenarioName;
                          copiedScenario.status = 'added';
                          copiedScenario.value = uuid;

                          const fullCopyEdits: EditsType =
                            deepCopyObject(edits);
                          fullCopyEdits.edits.push(copiedScenario);

                          const idLinkages: { [id: string]: string } = {};
                          fullCopyEdits.edits.forEach((edit) => {
                            if (
                              edit.type !== 'layer-decon' ||
                              !selectedScenarioEdits.linkedLayerIds.includes(
                                edit.layerId,
                              )
                            )
                              return;

                            const deconUuid = generateUUID();
                            idLinkages[edit.layerId] = deconUuid;

                            copiedScenario.linkedLayerIds.push(deconUuid);
                            fullCopyEdits.edits.push({
                              ...edit,
                              layerId: deconUuid,
                              value: deconUuid,
                            });
                          });

                          setEdits(fullCopyEdits);

                          setLayers((layers) => {
                            const newLayers: LayerType[] = [];
                            layers.forEach((layer) => {
                              if (
                                !Object.keys(idLinkages).includes(layer.layerId)
                              )
                                return;

                              const id = idLinkages[layer.layerId];
                              newLayers.push({
                                ...layer,
                                layerId: id,
                                uuid: id,
                                value: id,
                              });
                            });

                            return [...layers, ...newLayers];
                          });

                          setSelectedScenario(copiedScenario);
                        }}
                      >
                        <i className="fas fa-clone" />
                        <span className="sr-only">Clone Plan</span>
                      </button>
                      {selectedScenario.status !== 'published' && (
                        <button
                          css={iconButtonStyles}
                          title={editPlanVisible ? 'Cancel' : 'Edit Plan'}
                          onClick={() => {
                            setEditPlanVisible(!editPlanVisible);
                          }}
                        >
                          <i
                            className={
                              editPlanVisible ? 'fas fa-times' : 'fas fa-edit'
                            }
                          />
                          <span className="sr-only">
                            {editPlanVisible ? 'Cancel' : 'Edit Plan'}
                          </span>
                        </button>
                      )}
                    </Fragment>
                  )}
                  <button
                    css={iconButtonStyles}
                    title={addPlanVisible ? 'Cancel' : 'Add Plan'}
                    onClick={() => {
                      setEditPlanVisible(false);
                      setAddPlanVisible(!addPlanVisible);
                    }}
                  >
                    <i
                      className={
                        addPlanVisible ? 'fas fa-times' : 'fas fa-plus'
                      }
                    />
                    <span className="sr-only">
                      {addPlanVisible ? 'Cancel' : 'Add Plan'}
                    </span>
                  </button>
                </div>
              </div>
              <Select
                id="scenario-select-input-container"
                inputId="scenario-select-input"
                css={layerSelectStyles}
                styles={reactSelectStyles as any}
                isDisabled={addPlanVisible || editPlanVisible}
                value={selectedScenario}
                onChange={(ev) => {
                  const newScenario = ev as ScenarioDeconEditsType;
                  setSelectedScenario(newScenario);

                  // get list of aoi analysis layers to make visible
                  const idsToMakeVisible: string[] = [];
                  edits.edits.forEach((edit) => {
                    if (!newScenario.linkedLayerIds.includes(edit.layerId))
                      return;
                    if (edit.type !== 'layer-decon') return;
                    idsToMakeVisible.push(edit.analysisLayerId);
                  });

                  // update the visiblity of layers
                  layers.forEach((layer) => {
                    if (!layer.sketchLayer) return;
                    if (!idsToMakeVisible.includes(layer.layerId)) {
                      if (layer.layerType === 'AOI Analysis')
                        layer.sketchLayer.visible = false;
                      return;
                    }

                    layer.sketchLayer.visible = true;
                  });

                  setEdits((edits) => ({
                    count: edits.count + 1,
                    edits: edits.edits.map((edit) => {
                      let visible = edit.visible;

                      if (edit.type === 'scenario-decon') {
                        visible =
                          edit.layerId === newScenario.layerId ? true : false;
                      }
                      if (edit.type === 'layer-aoi-analysis') {
                        visible = idsToMakeVisible.includes(edit.layerId)
                          ? true
                          : false;
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
              {(addPlanVisible || editPlanVisible) && (
                <EditScenario
                  appType="decon"
                  initialScenario={editPlanVisible ? selectedScenario : null}
                  onSave={(saveResults) => {
                    if (saveResults?.status !== 'success') return;
                    setAddPlanVisible(false);
                    setEditPlanVisible(false);
                  }}
                />
              )}
            </Fragment>
          )}

          {selectedScenario && (
            <Fragment>
              <strong>Step 2: Define a Decontamination Operation</strong>
              <p>
                Each decon operation must be linked to an AOI Decon Layer to
                quantify ground and building surfaces. For each decon operation
                you include in your plan, select an AOI Decon Layer from the
                dropdown or create a new AOI Decon Layer. An empty AOI Decon
                layer is loaded by default. Select "Draw Area of Interest" to
                designate the boundary of your decon operation. Click Save and
                Submit. Once the tool retrieves the data, you can then click the
                Select/Edit Decontamination Technology Selections to select a
                decon strategy for each contamination scenario.
              </p>
              <p>
                Use the available controls to link, add, edit, and/or delete
                selections to include in your decon plan.
              </p>
              <div>
                <div css={iconButtonContainerStyles}>
                  <div css={infoIconOperationsStyles}>
                    <span>
                      <label htmlFor="decon-operation-select-input">
                        Decon
                        <br />
                        Operation(s)
                      </label>
                    </span>

                    <InfoIcon
                      id="decon-ops-info-icon"
                      cssStyles={infoIconStylesOperations}
                      tooltip="Each Decon Operation is associated with one AOI Decon layer. Create<br/>multiple decon operations throughout the incident area to include<br/>with your overall Decon Plan. You may copy a Decon operation to<br/>clone your strategy to apply to other AOI Decon layers."
                    />
                  </div>
                  <div css={layerButtonContainerStyles}>
                    <div>
                      {deconOperation && (
                        <Fragment>
                          {isLinked ? (
                            <button
                              css={iconButtonStyles}
                              title="Unlink Operation"
                              onClick={() => {
                                if (!map || !selectedScenario) return;

                                const editsCopy: EditsType =
                                  deepCopyObject(edits);
                                const scenario = editsCopy.edits.find(
                                  (edit) =>
                                    edit.layerId === selectedScenario.layerId,
                                );
                                if (
                                  !scenario ||
                                  scenario.type !== 'scenario-decon'
                                )
                                  return;

                                scenario.linkedLayerIds =
                                  scenario.linkedLayerIds.filter(
                                    (id) => id !== deconOperation.layerId,
                                  );
                                setEdits({
                                  count: editsCopy.count + 1,
                                  edits: editsCopy.edits,
                                });

                                setSelectedScenario((selectedScenario) => {
                                  if (
                                    !selectedScenario ||
                                    selectedScenario.type !== 'scenario-decon'
                                  )
                                    return selectedScenario;

                                  return {
                                    ...selectedScenario,
                                    linkedLayerIds:
                                      selectedScenario.linkedLayerIds.filter(
                                        (id) => id !== deconOperation.layerId,
                                      ),
                                  };
                                });
                              }}
                            >
                              <i className="fas fa-unlink" />
                              <span className="sr-only">Unlink Operation</span>
                            </button>
                          ) : (
                            <button
                              css={iconButtonStyles}
                              title="Link Operation"
                              onClick={() => {
                                if (!map || !selectedScenario) return;

                                const editsCopy: EditsType =
                                  deepCopyObject(edits);
                                const scenario = editsCopy.edits.find(
                                  (edit) =>
                                    edit.layerId === selectedScenario.layerId,
                                );
                                if (
                                  !scenario ||
                                  scenario.type !== 'scenario-decon'
                                )
                                  return;

                                scenario.linkedLayerIds.push(
                                  deconOperation.layerId,
                                );
                                setEdits({
                                  count: editsCopy.count + 1,
                                  edits: editsCopy.edits,
                                });

                                setSelectedScenario((selectedScenario) => {
                                  if (
                                    !selectedScenario ||
                                    selectedScenario.type !== 'scenario-decon'
                                  )
                                    return selectedScenario;

                                  return {
                                    ...selectedScenario,
                                    linkedLayerIds: [
                                      ...selectedScenario.linkedLayerIds,
                                      deconOperation.layerId,
                                    ],
                                  };
                                });
                              }}
                            >
                              <i className="fas fa-link" />
                              <span className="sr-only">Link Operation</span>
                            </button>
                          )}
                          <button
                            css={iconButtonStyles}
                            title="Delete Operation"
                            onClick={() => {
                              const linkedLayerIds =
                                selectedScenario.type === 'scenario-decon'
                                  ? selectedScenario.linkedLayerIds
                                  : [];
                              const newDeconLayers = deconLayersAll.filter(
                                (l) =>
                                  linkedLayerIds.includes(l.layerId) &&
                                  l.layerId !== deconOperation.layerId,
                              );
                              setDeconOperation(
                                newDeconLayers.length > 0
                                  ? newDeconLayers[0]
                                  : null,
                              );

                              setLayers((layers) => {
                                return layers.filter(
                                  (layer) =>
                                    layer.layerId !== deconOperation.layerId,
                                );
                              });

                              setEdits((edits) => {
                                const editsCopy: EditsType =
                                  deepCopyObject(edits);
                                editsCopy.edits.forEach((scenario) => {
                                  if (scenario.type !== 'scenario-decon')
                                    return;

                                  scenario.linkedLayerIds =
                                    scenario.linkedLayerIds.filter(
                                      (id) => id !== deconOperation.layerId,
                                    );
                                });

                                return {
                                  count: edits.count + 1,
                                  edits: editsCopy.edits.filter(
                                    (edit) =>
                                      edit.layerId !== deconOperation.layerId,
                                  ),
                                };
                              });

                              setCalculateResultsDecon(
                                (calculateResultsDecon) => {
                                  return {
                                    status: 'fetching',
                                    panelOpen: calculateResultsDecon.panelOpen,
                                    data: null,
                                  };
                                },
                              );
                            }}
                          >
                            <i className="fas fa-trash-alt" />
                            <span className="sr-only">Delete Operation</span>
                          </button>

                          <button
                            css={iconButtonStyles}
                            title="Clone Operation"
                            onClick={(_ev) => {
                              // get the name for the new layer
                              const newLayerName = getNewName(
                                layers.map((layer) => layer.label),
                                deconOperation.label,
                              );

                              const layer = layers.find(
                                (l) => l.layerId === deconOperation.layerId,
                              );
                              if (!layer) return;

                              const layerUuid = generateUUID();
                              const copiedLayer: LayerType =
                                deepCopyObject(layer);
                              copiedLayer.addedFrom = 'sketch';
                              copiedLayer.editType = 'add';
                              copiedLayer.id = -1;
                              copiedLayer.label = newLayerName;
                              copiedLayer.name = newLayerName;
                              copiedLayer.layerId = layerUuid;
                              copiedLayer.portalId = '';
                              copiedLayer.status = 'added';
                              copiedLayer.value = layerUuid;

                              setLayers((layers) => {
                                return [...layers, copiedLayer];
                              });

                              setEdits((edits) => {
                                const editsCopy: EditsType =
                                  deepCopyObject(edits);

                                const scenario = editsCopy.edits.find(
                                  (edit) =>
                                    edit.layerId === selectedScenario.layerId,
                                );
                                const originalOp = editsCopy.edits.find(
                                  (edit) =>
                                    edit.layerId === deconOperation.layerId,
                                );
                                if (!originalOp) return edits;

                                if (
                                  scenario &&
                                  scenario.type === 'scenario-decon'
                                ) {
                                  scenario.linkedLayerIds.push(layerUuid);
                                  setSelectedScenario((selectedScenario) => {
                                    if (
                                      !selectedScenario ||
                                      selectedScenario.type !== 'scenario-decon'
                                    )
                                      return selectedScenario;

                                    return {
                                      ...selectedScenario,
                                      linkedLayerIds: [
                                        ...selectedScenario.linkedLayerIds,
                                        layerUuid,
                                      ],
                                    };
                                  });
                                }

                                return {
                                  count: edits.count + 1,
                                  edits: [
                                    ...editsCopy.edits,
                                    {
                                      ...originalOp,
                                      deconLayerResults: {
                                        cost: 0,
                                        resultsTable: [],
                                        time: 0,
                                        wasteMass: 0,
                                        wasteVolume: 0,
                                      },
                                      editType: 'add',
                                      id: -1,
                                      layerId: layerUuid,
                                      label: newLayerName,
                                      name: newLayerName,
                                      status: 'added',
                                      value: layerUuid,
                                    },
                                  ],
                                };
                              });

                              setDeconOperation(copiedLayer);
                            }}
                          >
                            <i className="fas fa-clone" />
                            <span className="sr-only">Clone Operation</span>
                          </button>

                          {deconOperation.status !== 'published' && (
                            <button
                              css={iconButtonStyles}
                              title={
                                editOperationVisible
                                  ? 'Cancel'
                                  : 'Edit Operation'
                              }
                              onClick={() => {
                                setAddOperationVisible(false);
                                setEditOperationVisible(!editOperationVisible);
                                if (deconOperation)
                                  setNewDeconOperationName(deconOperation.name);
                              }}
                            >
                              <i
                                className={
                                  editOperationVisible
                                    ? 'fas fa-times'
                                    : 'fas fa-edit'
                                }
                              />
                              <span className="sr-only">
                                {editOperationVisible
                                  ? 'Cancel'
                                  : 'Edit Operation'}
                              </span>
                            </button>
                          )}
                        </Fragment>
                      )}
                      <button
                        css={iconButtonStyles}
                        title={addOperationVisible ? 'Cancel' : 'Add Operation'}
                        onClick={() => {
                          setEditOperationVisible(false);
                          if (!addOperationVisible)
                            setNewDeconOperationName('');
                          setAddOperationVisible(!addOperationVisible);
                        }}
                      >
                        <i
                          className={
                            addOperationVisible ? 'fas fa-times' : 'fas fa-plus'
                          }
                        />
                        <span className="sr-only">
                          {addOperationVisible ? 'Cancel' : 'Add Operation'}
                        </span>
                      </button>
                    </div>
                  </div>
                </div>
                <Select
                  id="decon-operation-select-input-container"
                  inputId="decon-operation-select-input"
                  css={layerSelectStyles}
                  styles={reactSelectStyles as any}
                  isDisabled={addOperationVisible || editOperationVisible}
                  options={deconLayers}
                  value={deconOperation}
                  onChange={(ev) => {
                    const newLayer = ev as LayerType;
                    setDeconOperation(newLayer);
                  }}
                />
              </div>

              {(addOperationVisible || editOperationVisible) && (
                <div>
                  <label>
                    <span>Decon Operation Name</span>
                    <input
                      type="text"
                      css={inputStyles}
                      maxLength={250}
                      placeholder="Enter Decon Operation Name"
                      value={newDeconOperationName}
                      onChange={(ev) => {
                        setNewDeconOperationName(ev.target.value);
                        setSaveStatus('changes');
                      }}
                    />
                  </label>

                  <div css={saveButtonContainerStyles}>
                    <button
                      css={saveButtonStyles(saveStatus)}
                      type="submit"
                      disabled={
                        saveStatus === 'none' ||
                        saveStatus === 'success' ||
                        !newDeconOperationName ||
                        newDeconOperationName === deconSketchLayer?.name
                      }
                      onClick={(_ev) => {
                        const layer = layers.find(
                          (l) => l.layerId === deconOperation?.layerId,
                        );

                        if (deconOperation && layer && editOperationVisible) {
                          setDeconOperation((deconOperation) => {
                            if (!deconOperation) return deconOperation;
                            return {
                              ...deconOperation,
                              label: newDeconOperationName,
                              name: newDeconOperationName,
                            };
                          });

                          setLayers((layers) => {
                            return layers.map((layer) => {
                              if (layer.layerId === deconOperation.layerId) {
                                return {
                                  ...layer,
                                  label: newDeconOperationName,
                                  name: newDeconOperationName,
                                };
                              }
                              return layer;
                            });
                          });

                          setEdits((edits) => {
                            if (!deconOperation) return edits;

                            const editsCopy = deepCopyObject(
                              edits,
                            ) as EditsType;
                            const deconOp = editsCopy.edits.find(
                              (edit) =>
                                edit.type === 'layer-decon' &&
                                edit.layerId === deconOperation.layerId,
                            );
                            if (!deconOp) return edits;

                            deconOp.label = newDeconOperationName;
                            deconOp.name = newDeconOperationName;
                            return editsCopy;
                          });
                        } else {
                          const deconUuid = generateUUID();

                          const newOpLayer = {
                            id: -1,
                            pointsId: -1,
                            uuid: deconUuid,
                            layerId: deconUuid,
                            portalId: '',
                            value: deconUuid,
                            name: newDeconOperationName,
                            label: newDeconOperationName,
                            layerType: 'Decon',
                            editType: 'add',
                            visible: true,
                            listMode: 'show',
                            sort: 0,
                            geometryType: 'esriGeometryPolygon',
                            addedFrom: 'sketch',
                            status: 'added',
                            sketchLayer: null,
                            pointsLayer: null,
                            hybridLayer: null,
                            parentLayer: null,
                          } as LayerType;

                          setDeconOperation(newOpLayer);

                          setLayers((layers) => {
                            return [...layers, newOpLayer];
                          });

                          setSelectedScenario((selectedScenario) => {
                            if (selectedScenario?.type !== 'scenario-decon')
                              return selectedScenario;
                            return {
                              ...selectedScenario,
                              linkedLayerIds: [
                                ...selectedScenario.linkedLayerIds,
                                deconUuid,
                              ],
                            };
                          });

                          setEdits((edits) => {
                            const editsCopy = deepCopyObject(
                              edits,
                            ) as EditsType;
                            const scenarioEdits = editsCopy.edits.find(
                              (edit) =>
                                edit.layerId === selectedScenario.layerId,
                            );
                            if (scenarioEdits?.type === 'scenario-decon') {
                              scenarioEdits.linkedLayerIds.push(deconUuid);
                            }

                            return {
                              count: editsCopy.count + 1,
                              edits: [
                                ...editsCopy.edits,
                                {
                                  type: 'layer-decon',
                                  id: -1,
                                  layerId: deconUuid,
                                  portalId: '',
                                  name: newDeconOperationName,
                                  label: newDeconOperationName,
                                  value: deconUuid,
                                  approach: 'Basic',
                                  buildingApproach: null,
                                  layerType: 'Decon',
                                  status: 'added',
                                  editType: 'add',
                                  visible: true,
                                  listMode: 'show',
                                  analysisLayerId: '',
                                  deconLayerResults: {
                                    cost: 0,
                                    time: 0,
                                    wasteVolume: 0,
                                    wasteMass: 0,
                                    resultsTable: [],
                                  },
                                  deconSummaryResults: {},
                                  deconTechSelections:
                                    defaultDeconSelections.map((tech) => ({
                                      ...tech,
                                      id: generateUUID(),
                                    })),
                                } as LayerDeconEditsType,
                              ],
                            };
                          });
                        }

                        setAddOperationVisible(false);
                        setEditOperationVisible(false);
                      }}
                    >
                      {(saveStatus === 'none' || saveStatus === 'changes') &&
                        'Save'}
                      {saveStatus === 'success' && (
                        <Fragment>
                          <i className="fas fa-check" /> Saved
                        </Fragment>
                      )}
                    </button>
                  </div>
                </div>
              )}

              <div css={opIndentStyles}>
                <CharacterizeAOI
                  label="Linked AOI Decon Layer"
                  showHelpText={false}
                  showOnEdit={true}
                />

                {trainingMode && (
                  <div>
                    <label htmlFor="contamination-map-select-input">
                      Contamination map
                    </label>
                    <div css={inlineMenuStyles}>
                      <Select
                        id="contamination-map-select"
                        inputId="contamination-map-select-input"
                        css={fullWidthSelectStyles}
                        styles={reactSelectStyles as any}
                        value={contaminationMap}
                        onChange={(ev) => setContaminationMap(ev as LayerType)}
                        options={layers.filter(
                          (layer: any) =>
                            layer.layerType === 'Contamination Map',
                        )}
                      />
                      <button
                        css={addButtonStyles}
                        onClick={(_ev) => {
                          setGoTo('addData');
                          setGoToOptions({
                            from: 'file',
                            layerType: 'Contamination Map',
                          });
                        }}
                      >
                        Add
                      </button>
                    </div>
                  </div>
                )}

                <button
                  css={submitButtonStyles}
                  onClick={() => setDeconTechPopupOpen(true)}
                  disabled={
                    !deconSketchLayer ||
                    !hasAoiCharacterizationRan ||
                    (trainingMode && (!trainingMode || !contaminationMap))
                  }
                >
                  Select/Edit Decontamination Technology Selections
                </button>

                <DeconSelectionPopup
                  defaultDeconSelections={defaultDeconSelections}
                  isOpen={deconTechPopupOpen}
                  onClose={() => setDeconTechPopupOpen(false)}
                />
              </div>
            </Fragment>
          )}
        </div>
      </div>
      <div css={sectionContainer}>
        <NavigationButton currentPanel="decon" />
      </div>
    </div>
  );
}

const buttonContainerStyles = css`
  display: flex;
  justify-content: center;
  margin-top: 1rem;
`;

const dialogStyles = css`
  color: ${colors.black()};
  background-color: ${colors.white()};
  max-height: 80vh;
  overflow: auto;

  &[data-reach-dialog-content] {
    position: relative;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    margin: 0;
    padding: 1.5rem;
    width: auto;
    max-width: 90%;
  }

  p,
  li {
    font-size: 0.875rem;
    line-height: 1.375;
  }
`;

const dividerStyles = css`
  border-top: solid #4472c4;
  border-width: 3px 0 0;
`;

const headingStyles = css`
  font-size: 117.6471%;
  text-align: center;
`;

const infoIconStylesModified = css`
  ${infoIconStyles}
  margin-right: 1rem;
`;

const infoIconStylesOperations = css`
  ${infoIconStyles}
  margin-bottom: 3px;
`;

const numberedListStyles = css`
  font-size: 0.875rem;
  line-height: 1.375;
  margin: 1rem 0;
`;

const messageBoxStyles = css`
  margin-top: 1rem;
`;

const overlayStyles = css`
  &[data-reach-dialog-overlay] {
    z-index: 100;
    background-color: ${colors.black(0.75)};
  }
`;

const radioContainerStyles = (
  selected: boolean,
  disabled: boolean = false,
) => css`
  align-self: stretch;
  ${selected ? 'background-color: #E5EFF6;' : ''}
  ${disabled ? 'opacity: 0.5;' : ''}
  border: 2px solid ${selected ? '#004B97' : '#C6C6C6'};
  border-radius: 3px;
  flex-basis: 0;
  flex-grow: 1;
  padding: 0.5rem;

  div {
    display: flex;
    gap: 0.25rem;
  }
`;

const radioGroupStyles = css`
  align-items: center;
  display: flex;
  gap: 10px;
  margin-bottom: 1rem;
`;

const radioSubTitleStyles = css`
  display: block;
  font-size: 0.825rem;
  margin: 0 1.125rem 0.75rem;
`;

const saveAttributesButtonStyles = css`
  background-color: #0071bc;
  border: 0;
  color: #fff;
  font-weight: bold;
  line-height: 1;
  margin: 0 0.5em 1.5em 0;
  padding: 0.5882em 1.1765em;
  font-size: 16px;
`;

function isOutside(media: string) {
  return [
    'Soil/Vegetation',
    'Streets - Asphalt',
    'Streets/Sidewalks - Concrete',
  ].includes(media);
}

type DeconSelectionPopupProps = {
  defaultDeconSelections: any[];
  isOpen: boolean;
  onClose: Function;
};

function DeconSelectionPopup({
  defaultDeconSelections,
  isOpen,
  onClose,
}: DeconSelectionPopupProps) {
  const { calculateResultsDecon, setCalculateResultsDecon } =
    useContext(CalculateContext);
  const { trainingMode } = useContext(NavigationContext);
  const { deconOperation, edits, setEdits } = useContext(SketchContext);
  const technologyTypes = useLookupFiles().data.technologyTypes;

  const surfaceOptions: SampleSelectType[] = [];
  const volumetricOptions: SampleSelectType[] = [];
  Object.values(technologyTypes.deconAttributes)
    .sort((a, b) => a.TYPEUUID.localeCompare(b.TYPEUUID))
    .forEach((d) => {
      const optionsArr =
        d.APPLICATION_METHOD === 'Surface' ? surfaceOptions : volumetricOptions;
      optionsArr.push({
        label: d.TYPE,
        value: d.TYPEUUID,
        isPredefined: true,
      });
    });

  const allDeconOptionsGrouped = [
    { label: 'None', value: 'none' },
    {
      label: 'Volumetric',
      options: volumetricOptions,
    },
    {
      label: 'Surface',
      options: surfaceOptions,
    },
  ];

  const selectedDeconOp = edits.edits.find(
    (e) => e.type === 'layer-decon' && e.layerId === deconOperation?.layerId,
  ) as LayerDeconEditsType;

  const options: {
    value: ApproachTypes;
    label: string;
    description: string;
  }[] = [
    {
      value: 'Basic',
      label: 'Basic',
      description: 'Define broad decontamination strategies',
    },
    {
      value: 'Advanced',
      label: 'Advanced',
      description:
        'Define decontamination strategies by structural or material composition',
    },
    {
      value: 'Experimental',
      label: 'Experimental',
      description:
        'Include decontamination estimates for building interior contents',
    },
  ];
  const [selectedApproach, setSelectedApproach] = useState<ApproachTypes>(
    selectedDeconOp?.approach ?? 'Basic',
  );

  const buildingApproachOptions: {
    value: BuildingApproachTypes;
    label: string;
    description: string;
  }[] = [
    {
      value: 'Building Structural Component',
      label: 'Building Structural Component',
      description: '',
    },
    {
      value: 'Building Primary Material Composition',
      label: 'Building Primary Material Composition',
      description: '',
    },
  ];
  const [selectedBuildingApproach, setSelectedBuildingApproach] =
    useState<BuildingApproachTypes>(
      selectedDeconOp?.buildingApproach ?? 'Building Structural Component',
    );

  useEffect(() => {
    const selectedDeconOp = edits.edits.find(
      (e) => e.type === 'layer-decon' && e.layerId === deconOperation?.layerId,
    ) as LayerDeconEditsType;
    setSelectedApproach(selectedDeconOp?.approach ?? 'Basic');
    setSelectedBuildingApproach(
      selectedDeconOp?.buildingApproach ?? 'Building Structural Component',
    );
  }, [edits, deconOperation]);

  let area = 0;
  let buildingFootprintArea = 0;
  let cost = 0;
  let time = 0;
  let wasteVolume = 0;
  let wasteMass = 0;
  if (selectedDeconOp) {
    const aoiLayer = edits.edits.find(
      (e) => e.layerId === selectedDeconOp.analysisLayerId,
    ) as LayerAoiAnalysisEditsType;

    if (aoiLayer) {
      area += aoiLayer.aoiSummary.totalAoiSqM;
      buildingFootprintArea += aoiLayer.aoiSummary.totalBuildingFootprintSqM;
      cost += selectedDeconOp.deconLayerResults.cost;
      time += selectedDeconOp.deconLayerResults.time;
      wasteVolume += selectedDeconOp.deconLayerResults.wasteVolume;
      wasteMass += selectedDeconOp.deconLayerResults.wasteMass;
    }
  }

  const [anyBlank, setAnyBlank] = useState(false);
  const [basicBaseDeconSelections, setBasicBaseDeconSelections] = useState<
    any[]
  >([]);
  const [advancedBaseDeconSelections, setAdvancedBaseDeconSelections] =
    useState<any[]>([]);
  const [
    buildingStructuralDeconSelections,
    setBuildingStructuralDeconSelections,
  ] = useState<any[]>([]);
  const [buildingMaterialDeconSelections, setBuildingMaterialDeconSelections] =
    useState<any[]>([]);

  // initialize decon selections
  useEffect(() => {
    if (!deconOperation) {
      setBasicBaseDeconSelections([]);
      setAdvancedBaseDeconSelections([]);
      setBuildingStructuralDeconSelections([]);
      setBuildingMaterialDeconSelections([]);
      return;
    }

    const selectedDeconOp = edits.edits.find(
      (e) => e.type === 'layer-decon' && e.layerId === deconOperation?.layerId,
    ) as LayerDeconEditsType | undefined;
    let baseDeconSelections: any[] = [];
    if (
      selectedDeconOp?.deconTechSelections &&
      selectedDeconOp?.deconTechSelections.length > 0
    ) {
      baseDeconSelections = [...selectedDeconOp.deconTechSelections];
    } else {
      baseDeconSelections = [...defaultDeconSelections];

      setEdits((edits) => {
        const index = edits.edits.findIndex(
          (item) =>
            item.type === 'layer-decon' &&
            item.layerId === deconOperation?.layerId,
        );

        if (index === -1) return edits;

        const editedOp = edits.edits[index] as LayerDeconEditsType;
        editedOp.deconTechSelections = [...defaultDeconSelections];

        return {
          count: edits.count + 1,
          edits: [
            ...edits.edits.slice(0, index),
            editedOp,
            ...edits.edits.slice(index + 1),
          ],
        };
      });
    }

    function addMedia(key: string, buildingDeconObject: any, deconTech: any) {
      // don't add the deconTech if there is no data for it
      if (
        deconTech.surfaceArea === 0 &&
        deconTech.volume === 0 &&
        deconTech.volumeContents === 0
      )
        return;

      if (Object.prototype.hasOwnProperty.call(buildingDeconObject, key)) {
        buildingDeconObject[key].surfaceArea += deconTech.surfaceArea;
      } else {
        buildingDeconObject[key] = {
          ...deconTech,
          media: key,
          removeContents:
            key === 'Building Interiors' ? deconTech.removeContents : undefined,
        };
      }
    }

    const basicBaseDeconSelections: any[] = [];
    const advancedBaseDeconSelections: any[] = [];
    const buildingStructuralDeconObject: any = {};
    const buildingMaterialDeconObject: any = {};
    baseDeconSelections.forEach((deconTech) => {
      const media = deconTech.media;
      if (isOutside(media) || media === 'Buildings (Interior and Exterior)') {
        basicBaseDeconSelections.push(deconTech);
        if (isOutside(media)) advancedBaseDeconSelections.push(deconTech);
        return;
      }

      if (['Building Exteriors', 'Building Interiors'].includes(media)) {
        addMedia(media, buildingStructuralDeconObject, deconTech);
      } else if (!summarizedBuildingSurfaceTypes.includes(media)) {
        addMedia(media, buildingMaterialDeconObject, deconTech);
      }
    });

    setBasicBaseDeconSelections(basicBaseDeconSelections);
    setAdvancedBaseDeconSelections(advancedBaseDeconSelections);
    setBuildingStructuralDeconSelections(
      Object.values(buildingStructuralDeconObject),
    );
    setBuildingMaterialDeconSelections(
      Object.values(buildingMaterialDeconObject),
    );
  }, [deconOperation, defaultDeconSelections, edits, isOpen, setEdits]);

  function handleApproachChange(selection: ApproachTypes) {
    setSelectedApproach(selection);
  }

  function handleBuildingApproachChange(selection: BuildingApproachTypes) {
    setSelectedBuildingApproach(selection);
  }

  function validateSelection(sel: any) {
    if (!sel.deconTech) return false;
    if (selectedApproach === 'Basic') return true;
    if (!sel.numIterativeApplications || sel.numIterativeApplications < 1)
      return false;
    if (!sel.numTeams || sel.numTeams < 1) return false;
    return true;
  }

  function handleSave() {
    if (!deconOperation) return;

    // get selections
    const basicDeconSelections =
      selectedApproach === 'Advanced'
        ? advancedBaseDeconSelections
        : basicBaseDeconSelections;
    const buildingDeconSelections =
      selectedBuildingApproach === 'Building Primary Material Composition'
        ? buildingMaterialDeconSelections
        : buildingStructuralDeconSelections;

    // get selections to check
    const selectionsToCheck: any[] = [...basicDeconSelections];
    if (selectedApproach === 'Advanced')
      selectionsToCheck.push(...buildingDeconSelections);

    // verify all necessary items have been selected
    let anyBlank = false;
    for (const sel of selectionsToCheck) {
      if (!validateSelection(sel)) anyBlank = true;
      sel.subRows?.forEach((sel: any) => {
        if (!validateSelection(sel)) anyBlank = true;
      });
      if (anyBlank) break;
    }
    setAnyBlank(anyBlank);
    if (anyBlank) return;

    const index = edits.edits.findIndex(
      (item) =>
        item.type === 'layer-decon' && item.layerId === deconOperation.layerId,
    );
    setEdits((edits) => {
      if (index === -1) return edits;

      const editsCopy = deepCopyObject(edits);
      const editedOp = editsCopy.edits[index] as LayerDeconEditsType;
      const newDeconTechSelections: any[] = [];

      // build new deconTech selections
      editedOp.deconTechSelections.forEach((originalTech) => {
        const basicDeconSel = basicDeconSelections.find(
          (t) => t.id === originalTech.id,
        );
        const bldgDeconSel = buildingDeconSelections.find(
          (t) => t.id === originalTech.id,
        );
        if (!basicDeconSel && !bldgDeconSel) {
          if (selectedApproach === 'Basic') originalTech.numTeams = 1;
          newDeconTechSelections.push(originalTech);
          return;
        }

        if (selectedApproach === 'Basic' && basicDeconSel)
          basicDeconSel.numTeams = 1;
        if (basicDeconSel) newDeconTechSelections.push(basicDeconSel);
        if (bldgDeconSel) newDeconTechSelections.push(bldgDeconSel);
      });

      editedOp.deconTechSelections = newDeconTechSelections;
      editedOp.approach = selectedApproach;
      editedOp.buildingApproach =
        selectedApproach !== 'Basic' ? selectedBuildingApproach : null;

      return {
        count: editsCopy.count + 1,
        edits: editsCopy.edits,
      };
    });

    setTimeout(() => {
      setCalculateResultsDecon((calculateResultsDecon) => {
        return {
          status: 'fetching',
          panelOpen: calculateResultsDecon.panelOpen,
          data: null,
        };
      });
    }, 100);
  }

  const devMode = window.location.search.includes('devMode=true');

  return (
    <DialogOverlay
      css={overlayStyles}
      isOpen={isOpen}
      data-testid="tots-decon-tech-selections"
    >
      <DialogContent css={dialogStyles} aria-label="Edit Attribute">
        <h1 css={headingStyles}>
          Specify Decontamination Strategies for Contamination Scenarios{' '}
          {deconOperation ? `in ${deconOperation?.label}` : ''}
        </h1>

        <div css={resourceTallyContainerStyles}>
          <div>
            <div>
              <strong>{deconOperation?.label} Size: </strong>{' '}
              {formatNumber(area)} m²
            </div>
            <div>
              <strong>Total Building Footprint:</strong>{' '}
              {formatNumber(buildingFootprintArea)} m²
            </div>
            <div>
              <strong>Detection Limit:</strong> 100 (CFU/m²)
            </div>
          </div>
          <div>
            {calculateResultsDecon.status === 'fetching' && <LoadingSpinner />}
            {calculateResultsDecon.status === 'success' &&
            calculateResultsDecon.data &&
            deconOperation ? (
              <Fragment>
                <div>
                  <strong>Total Cost:</strong> $
                  {Math.round(cost).toLocaleString()}
                </div>
                <div>
                  <strong>Max Time Day(s):</strong>{' '}
                  {Math.round(time).toLocaleString()}
                </div>
                <div>
                  <strong>
                    Total Waste Volume (m<sup>3</sup>):
                  </strong>{' '}
                  {Math.round(wasteVolume).toLocaleString()}
                </div>
                <div>
                  <strong>Total Waste Mass (kg):</strong>{' '}
                  {Math.round(wasteMass).toLocaleString()}
                </div>
              </Fragment>
            ) : null}
          </div>
        </div>

        <div css={numberedListStyles}>
          For buildings, three different estimation approaches are available.
          Each approach is independent of the other and calculations only
          reflect the currently selected approach.
          <ol>
            <li>
              Basic: Specify broad decontamination strategies applied to all
              interior and exterior surfaces.{' '}
            </li>

            <li>
              Advanced - Building Structural Component: Define and differentiate
              decontamination strategies by building structural component where
              surface areas for building interiors and exteriors are presented
              separately.
            </li>

            <li>
              Advanced - Building Primary Material Composition: Define and
              differentiate decontamination strategies by building primary
              material composition where contamination scenarios are presented
              by type of primary building material type. An additional option is
              available to further define a strategy for each material type by
              building exterior or interior surfaces.
            </li>
          </ol>
        </div>

        <strong>Select estimation approach:</strong>

        <div css={radioGroupStyles}>
          {options.map((option) => (
            <div
              key={option.value}
              css={radioContainerStyles(
                option.value === selectedApproach,
                option.value === 'Experimental',
              )}
              onClick={() => {
                if (option.value === 'Experimental') return;
                handleApproachChange(option.value);
              }}
            >
              <div>
                <input
                  id={`${option.value}-approach`}
                  type="radio"
                  name="decon-approach"
                  value={option.value}
                  checked={option.value === selectedApproach}
                  disabled={option.value === 'Experimental'}
                  onChange={(_ev) => handleApproachChange(option.value)}
                />
                <label htmlFor={`${option.value}-approach`}>
                  {option.label}
                </label>
              </div>
              <span css={radioSubTitleStyles}>{option.description}</span>
            </div>
          ))}
        </div>

        <p>
          For each contamination scenario listed, choose a decontamination
          method from the drop-down menu. An{' '}
          <a
            href="https://www.epa.gov/emergency-response-research/analysis-coastal-operational-resiliency"
            target="_blank"
            rel="noopener noreferrer"
          >
            overview of available technologies and applicable considerations
          </a>{' '}
          is also available to review.
        </p>

        <ReactTableEditable
          id={generateUUID()}
          data={
            selectedApproach === 'Advanced'
              ? advancedBaseDeconSelections
              : basicBaseDeconSelections
          }
          striped={true}
          hideHeader={false}
          height={-1}
          onDataChange={(rowIndex: any, columnId: any, value: any) => {
            const selections =
              selectedApproach === 'Advanced'
                ? advancedBaseDeconSelections
                : basicBaseDeconSelections;
            const newTable = selections.map((row: any, index: number) => {
              // update the row if it is the row in focus and the data has changed
              if (index === rowIndex && row[columnId] !== value) {
                return {
                  ...selections[rowIndex],
                  [columnId]: value,
                };
              }
              return row;
            });

            const setter =
              selectedApproach === 'Advanced'
                ? setAdvancedBaseDeconSelections
                : setBasicBaseDeconSelections;
            setter(newTable);
          }}
          getColumns={(_tableWidth: any) => {
            return [
              {
                header: 'ID',
                accessorKey: 'ID',
                size: 0,
                show: false,
              },
              {
                header: 'Contamination Scenario',
                accessorKey: 'media',
                size: 118,
              },
              {
                header: 'Percent of AOI',
                accessorKey: 'pctAoi',
                size: 75,
                cell: (info: CellContext<any, any>) => {
                  if (
                    info.row.original.media ===
                    'Buildings (Interior and Exterior)'
                  )
                    return undefined;
                  return `${formatNumber(info.getValue())}%`;
                },
              },
              {
                header: () => (
                  <div>
                    Surface Area
                    <InfoIcon
                      id="basic-surface-area-info-icon"
                      cssStyles={infoIconStylesModified}
                      tooltip={surfaceAreaInfoText}
                    />
                  </div>
                ),
                accessorKey: 'surfaceArea',
                size: 75,
                cell: (info: CellContext<any, any>) =>
                  `${formatNumber(info.getValue())} m²`,
              },
              {
                header: 'Volume',
                accessorKey: 'volume',
                size: 75,
                cell: (info: CellContext<any, any>) =>
                  `${formatNumber(info.getValue())} m³`,
                show: devMode,
              },
              {
                header: 'Average Initial Contamination (CFUs/m²)',
                accessorKey: 'avgCfu',
                size: 97,
                cell: (info: CellContext<any, any>) =>
                  formatNumber(info.getValue()),
                show: devMode && trainingMode,
              },
              {
                header: 'Biological Decon Technology',
                accessorKey: 'deconTech',
                size: 150,
                cell: ReactTableEditableCell,
                editType: 'select',
                ariaLabelCol: 'media',
                options: allDeconOptionsGrouped,
              },
              {
                header: 'Number of Decon Iterations',
                accessorKey: 'numIterativeApplications',
                size: 75,
                cell: ReactTableEditableCell,
                editType: 'input',
                ariaLabelCol: 'media',
                show: selectedApproach === 'Advanced',
              },
              {
                header: 'Number of Teams',
                accessorKey: 'numTeams',
                size: 75,
                cell: ReactTableEditableCell,
                editType: 'input',
                ariaLabelCol: 'media',
                show: selectedApproach === 'Advanced',
              },
              {
                header: 'Average Final Contamination (CFUs/m²)',
                accessorKey: 'avgFinalContamination',
                size: 97,
                cell: (info: CellContext<any, any>) =>
                  formatNumber(info.getValue()),
                show: devMode && trainingMode,
              },
              {
                header: 'Above/Below Detection Limit',
                accessorKey: 'aboveDetectionLimit',
                size: 97,
                cell: (info: CellContext<any, any>) =>
                  info.getValue() ? 'Above' : 'Below',
                show: devMode && trainingMode,
              },
            ];
          }}
        />

        {selectedApproach === 'Advanced' && (
          <Fragment>
            <hr css={dividerStyles} />

            <div css={radioGroupStyles}>
              {buildingApproachOptions.map((option) => (
                <div
                  key={option.value}
                  css={radioContainerStyles(
                    option.value === selectedBuildingApproach,
                  )}
                  onClick={() => handleBuildingApproachChange(option.value)}
                >
                  <div>
                    <input
                      id={`${option.value}-approach`}
                      type="radio"
                      name="building-approach"
                      value={option.value}
                      checked={option.value === selectedBuildingApproach}
                      onChange={(_ev) =>
                        handleBuildingApproachChange(option.value)
                      }
                    />
                    <label htmlFor={`${option.value}-approach`}>
                      {option.label}
                    </label>
                  </div>
                </div>
              ))}
            </div>

            {selectedBuildingApproach === 'Building Structural Component' && (
              <ReactTableEditable
                id={generateUUID()}
                data={buildingStructuralDeconSelections}
                striped={true}
                hideHeader={false}
                height={-1}
                onDataChange={(rowIndex: any, columnId: any, value: any) => {
                  const newTable = buildingStructuralDeconSelections.map(
                    (row: any, index: number) => {
                      // update the row if it is the row in focus and the data has changed
                      if (index === rowIndex && row[columnId] !== value) {
                        return {
                          ...buildingStructuralDeconSelections[rowIndex],
                          [columnId]: value,
                        };
                      }
                      return row;
                    },
                  );

                  setBuildingStructuralDeconSelections(newTable);
                }}
                getColumns={(_tableWidth: any) => {
                  return [
                    {
                      header: 'ID',
                      accessorKey: 'ID',
                      size: 0,
                      show: false,
                    },
                    {
                      header: 'Contamination Scenario',
                      accessorKey: 'media',
                      size: 118,
                    },
                    {
                      header: () => (
                        <div>
                          Surface Area
                          <InfoIcon
                            id="advanced-structural-surface-area-info-icon"
                            cssStyles={infoIconStylesModified}
                            tooltip={surfaceAreaInfoText}
                          />
                        </div>
                      ),
                      accessorKey: 'surfaceArea',
                      size: 75,
                      cell: (info: CellContext<any, any>) =>
                        `${formatNumber(info.getValue())} m²`,
                    },
                    {
                      header: 'Volume',
                      accessorKey: 'volume',
                      size: 75,
                      cell: (info: CellContext<any, any>) =>
                        `${formatNumber(info.getValue())} m³`,
                      show: devMode,
                    },
                    {
                      header: 'Volume Contents',
                      accessorKey: 'volumeContents',
                      size: 75,
                      cell: (info: CellContext<any, any>) =>
                        `${formatNumber(info.getValue())} m³`,
                      show: devMode,
                    },
                    {
                      header: 'Average Initial Contamination (CFUs/m²)',
                      accessorKey: 'avgCfu',
                      size: 97,
                      cell: (info: CellContext<any, any>) =>
                        formatNumber(info.getValue()),
                      show: devMode && trainingMode,
                    },
                    {
                      header: 'Biological Decon Technology',
                      accessorKey: 'deconTech',
                      size: 150,
                      cell: ReactTableEditableCell,
                      editType: 'select',
                      ariaLabelCol: 'media',
                      options: allDeconOptionsGrouped,
                    },
                    {
                      header: 'Remove Bldg Contents After Decon?',
                      accessorKey: 'removeContents',
                      size: 50,
                      cell: ReactTableEditableCell,
                      editType: 'checkbox',
                      ariaLabelCol: 'media',
                    },
                    {
                      header: 'Number of Decon Iterations',
                      accessorKey: 'numIterativeApplications',
                      size: 75,
                      cell: ReactTableEditableCell,
                      editType: 'input',
                      ariaLabelCol: 'media',
                      show: selectedApproach === 'Advanced',
                    },
                    {
                      header: 'Number of Teams',
                      accessorKey: 'numTeams',
                      size: 75,
                      cell: ReactTableEditableCell,
                      editType: 'input',
                      ariaLabelCol: 'media',
                      show: selectedApproach === 'Advanced',
                    },
                    {
                      header: 'Average Final Contamination (CFUs/m²)',
                      accessorKey: 'avgFinalContamination',
                      size: 97,
                      cell: (info: CellContext<any, any>) =>
                        formatNumber(info.getValue()),
                      show: devMode && trainingMode,
                    },
                    {
                      header: 'Above/Below Detection Limit',
                      accessorKey: 'aboveDetectionLimit',
                      size: 97,
                      cell: (info: CellContext<any, any>) =>
                        info.getValue() ? 'Above' : 'Below',
                      show: devMode && trainingMode,
                    },
                  ];
                }}
              />
            )}
            {selectedBuildingApproach ===
              'Building Primary Material Composition' && (
              <ReactTableEditable
                id={generateUUID()}
                expandable={true}
                resizable={false}
                data={buildingMaterialDeconSelections}
                striped={true}
                hideHeader={false}
                height={-1}
                onDataChange={(rowIndex: any, columnId: any, value: any) => {
                  const newTable = buildingMaterialDeconSelections.map(
                    (row: any, index: number) => {
                      // update the row if it is the row in focus and the data has changed
                      if (index === rowIndex) {
                        // if the edited column is subRows, sync the parent row with the subRows
                        // otherwise just update the row like normal
                        if (columnId === 'subRows') {
                          let deconTech =
                            row.deconTech?.value === 'multiple'
                              ? undefined
                              : row.deconTech;
                          let anyDifferentDeconTech = false;
                          let removeContents = row.removeContents;
                          let numIterativeApplications = 1;
                          let numTeams = 1;
                          value.forEach((subRow: any) => {
                            if (deconTech === undefined)
                              deconTech = subRow.deconTech;

                            if (deconTech?.value !== subRow.deconTech?.value)
                              anyDifferentDeconTech = true;
                            if (subRow.media === 'Building Interiors') {
                              removeContents = subRow.removeContents;
                            }
                            if (
                              subRow.numIterativeApplications >
                              numIterativeApplications
                            ) {
                              numIterativeApplications =
                                subRow.numIterativeApplications;
                            }
                            if (subRow.numTeams > numTeams) {
                              numTeams = subRow.numTeams;
                            }
                          });

                          return {
                            ...buildingMaterialDeconSelections[rowIndex],
                            [columnId]: value,
                            deconTech: anyDifferentDeconTech
                              ? {
                                  label: 'Multiple Selected...',
                                  value: 'multiple',
                                }
                              : deconTech,
                            removeContents: removeContents,
                            numIterativeApplications,
                            numTeams,
                          };
                        } else {
                          return {
                            ...buildingMaterialDeconSelections[rowIndex],
                            [columnId]: value,
                            subRows: row.subRows.map((subRow: any) => {
                              return {
                                ...subRow,
                                [columnId]:
                                  subRow.media === 'Building Exteriors' &&
                                  columnId === 'removeContents'
                                    ? false
                                    : value,
                              };
                            }),
                          };
                        }
                      }
                      return row;
                    },
                  );

                  setBuildingMaterialDeconSelections(newTable);
                }}
                getColumns={(_tableWidth: any) => {
                  return [
                    {
                      header: 'ID',
                      accessorKey: 'ID',
                      size: 0,
                      show: false,
                    },
                    {
                      header: 'Contamination Scenario',
                      accessorKey: 'media',
                      size: 118,
                    },
                    {
                      header: () => (
                        <div>
                          Surface Area
                          <InfoIcon
                            id="advanced-material-surface-area-info-icon"
                            cssStyles={infoIconStylesModified}
                            tooltip={surfaceAreaInfoText}
                          />
                        </div>
                      ),
                      accessorKey: 'surfaceArea',
                      size: 80,
                      cell: (info: CellContext<any, any>) =>
                        `${formatNumber(info.getValue())} m²`,
                    },
                    {
                      header: 'Volume',
                      accessorKey: 'volume',
                      size: 75,
                      cell: (info: CellContext<any, any>) =>
                        `${formatNumber(info.getValue())} m³`,
                      show: devMode,
                    },
                    {
                      header: 'Volume Contents',
                      accessorKey: 'volumeContents',
                      size: 75,
                      cell: (info: CellContext<any, any>) =>
                        `${formatNumber(info.getValue())} m³`,
                      show: devMode,
                    },
                    {
                      header: 'Average Initial Contamination (CFUs/m²)',
                      accessorKey: 'avgCfu',
                      size: 97,
                      cell: (info: CellContext<any, any>) =>
                        formatNumber(info.getValue()),
                      show: devMode && trainingMode,
                    },
                    {
                      header: 'Biological Decon Technology',
                      accessorKey: 'deconTech',
                      size: 150,
                      cell: ReactTableEditableCell,
                      editType: 'select',
                      ariaLabelCol: 'media',
                      options: allDeconOptionsGrouped,
                    },
                    {
                      header: 'Remove Bldg Contents After Decon?',
                      accessorKey: 'removeContents',
                      size: 50,
                      cell: ReactTableEditableCell,
                      editType: 'checkbox',
                      ariaLabelCol: 'media',
                    },
                    {
                      header: 'Number of Decon Iterations',
                      accessorKey: 'numIterativeApplications',
                      size: 75,
                      cell: ReactTableEditableCell,
                      editType: 'input',
                      ariaLabelCol: 'media',
                      show: selectedApproach === 'Advanced',
                    },
                    {
                      header: 'Number of Teams',
                      accessorKey: 'numTeams',
                      size: 75,
                      cell: ReactTableEditableCell,
                      editType: 'input',
                      ariaLabelCol: 'media',
                      show: selectedApproach === 'Advanced',
                    },
                    {
                      header: 'Average Final Contamination (CFUs/m²)',
                      accessorKey: 'avgFinalContamination',
                      size: 97,
                      show: devMode && trainingMode,
                    },
                    {
                      header: 'Above/Below Detection Limit',
                      accessorKey: 'aboveDetectionLimit',
                      size: 97,
                      show: devMode && trainingMode,
                    },
                  ];
                }}
              />
            )}
          </Fragment>
        )}

        {anyBlank && (
          <div css={messageBoxStyles}>
            <MessageBox
              title="Missing Selections"
              severity="warning"
              message={`All rows need to have a Decon Technology selected${selectedApproach !== 'Basic' ? ', Number of Decon Iterations needs to be at-least 1 and Number of Teams needs to be at-least 1' : ''}. Please make the necessary selections and try again.`}
            />
          </div>
        )}

        <div css={buttonContainerStyles}>
          <button css={saveAttributesButtonStyles} onClick={handleSave}>
            Save
          </button>
          <button
            css={saveAttributesButtonStyles}
            onClick={() => {
              handleSave();
              onClose();
            }}
          >
            Save and Continue
          </button>
          <button
            css={saveAttributesButtonStyles}
            onClick={() => {
              onClose();
            }}
          >
            Close
          </button>
        </div>
      </DialogContent>
    </DialogOverlay>
  );
}

export default CreateDeconPlan;

const resourceTallyContainerStyles = css`
  display: flex;
  justify-content: space-around;
`;
