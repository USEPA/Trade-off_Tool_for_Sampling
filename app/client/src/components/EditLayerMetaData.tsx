/** @jsxImportSource @emotion/react */

import React, {
  Fragment,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from 'react';
import { css } from '@emotion/react';
import GroupLayer from '@arcgis/core/layers/GroupLayer';
import Portal from '@arcgis/core/portal/Portal';
// components
import LoadingSpinner from 'components/LoadingSpinner';
import Select from 'components/Select';
// contexts
import { AuthenticationContext } from 'contexts/Authentication';
import { settingDefaults } from 'contexts/Calculate';
import { NavigationContext } from 'contexts/Navigation';
import { PublishContext } from 'contexts/Publish';
import { SketchContext } from 'contexts/Sketch';
// utils
import { isServiceNameAvailable } from 'utils/arcGisRestUtils';
import {
  createLayerEditTemplate,
  createSampleLayer,
  createScenarioDecon,
  updateLayerEdits,
} from 'utils/sketchUtils';
import { createErrorObject } from 'utils/utils';
// types
import {
  LayerAoiAnalysisEditsType,
  LayerDeconEditsType,
  LayerEditsType,
  ScenarioDeconEditsType,
  ScenarioEditsType,
} from 'types/Edits';
import { LayerType } from 'types/Layer';
import { ErrorType } from 'types/Misc';
import { AppType } from 'types/Navigation';
// config
import {
  scenarioNameInvalidMessage,
  scenarioNameTakenMessage,
  webServiceErrorMessage,
} from 'config/errorMessages';
// styles
import { colors, isDecon, linkButtonStyles, reactSelectStyles } from 'styles';

const failedStatuses = [
  'failure',
  'fetch-failure',
  'name-not-available',
  'invalid-characters',
];

export type SaveStatusType =
  | 'none'
  | 'changes'
  | 'fetching'
  | 'success'
  | 'failure'
  | 'fetch-failure'
  | 'available'
  | 'name-not-available'
  | 'invalid-characters';

export type SaveResultsType = {
  name?: string;
  status: SaveStatusType;
  error?: ErrorType;
};

type SelectedService = {
  url: string;
  description: string;
  label: string;
  value: string;
};

type FeatureServices = {
  status: 'fetching' | 'failure' | 'success';
  data: SelectedService[];
};

// --- styles (EditScenario) ---
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

const saveButtonStyles = (status: string) => {
  let backgroundColor = '';
  if (status === 'success') {
    backgroundColor = `background-color: ${colors.green()};`;
  }
  if (failedStatuses.includes(status)) {
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

// --- components (EditScenario) ---
type Props = {
  appType: AppType;
  initialScenario?: ScenarioEditsType | ScenarioDeconEditsType | null;
  buttonText?: string;
  initialStatus?: SaveStatusType;
  addDefaultSampleLayer?: boolean;
  onSave?: (saveResults?: SaveResultsType) => void;
};

export function EditScenario({
  appType,
  initialScenario = null,
  buttonText = 'Save',
  initialStatus = 'none',
  addDefaultSampleLayer = false,
  onSave,
}: Props) {
  const { portal, signedIn } = useContext(AuthenticationContext);
  const {
    edits,
    setEdits,
    map,
    layers,
    setDeconOperation,
    setLayers,
    setSelectedScenario,
    setSketchLayer,
  } = useContext(SketchContext);

  // focus on the first input
  useEffect(() => {
    document.getElementById('scenario-name-input')?.focus();
  }, []);

  const [saveStatus, setSaveStatus] = useState<SaveResultsType>({
    name: initialScenario ? initialScenario.scenarioName : '',
    status: initialStatus,
  });

  const [scenarioName, setScenarioName] = useState(
    initialScenario ? initialScenario.scenarioName : '',
  );
  const [scenarioDescription, setScenarioDescription] = useState(
    initialScenario ? initialScenario.scenarioDescription : '',
  );

  // Updates the scenario metadata.
  function updateScenario(appType: AppType) {
    if (appType === 'decon') updateScenarioDecon();
    if (appType === 'sampling') updateScenarioSampling();
  }

  function updateScenarioSampling() {
    if (!map) return;

    // find the layer being edited
    let index = -1;
    if (initialScenario) {
      index = edits.edits.findIndex(
        (item) =>
          item.type === 'scenario' && item.layerId === initialScenario.layerId,
      );
    }

    // update an existing scenario, otherwise add the new scenario
    if (index > -1 && initialScenario) {
      // update the group layer name
      for (let i = 0; i < map.layers.length; i++) {
        const layer = map.layers.getItemAt(i);
        if (layer.type === 'group' && layer.id === initialScenario.layerId) {
          layer.title = scenarioName;
          break;
        }
      }

      // update the selected scenario
      setSelectedScenario((selectedScenario) => {
        if (!selectedScenario) return null;

        return {
          ...selectedScenario,
          label: scenarioName,
          name: scenarioName,
          scenarioName: scenarioName,
          scenarioDescription: scenarioDescription,
        };
      });

      // make a copy of the edits context variable
      setEdits((edits) => {
        const editedScenario = edits.edits[index] as ScenarioEditsType;
        editedScenario.label = scenarioName;
        editedScenario.name = scenarioName;
        editedScenario.scenarioName = scenarioName;
        editedScenario.scenarioDescription = scenarioDescription;

        return {
          count: edits.count + 1,
          edits: [
            ...edits.edits.slice(0, index),
            editedScenario,
            ...edits.edits.slice(index + 1),
          ],
        };
      });
    } else {
      // create a new group layer for the scenario
      const groupLayer = new GroupLayer({
        title: scenarioName,
      });

      // hide all other plans from the map
      layers.forEach((layer) => {
        if (
          ['Decon Mask', 'Image Analysis', 'AOI Assessed'].includes(
            layer.layerType,
          )
        )
          return;

        if (layer.parentLayer) {
          layer.parentLayer.visible = false;
          return;
        }

        if (layer.layerType === 'Samples' || layer.layerType === 'VSP') {
          if (layer.sketchLayer) layer.sketchLayer.visible = false;
        }
      });

      const newLayers: LayerEditsType[] = [];
      let tempSketchLayer: LayerType | null = null;
      if (addDefaultSampleLayer) {
        edits.edits.forEach((edit) => {
          if (
            edit.type === 'layer' &&
            (edit.layerType === 'Samples' || edit.layerType === 'VSP')
          ) {
            newLayers.push(edit);
          }
        });

        if (newLayers.length === 0) {
          // no sketchable layers were available, create one
          tempSketchLayer = createSampleLayer(false, undefined, groupLayer);
          newLayers.push(createLayerEditTemplate(tempSketchLayer, 'add'));
        } else {
          // update the parentLayer of layers being added to the group layer
          setLayers((layers) => {
            newLayers.forEach((newLayer) => {
              const layer = layers.find((l) => l.layerId === newLayer.layerId);
              if (!layer) return;

              layer.parentLayer = groupLayer;
              if (layer.sketchLayer) {
                groupLayer.add(layer.sketchLayer);
                map.layers.remove(layer.sketchLayer);
              }
              if (layer.pointsLayer) {
                groupLayer.add(layer.pointsLayer);
                map.layers.remove(layer.pointsLayer);
              }
              if (layer.hybridLayer) {
                groupLayer.add(layer.hybridLayer);
                map.layers.remove(layer.hybridLayer);
              }
            });

            return layers;
          });
        }
      }

      // create the scenario to be added to edits
      const newScenario: ScenarioEditsType = {
        type: 'scenario',
        id: -1,
        pointsId: -1,
        layerId: groupLayer.id,
        portalId: '',
        name: scenarioName,
        label: scenarioName,
        value: groupLayer.id,
        layerType: 'Samples',
        addedFrom: 'sketch',
        hasContaminationRan: false,
        status: 'added',
        editType: 'add',
        visible: true,
        listMode: 'show',
        scenarioName: scenarioName,
        scenarioDescription: scenarioDescription,
        layers: newLayers,
        table: null,
        referenceLayersTable: {
          id: -1,
          referenceLayers: [],
        },
        customAttributes: [],
        calculateSettings: { current: settingDefaults },
        calculateResultsPublished: null,
      };

      // make a copy of the edits context variable
      setEdits((edits) => {
        const newEdits = edits.edits.filter((edit) => {
          const idx = newLayers.findIndex((l) => l.layerId === edit.layerId);

          return idx === -1;
        });

        newEdits.forEach((edit) => {
          let visible = edit.visible;

          if (edit.type === 'scenario') {
            visible = edit.layerId === newScenario.layerId ? true : false;
          }
          if (edit.type === 'layer') {
            if (edit.layerType === 'Samples' || edit.layerType === 'VSP') {
              visible = false;
            }
          }
          edit.visible = visible;
        });

        return {
          count: edits.count + 1,
          edits: [...newEdits, newScenario],
        };
      });

      // select the new scenario
      setSelectedScenario(newScenario);

      if (addDefaultSampleLayer && tempSketchLayer) {
        if (tempSketchLayer.sketchLayer)
          groupLayer.add(tempSketchLayer.sketchLayer);
        if (tempSketchLayer.pointsLayer) {
          groupLayer.add(tempSketchLayer.pointsLayer);
        }
        if (tempSketchLayer.hybridLayer) {
          groupLayer.add(tempSketchLayer.hybridLayer);
        }

        // update layers (set parent layer)
        setLayers((layers) => {
          if (!tempSketchLayer) return layers;

          return [...layers, tempSketchLayer];
        });

        // update sketchLayer (clear parent layer)
        setSketchLayer(tempSketchLayer);
      }

      // add the scenario group layer to the map
      map.add(groupLayer);
    }

    const saveStatus: SaveResultsType = {
      status: 'success',
      name: scenarioName,
    };
    setSaveStatus(saveStatus);
    if (onSave) onSave(saveStatus);
  }

  function updateScenarioDecon() {
    if (!map) return;

    // find the layer being edited
    let index = -1;
    if (initialScenario) {
      index = edits.edits.findIndex(
        (item) =>
          item.type === 'scenario-decon' &&
          item.layerId === initialScenario.layerId,
      );
    }

    // update an existing scenario, otherwise add the new scenario
    if (index > -1 && initialScenario) {
      // update the group layer name
      for (let i = 0; i < map.layers.length; i++) {
        const layer = map.layers.getItemAt(i);
        if (layer.type === 'group' && layer.id === initialScenario.layerId) {
          layer.title = scenarioName;
          break;
        }
      }

      // update the selected scenario
      setSelectedScenario((selectedScenario) => {
        if (!selectedScenario) return null;

        return {
          ...selectedScenario,
          label: scenarioName,
          name: scenarioName,
          scenarioName: scenarioName,
          scenarioDescription: scenarioDescription,
        };
      });

      // make a copy of the edits context variable
      setEdits((edits) => {
        const editedScenario = {
          ...edits.edits[index],
        } as ScenarioDeconEditsType;
        editedScenario.label = scenarioName;
        editedScenario.name = scenarioName;
        editedScenario.scenarioName = scenarioName;
        editedScenario.scenarioDescription = scenarioDescription;

        return {
          count: edits.count + 1,
          edits: [
            ...edits.edits.slice(0, index),
            editedScenario,
            ...edits.edits.slice(index + 1),
          ],
        };
      });
    } else {
      const { scenario: newScenario } = createScenarioDecon(
        scenarioName,
        scenarioDescription,
      );

      const deconOpsLinked: string[] = [];
      edits.edits.forEach((edit) => {
        if (edit.type !== 'scenario-decon') return;
        deconOpsLinked.push(...edit.linkedLayerIds);
      });

      const deconLayerEdits = edits.edits.find(
        (e) => !deconOpsLinked.includes(e.layerId) && e.type === 'layer-decon',
      ) as LayerDeconEditsType | undefined;
      const aoiLayer = edits.edits.find((e) => e.type === 'layer-aoi-analysis');
      if (deconLayerEdits) {
        newScenario.linkedLayerIds = [deconLayerEdits.layerId];
        const deconLayer = layers.find(
          (l) =>
            l.layerType === 'Decon' && l.layerId === deconLayerEdits.layerId,
        );
        if (deconLayer) setDeconOperation(deconLayer);

        if (aoiLayer) {
          deconLayerEdits.analysisLayerId = aoiLayer.layerId;
          deconLayerEdits.deconTechSelections = aoiLayer.deconTechSelections;
        }
      }

      // make a copy of the edits context variable
      setEdits((edits) => {
        return {
          count: edits.count + 1,
          edits: [...edits.edits, newScenario],
        };
      });

      // select the new scenario
      setSelectedScenario(newScenario);
    }

    const saveStatus: SaveResultsType = {
      status: 'success',
      name: scenarioName,
    };
    setSaveStatus(saveStatus);
    if (onSave) onSave(saveStatus);
  }

  // Handles saving of the layer's scenario name and description fields.
  // Also checks the uniqueness of the scenario name, if the user is signed in.
  function handleSave() {
    setSaveStatus({
      status: 'fetching',
      name: scenarioName,
    });

    // if the user is signed in, go ahead and check if the
    // service (scenario) name is availble before continuing
    isServiceNameAvailable(portal, signedIn, scenarioName)
      .then((res: any) => {
        if (res.error) {
          const saveStatus: SaveResultsType = {
            status: 'failure',
            name: scenarioName,
            error: {
              error: createErrorObject(res),
              message: res.error.message,
            },
          };
          setSaveStatus(saveStatus);
          if (onSave) onSave(saveStatus);
          return;
        }

        if (!res.available) {
          const saveStatus: SaveResultsType = {
            name: scenarioName,
            status: res.problem ?? 'name-not-available',
          };
          setSaveStatus(saveStatus);
          if (onSave) onSave(saveStatus);
          return;
        }

        updateScenario(appType);
      })
      .catch((err: any) => {
        console.error('isServiceNameAvailable error', err);
        setSaveStatus({
          status: 'failure',
          error: { error: createErrorObject(err), message: err.message },
        });

        window.logErrorToGa(err);
      });
  }

  return (
    <form
      onSubmit={(ev) => {
        ev.preventDefault();
      }}
    >
      <label htmlFor="scenario-name-input">Plan Name</label>
      <input
        id="scenario-name-input"
        disabled={
          initialScenario && initialScenario.status !== 'added' ? true : false
        }
        css={inputStyles}
        maxLength={90}
        placeholder="Enter Plan Name"
        value={scenarioName}
        onChange={(ev) => {
          setScenarioName(ev.target.value);
          setSaveStatus({ status: 'changes' });
        }}
      />
      <label htmlFor="scenario-description-input">Plan Description</label>
      <input
        id="scenario-description-input"
        disabled={
          initialScenario && initialScenario.status !== 'added' ? true : false
        }
        css={inputStyles}
        maxLength={2048}
        placeholder="Enter Plan Description (2048 characters)"
        value={scenarioDescription}
        onChange={(ev) => {
          setScenarioDescription(ev.target.value);
          setSaveStatus({ status: 'changes' });
        }}
      />

      {saveStatus.status === 'fetching' && <LoadingSpinner />}
      {saveStatus.status === 'failure' &&
        webServiceErrorMessage(saveStatus.error)}
      {saveStatus.status === 'name-not-available' &&
        scenarioNameTakenMessage(saveStatus.name)}
      {saveStatus.status === 'invalid-characters' &&
        scenarioNameInvalidMessage(saveStatus.name)}
      {(!initialScenario || initialScenario.status === 'added') && (
        <div css={saveButtonContainerStyles}>
          <button
            css={saveButtonStyles(saveStatus.status)}
            type="submit"
            disabled={
              saveStatus.status === 'none' ||
              saveStatus.status === 'fetching' ||
              saveStatus.status === 'success'
            }
            onClick={handleSave}
          >
            {failedStatuses.includes(saveStatus.status) ? (
              <Fragment>
                <i className="fas fa-exclamation-triangle" /> Error
              </Fragment>
            ) : saveStatus.status === 'success' ? (
              <Fragment>
                <i className="fas fa-check" /> Saved
              </Fragment>
            ) : (
              buttonText
            )}
          </button>
        </div>
      )}
    </form>
  );
}

const modLinkButtonStyles = css`
  ${linkButtonStyles}
  margin-left: 0;
`;

// --- components (EditLayer) ---
type EditLayerProps = {
  appType: AppType;
  initialLayer?: LayerType | null;
  buttonText?: string;
  initialStatus?: SaveStatusType;
  onSave?: () => void;
};

export function EditLayer({
  appType,
  initialLayer = null,
  buttonText = 'Save',
  initialStatus = 'none',
  onSave,
}: EditLayerProps) {
  const { setGoTo, setGoToOptions } = useContext(NavigationContext);
  const {
    edits,
    setEdits,
    layers,
    setLayers,
    selectedScenario,
    setSelectedScenario,
    setSketchLayer,
    map,
  } = useContext(SketchContext);

  const [
    saveStatus,
    setSaveStatus, //
  ] = useState<SaveStatusType>(initialStatus);

  const [layerName, setLayerName] = useState(
    initialLayer ? initialLayer.label : '',
  );

  // focus on the first input
  useEffect(() => {
    document.getElementById('layer-name-input')?.focus();
  }, []);

  // Saves the scenario name and description to the layer and edits objects.
  function handleSave() {
    if (!map) return;

    // find the layer being edited
    let index = -1;
    if (initialLayer) {
      index = layers.findIndex(
        (layer) => layer.layerId === initialLayer.layerId,
      );
    }

    // find the parent layer
    const parentLayer: __esri.GroupLayer | null = selectedScenario
      ? (map.layers.find(
          (layer) =>
            layer.type === 'group' && layer.id === selectedScenario.layerId,
        ) as __esri.GroupLayer)
      : null;

    // update an existing scenario, otherwise add the new scenario
    if (index > -1 && initialLayer) {
      const layerId = layers[index].layerId;

      // update the title of the layer on the map
      const mapLayer = layers.find((layer) => layer.layerId === layerId);
      if (mapLayer?.sketchLayer) mapLayer.sketchLayer.title = layerName;
      if (mapLayer?.pointsLayer) mapLayer.pointsLayer.title = layerName;
      if (mapLayer?.hybridLayer) mapLayer.hybridLayer.title = layerName;

      // update the active sketchLayer
      setSketchLayer((sketchLayer) => {
        if (!sketchLayer) return sketchLayer;
        return {
          ...sketchLayer,
          name: layerName,
          label: layerName,
        };
      });

      // update the list of layers, including setting the parentLayer
      setLayers((layers) => {
        return [
          ...layers.slice(0, index),
          {
            ...initialLayer,
            name: layerName,
            label: layerName,
            parentLayer: parentLayer,
          },
          ...layers.slice(index + 1),
        ];
      });

      // update the layer in edits and the decisionunit attribute for each graphic
      const sketchLayerGraphics =
        initialLayer.sketchLayer as __esri.GraphicsLayer;
      const graphics = sketchLayerGraphics.graphics;
      graphics.forEach((graphic) => {
        graphic.attributes.DECISIONUNIT = layerName;
      });
      const editsCopy = updateLayerEdits({
        appType,
        edits,
        scenario: selectedScenario,
        layer: { ...initialLayer, name: layerName, label: layerName },
        type: 'update',
        changes: graphics,
      });
      setEdits(editsCopy);
    } else {
      // create the layer
      const tempLayer = createSampleLayer(isDecon(), layerName, parentLayer);

      // add the new layer to layers
      setLayers((layers) => {
        return [...layers, tempLayer];
      });

      // add the new layer to edits
      const editsCopy = updateLayerEdits({
        appType,
        edits,
        scenario: selectedScenario,
        layer: tempLayer,
        type: 'add',
      });

      // link to the selected plan
      if (selectedScenario) {
        const scenario = editsCopy.edits.find(
          (edit) => edit.layerId === selectedScenario.layerId,
        );
        if (scenario && scenario.type === 'scenario-decon') {
          scenario.linkedLayerIds.push(tempLayer.layerId);
        }
      }

      setEdits(editsCopy);

      // add the layer to the scenario's group layer, a scenario is selected
      const groupLayer = map.layers.find(
        (layer) => layer.id === selectedScenario?.layerId,
      );
      if (groupLayer && groupLayer.type === 'group') {
        const tempGroupLayer = groupLayer as __esri.GroupLayer;
        if (tempLayer.sketchLayer) tempGroupLayer.add(tempLayer.sketchLayer);
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
        if (!selectedScenario) return selectedScenario;

        const scenario = editsCopy.edits.find(
          (edit) =>
            edit.type === selectedScenario.type &&
            edit.layerId === selectedScenario.layerId,
        ) as ScenarioEditsType | ScenarioDeconEditsType;

        if (
          scenario.type === 'scenario' &&
          selectedScenario.type === 'scenario'
        ) {
          const newLayer = scenario.layers.find(
            (layer) => layer.layerId === tempLayer.layerId,
          );

          if (!newLayer) return selectedScenario;

          return {
            ...selectedScenario,
            layers: [...selectedScenario.layers, newLayer],
          };
        }
        if (
          scenario.type === 'scenario-decon' &&
          selectedScenario.type === 'scenario-decon'
        ) {
          const newLayer = scenario.linkedLayerIds.find(
            (layerId) => layerId === tempLayer.layerId,
          );

          if (!newLayer) return selectedScenario;

          return {
            ...selectedScenario,
            linkedLayerIds: [...selectedScenario.linkedLayerIds, newLayer],
          };
        }

        return selectedScenario;
      });
    }

    setSaveStatus('success');

    // call the onSave callback function
    if (onSave) onSave();
  }

  return (
    <form
      onSubmit={(ev) => {
        ev.preventDefault();
      }}
    >
      <p>
        Enter the name for a new empty{' '}
        {appType === 'decon' ? 'decon' : 'sample'} layer and click save or use
        the{' '}
        <button
          css={modLinkButtonStyles}
          onClick={(_ev) => {
            setGoTo('addData');
            setGoToOptions({
              from: 'file',
              layerType: 'Samples',
            });
          }}
        >
          Add Data tools
        </button>{' '}
        to import an existing {appType === 'decon' ? 'decon' : 'sample'} layer.
      </p>
      <label htmlFor="layer-name-input">
        {appType === 'decon' ? 'Decon' : ''} Layer Name
      </label>
      <input
        id="layer-name-input"
        css={inputStyles}
        maxLength={250}
        placeholder={`Enter ${appType === 'decon' ? 'decon' : 'sample'} Layer Name`}
        value={layerName}
        onChange={(ev) => {
          setLayerName(ev.target.value);
          setSaveStatus('changes');
        }}
      />

      <div css={saveButtonContainerStyles}>
        <button
          css={saveButtonStyles(saveStatus)}
          type="submit"
          disabled={saveStatus === 'none' || saveStatus === 'success'}
          onClick={handleSave}
        >
          {(saveStatus === 'none' || saveStatus === 'changes') && buttonText}
          {saveStatus === 'success' && (
            <Fragment>
              <i className="fas fa-check" /> Saved
            </Fragment>
          )}
        </button>
      </div>
    </form>
  );
}

// --- components (EditCustomSampleTypesTable) ---
type EditCustomSampleTypesTableProps = {
  appType: AppType;
  initialStatus?: SaveStatusType;
  onSave?: (saveResults?: SaveResultsType) => void;
};

const fullWidthSelectStyles = css`
  width: 100%;
  margin-right: 10px;
`;

export function EditCustomSampleTypesTable({
  appType,
  initialStatus = 'none',
  onSave,
}: EditCustomSampleTypesTableProps) {
  const {
    portal,
    signedIn, //
  } = useContext(AuthenticationContext);
  const {
    publishSampleTableMetaData,
    setPublishSampleTableMetaData,
    publishSamplesMode,
    sampleTableDescription,
    setSampleTableDescription,
    sampleTableName,
    setSampleTableName,
    selectedService,
    setSelectedService,
  } = useContext(PublishContext);

  const [
    saveStatus,
    setSaveStatus, //
  ] = useState<SaveResultsType>({
    status: initialStatus,
    name: sampleTableName,
  });

  const [queryInitialized, setQueryInitialized] = useState(false);
  const [featureServices, setFeatureServices] = useState<FeatureServices>({
    status: 'fetching',
    data: [],
  });
  useEffect(() => {
    if (queryInitialized) return;

    setQueryInitialized(true);

    const tmpPortal = portal ? portal : new Portal();
    tmpPortal
      .queryItems({
        categories: [
          appType === 'decon'
            ? 'contains-epa-tods-user-defined-decon-tech'
            : 'contains-epa-tots-user-defined-sample-types',
        ],
        sortField: 'title',
        sortOrder: 'asc',
      })
      .then((res: __esri.PortalQueryResult) => {
        const data = res.results.map((item) => {
          return {
            url: item.url,
            description: item.description,
            label: item.title,
            value: item.id,
          };
        });
        setFeatureServices({ status: 'success', data });
      })
      .catch((err) => {
        console.error(err);
        setFeatureServices({ status: 'failure', data: [] });
      });
  }, [appType, portal, queryInitialized]);

  useEffect(() => {
    setSaveStatus({ status: initialStatus });
  }, [initialStatus, publishSamplesMode]);

  const handleSave = () => {
    setPublishSampleTableMetaData({
      value: '',
      label: sampleTableName,
      description: sampleTableDescription,
      url: '',
    });
    const saveStatus: SaveResultsType = {
      status: 'success',
      name: sampleTableName,
    };
    setSaveStatus(saveStatus);
    if (onSave) onSave(saveStatus);
  };

  return (
    <Fragment>
      {publishSamplesMode === 'new' && (
        <Fragment>
          <label htmlFor="sample-table-name-input">
            Custom {appType === 'decon' ? 'Decon Technology' : 'Sample Type'}{' '}
            Table Name
          </label>
          <input
            id="sample-table-name-input"
            css={inputStyles}
            maxLength={90}
            placeholder={`Enter Custom ${appType === 'decon' ? 'Decon Technology' : 'Sample Type'} Table Name`}
            value={sampleTableName}
            onChange={(ev) => setSampleTableName(ev.target.value)}
          />
          <label htmlFor="scenario-description-input">
            Custom {appType === 'decon' ? 'Decon Technology' : 'Sample Type'}{' '}
            Table Description
          </label>
          <input
            id="scenario-description-input"
            css={inputStyles}
            maxLength={2048}
            placeholder={`Enter Custom ${appType === 'decon' ? 'Decon Technology' : 'Sample Type'} Table Description (2048 characters)`}
            value={sampleTableDescription}
            onChange={(ev) => setSampleTableDescription(ev.target.value)}
          />
        </Fragment>
      )}
      {publishSamplesMode === 'existing' && (
        <div>
          {featureServices.status === 'fetching' && <LoadingSpinner />}
          {featureServices.status === 'failure' && <p>Error!</p>}
          {featureServices.status === 'success' && (
            <Fragment>
              <label htmlFor="feature-service-select">
                Feature Service Select
              </label>
              <Select
                inputId="feature-service-select"
                css={fullWidthSelectStyles}
                styles={reactSelectStyles as any}
                value={selectedService}
                onChange={(ev) => setSelectedService(ev as SelectedService)}
                options={featureServices.data}
              />
            </Fragment>
          )}
        </div>
      )}

      {saveStatus.status === 'fetching' && <LoadingSpinner />}
      {saveStatus.status === 'failure' &&
        webServiceErrorMessage(saveStatus.error)}
      {saveStatus.status === 'name-not-available' &&
        scenarioNameTakenMessage(saveStatus.name)}
      {saveStatus.status === 'invalid-characters' &&
        scenarioNameInvalidMessage(saveStatus.name)}
      <div css={saveButtonContainerStyles}>
        <button
          css={saveButtonStyles(saveStatus.status)}
          onClick={() => {
            if (publishSamplesMode === 'existing' && selectedService) {
              setPublishSampleTableMetaData(selectedService);
            } else if (publishSamplesMode === 'new') {
              setSaveStatus({
                status: 'fetching',
                name: sampleTableName,
              });

              // if the user is signed in, go ahead and check if the
              // service (scenario) name is availble before continuing
              isServiceNameAvailable(portal, signedIn, sampleTableName)
                .then((res: any) => {
                  if (res.error) {
                    const saveStatus: SaveResultsType = {
                      status: 'failure',
                      name: sampleTableName,
                      error: {
                        error: createErrorObject(res),
                        message: res.error.message,
                      },
                    };
                    setSaveStatus(saveStatus);
                    if (onSave) onSave(saveStatus);
                    return;
                  }

                  if (!res.available) {
                    const saveStatus: SaveResultsType = {
                      status: res.problem ?? 'name-not-available',
                      name: sampleTableName,
                    };
                    setSaveStatus(saveStatus);
                    if (onSave) onSave(saveStatus);
                    return;
                  }

                  handleSave();
                })
                .catch((err: any) => {
                  console.error('isServiceNameAvailable error', err);
                  const saveStatus: SaveResultsType = {
                    status: 'failure',
                    name: sampleTableName,
                    error: {
                      error: createErrorObject(err),
                      message: err.message,
                    },
                  };
                  setSaveStatus(saveStatus);
                  if (onSave) onSave(saveStatus);

                  window.logErrorToGa(err);
                });
            }
          }}
          disabled={
            (publishSamplesMode === 'new' &&
              (!sampleTableName ||
                JSON.stringify(publishSampleTableMetaData) ===
                  JSON.stringify({
                    value: '',
                    label: sampleTableName,
                    description: sampleTableDescription,
                    url: '',
                  }))) ||
            (publishSamplesMode === 'existing' &&
              JSON.stringify(publishSampleTableMetaData) ===
                JSON.stringify(selectedService))
          }
        >
          {failedStatuses.includes(saveStatus.status) ? (
            <Fragment>
              <i className="fas fa-exclamation-triangle" /> Error
            </Fragment>
          ) : saveStatus.status === 'success' ? (
            <Fragment>
              <i className="fas fa-check" /> Saved
            </Fragment>
          ) : (
            'Save'
          )}
        </button>
      </div>
    </Fragment>
  );
}

// --- components (EditCustomSampleTypesTable) ---
type EditAoiCharacterizationProps = {
  aoiLayer: LayerAoiAnalysisEditsType;
  initialStatus?: SaveStatusType;
  onSave?: (saveResults?: SaveResultsType) => void;
};

export function EditAoiCharacterization({
  aoiLayer,
  initialStatus = 'none',
  onSave,
}: EditAoiCharacterizationProps) {
  const {
    portal,
    signedIn, //
  } = useContext(AuthenticationContext);
  const { setEdits, setLayers } = useContext(SketchContext);
  const { setManualConfigureOutput } = useContext(PublishContext);

  const [aoiCharName, setAoiCharName] = useState(aoiLayer.label);
  const [aoiCharDescription, setAoiCharDescription] = useState(
    aoiLayer.description,
  );

  const [
    saveStatus,
    setSaveStatus, //
  ] = useState<SaveResultsType>({
    status: initialStatus,
    name: aoiLayer.label,
  });

  useEffect(() => {
    setSaveStatus({
      status: initialStatus,
      name: aoiLayer.label,
    });
  }, [aoiLayer, initialStatus]);

  const handleSave = () => {
    // set edits
    setEdits((edits) => {
      const aoiLayerEdit = edits.edits.find(
        (edit) =>
          edit.layerId === aoiLayer.layerId &&
          edit.type === 'layer-aoi-analysis',
      ) as LayerAoiAnalysisEditsType | undefined;
      if (!aoiLayerEdit) return edits;

      aoiLayerEdit.name = aoiCharName;
      aoiLayerEdit.label = aoiCharName;
      aoiLayerEdit.description = aoiCharDescription;

      return {
        count: edits.count + 1,
        edits: edits.edits,
      };
    });

    // set layers
    setLayers((layers) => {
      const aoiLayerEdit = layers.find(
        (layer) => layer.layerId === aoiLayer.layerId,
      );
      if (!aoiLayerEdit) return layers;

      aoiLayerEdit.label = aoiCharName;
      aoiLayerEdit.name = aoiCharName;
      if (aoiLayerEdit.sketchLayer)
        aoiLayerEdit.sketchLayer.title = aoiCharName;

      return layers;
    });

    // set selected aoi chars
    setManualConfigureOutput((output) => {
      const aoiChar = output?.selectedAoiCharacterizations?.find(
        (char) => char.value === aoiLayer.layerId,
      );
      if (aoiChar) aoiChar.label = aoiCharName;
      return output;
    });

    const saveStatus: SaveResultsType = {
      status: 'success',
      name: aoiCharName,
    };
    setSaveStatus(saveStatus);
    if (onSave) onSave(saveStatus);
  };

  return (
    <Fragment>
      <label htmlFor="aoi-char-name-input">AOI Characterization Name</label>
      <input
        id="aoi-char-name-input"
        css={inputStyles}
        maxLength={90}
        placeholder="Enter AOI Characterization Name"
        value={aoiCharName}
        onChange={(ev) => setAoiCharName(ev.target.value)}
      />
      <label htmlFor="aoi-char-description-input">
        AOI Characterization Description
      </label>
      <input
        id="aoi-char-description-input"
        css={inputStyles}
        maxLength={2048}
        placeholder="Enter AOI Characterization Description (2048 characters)"
        value={aoiCharDescription}
        onChange={(ev) => setAoiCharDescription(ev.target.value)}
      />

      {saveStatus.status === 'fetching' && <LoadingSpinner />}
      {saveStatus.status === 'failure' &&
        webServiceErrorMessage(saveStatus.error)}
      {saveStatus.status === 'name-not-available' &&
        scenarioNameTakenMessage(saveStatus.name)}
      {saveStatus.status === 'invalid-characters' &&
        scenarioNameInvalidMessage(saveStatus.name)}
      <div css={saveButtonContainerStyles}>
        <button
          css={saveButtonStyles(saveStatus.status)}
          onClick={() => {
            setSaveStatus({
              status: 'fetching',
              name: aoiCharName,
            });

            // if the user is signed in, go ahead and check if the
            // service (scenario) name is availble before continuing
            isServiceNameAvailable(portal, signedIn, aoiCharName)
              .then((res: any) => {
                if (res.error) {
                  const saveStatus: SaveResultsType = {
                    status: 'failure',
                    name: aoiCharName,
                    error: {
                      error: createErrorObject(res),
                      message: res.error.message,
                    },
                  };
                  setSaveStatus(saveStatus);
                  if (onSave) onSave(saveStatus);
                  return;
                }

                if (!res.available) {
                  const saveStatus: SaveResultsType = {
                    status: res.problem ?? 'name-not-available',
                    name: aoiCharName,
                  };
                  setSaveStatus(saveStatus);
                  if (onSave) onSave(saveStatus);
                  return;
                }

                handleSave();
              })
              .catch((err: any) => {
                console.error('isServiceNameAvailable error', err);
                const saveStatus: SaveResultsType = {
                  status: 'failure',
                  name: aoiCharName,
                  error: {
                    error: createErrorObject(err),
                    message: err.message,
                  },
                };
                setSaveStatus(saveStatus);
                if (onSave) onSave(saveStatus);

                window.logErrorToGa(err);
              });
          }}
          disabled={
            !aoiCharName ||
            (aoiLayer.name === aoiCharName &&
              aoiLayer.description === aoiCharDescription)
          }
        >
          {failedStatuses.includes(saveStatus.status) ? (
            <Fragment>
              <i className="fas fa-exclamation-triangle" /> Error
            </Fragment>
          ) : saveStatus.status === 'success' ? (
            <Fragment>
              <i className="fas fa-check" /> Saved
            </Fragment>
          ) : (
            'Save'
          )}
        </button>
      </div>
    </Fragment>
  );
}

// --- components (EditCustomSampleTypesTable) ---
type EditStagingAreaProps = {
  aoiLayer: LayerEditsType;
  children?: ReactNode;
  disabled?: boolean;
  editVisible?: boolean;
  initialStatus?: SaveStatusType;
  onSave?: (saveResults?: SaveResultsType) => void;
};

export function EditStagingAreaCharacterization({
  aoiLayer,
  children,
  disabled = false,
  editVisible,
  initialStatus = 'none',
  onSave,
}: EditStagingAreaProps) {
  const {
    portal,
    signedIn, //
  } = useContext(AuthenticationContext);
  const { setEdits, setLayers } = useContext(SketchContext);
  const { setManualConfigureOutput } = useContext(PublishContext);

  const [aoiCharName, setAoiCharName] = useState('');
  const [aoiCharDescription, setAoiCharDescription] = useState('');

  const [
    saveStatus,
    setSaveStatus, //
  ] = useState<SaveResultsType>({
    status: initialStatus,
    name: '',
  });

  useEffect(() => {
    setSaveStatus({
      status: initialStatus,
      name: aoiLayer.name,
    });
  }, [aoiLayer, initialStatus]);

  const [lastAoiLayer, setLastAoiLayer] = useState<LayerEditsType | null>(null);
  useEffect(() => {
    if (aoiLayer.layerId === lastAoiLayer?.layerId) return;
    setAoiCharName(aoiLayer.name);
    setAoiCharDescription(aoiLayer.description ?? '');
    setLastAoiLayer(aoiLayer);
  }, [aoiLayer, lastAoiLayer]);

  useEffect(() => {
    setSaveStatus({
      status: initialStatus,
      name: aoiLayer.name,
    });
  }, [aoiCharName, aoiCharDescription, aoiLayer, initialStatus]);

  const handleSave = () => {
    // set edits
    setEdits((edits) => {
      const aoiLayerEdit = edits.edits.find(
        (edit) =>
          edit.layerId === aoiLayer.layerId &&
          edit.type === 'layer' &&
          edit.layerType === 'Staging Area Mask',
      ) as LayerEditsType | undefined;
      if (!aoiLayerEdit) return edits;

      aoiLayerEdit.name = aoiCharName;
      aoiLayerEdit.label = aoiCharName;
      aoiLayerEdit.description = aoiCharDescription;

      return {
        count: edits.count + 1,
        edits: edits.edits,
      };
    });

    // set layers
    setLayers((layers) => {
      const aoiLayerEdit = layers.find(
        (layer) => layer.layerId === aoiLayer.layerId,
      );
      if (!aoiLayerEdit) return layers;

      aoiLayerEdit.label = aoiCharName;
      aoiLayerEdit.name = aoiCharName;
      if (aoiLayerEdit.sketchLayer)
        aoiLayerEdit.sketchLayer.title = aoiCharName;

      return layers;
    });

    // set selected aoi chars
    setManualConfigureOutput((output) => {
      const aoiChar = output?.selectedStagingAreas?.find(
        (char) => char.value === aoiLayer.layerId,
      );
      if (aoiChar) aoiChar.label = aoiCharName;
      return output;
    });

    const saveStatus: SaveResultsType = {
      status: 'success',
      name: aoiCharName,
    };
    setSaveStatus(saveStatus);
    if (onSave) onSave(saveStatus);
  };

  return (
    <Fragment>
      {(editVisible === undefined || editVisible) && (
        <Fragment>
          <label htmlFor="staging-area-name-input">Staging Area Name</label>
          <input
            id="staging-area-name-input"
            css={inputStyles}
            maxLength={90}
            placeholder="Enter Staging Area Name"
            value={aoiCharName}
            onChange={(ev) => setAoiCharName(ev.target.value)}
          />
          <label htmlFor="staging-area-description-input">
            Staging Area Description
          </label>
          <input
            id="staging-area-description-input"
            css={inputStyles}
            maxLength={2048}
            placeholder="Enter Staging Area Description (2048 characters)"
            value={aoiCharDescription}
            onChange={(ev) => setAoiCharDescription(ev.target.value)}
          />
        </Fragment>
      )}

      {children}

      {saveStatus.status === 'fetching' && <LoadingSpinner />}
      {saveStatus.status === 'failure' &&
        webServiceErrorMessage(saveStatus.error)}
      {saveStatus.status === 'name-not-available' &&
        scenarioNameTakenMessage(saveStatus.name)}
      {saveStatus.status === 'invalid-characters' &&
        scenarioNameInvalidMessage(saveStatus.name)}
      <div css={saveButtonContainerStyles}>
        <button
          css={saveButtonStyles(
            saveStatus.status === 'success' ? 'none' : saveStatus.status,
          )}
          onClick={() => {
            setSaveStatus({
              status: 'fetching',
              name: aoiCharName,
            });

            // if the user is signed in, go ahead and check if the
            // service (scenario) name is availble before continuing
            isServiceNameAvailable(portal, signedIn, aoiCharName)
              .then((res: any) => {
                if (res.error) {
                  const saveStatus: SaveResultsType = {
                    status: 'failure',
                    name: aoiCharName,
                    error: {
                      error: createErrorObject(res),
                      message: res.error.message,
                    },
                  };
                  setSaveStatus(saveStatus);
                  if (onSave) onSave(saveStatus);
                  return;
                }

                if (!res.available) {
                  const saveStatus: SaveResultsType = {
                    status: res.problem ?? 'name-not-available',
                    name: aoiCharName,
                  };
                  setSaveStatus(saveStatus);
                  if (onSave) onSave(saveStatus);
                  return;
                }

                handleSave();
              })
              .catch((err: any) => {
                console.error('isServiceNameAvailable error', err);
                const saveStatus: SaveResultsType = {
                  status: 'failure',
                  name: aoiCharName,
                  error: {
                    error: createErrorObject(err),
                    message: err.message,
                  },
                };
                setSaveStatus(saveStatus);
                if (onSave) onSave(saveStatus);

                window.logErrorToGa(err);
              });
          }}
          disabled={
            disabled ||
            (Boolean(children) && !aoiCharName) ||
            (!Boolean(children) &&
              aoiLayer.name === aoiCharName &&
              aoiLayer.description === aoiCharDescription)
          }
        >
          {failedStatuses.includes(saveStatus.status) ? (
            <Fragment>
              <i className="fas fa-exclamation-triangle" /> Error
            </Fragment>
          ) : (
            'Save'
          )}
        </button>
      </div>
    </Fragment>
  );
}
