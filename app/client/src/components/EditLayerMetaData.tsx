/** @jsxImportSource @emotion/react */

import React from 'react';
import { css } from '@emotion/react';
// components
import LoadingSpinner from 'components/LoadingSpinner';
import Select from 'components/Select';
// contexts
import { useEsriModulesContext } from 'contexts/EsriModules';
import { AuthenticationContext } from 'contexts/Authentication';
import { NavigationContext } from 'contexts/Navigation';
import { PublishContext } from 'contexts/Publish';
import { SketchContext } from 'contexts/Sketch';
// utils
import { isServiceNameAvailable } from 'utils/arcGisRestUtils';
import {
  createLayerEditTemplate,
  createSampleLayer,
  updateLayerEdits,
} from 'utils/sketchUtils';
import { createErrorObject } from 'utils/utils';
// types
import { ErrorType } from 'types/Misc';
import { LayerType } from 'types/Layer';
// config
import {
  scenarioNameTakenMessage,
  webServiceErrorMessage,
} from 'config/errorMessages';
// styles
import { colors, linkButtonStyles } from 'styles';
import { LayerEditsType, ScenarioEditsType } from 'types/Edits';

export type SaveStatusType =
  | 'none'
  | 'changes'
  | 'fetching'
  | 'success'
  | 'failure'
  | 'fetch-failure'
  | 'name-not-available';

export type SaveResultsType = {
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
  if (status === 'failure') {
    backgroundColor = `background-color: ${colors.red()};`;
  }

  return css`
    margin: 5px 0;
    ${backgroundColor}
  `;
};

// --- components (EditScenario) ---
type Props = {
  initialScenario?: ScenarioEditsType | null;
  buttonText?: string;
  initialStatus?: SaveStatusType;
  addDefaultSampleLayer?: boolean;
  onSave?: (saveResults?: SaveResultsType) => void;
};

function EditScenario({
  initialScenario = null,
  buttonText = 'Save',
  initialStatus = 'none',
  addDefaultSampleLayer = false,
  onSave,
}: Props) {
  const {
    portal,
    signedIn, //
  } = React.useContext(AuthenticationContext);
  const { GraphicsLayer, GroupLayer } = useEsriModulesContext();
  const {
    edits,
    setEdits,
    map,
    setLayers,
    setSelectedScenario,
    setSketchLayer,
  } = React.useContext(SketchContext);

  // focus on the first input
  React.useEffect(() => {
    document.getElementById('scenario-name-input')?.focus();
  }, []);

  const [
    saveStatus,
    setSaveStatus, //
  ] = React.useState<SaveResultsType>({ status: initialStatus });

  const [scenarioName, setScenarioName] = React.useState(
    initialScenario ? initialScenario.scenarioName : '',
  );
  const [scenarioDescription, setScenarioDescription] = React.useState(
    initialScenario ? initialScenario.scenarioDescription : '',
  );

  // Updates the scenario metadata.
  function updateScenario() {
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

      const layers: LayerEditsType[] = [];
      let tempSketchLayer: LayerType | null = null;
      if (addDefaultSampleLayer) {
        // no sketchable layers were available, create one
        tempSketchLayer = createSampleLayer(
          GraphicsLayer,
          undefined,
          groupLayer,
        );
        layers.push(createLayerEditTemplate(tempSketchLayer, 'add'));
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
        layers,
        table: null,
      };

      // make a copy of the edits context variable
      setEdits((edits) => {
        return {
          count: edits.count + 1,
          edits: [...edits.edits, newScenario],
        };
      });

      // select the new scenario
      setSelectedScenario(newScenario);

      if (addDefaultSampleLayer && tempSketchLayer) {
        groupLayer.add(tempSketchLayer.sketchLayer);
        if (tempSketchLayer.pointsLayer) {
          groupLayer.add(tempSketchLayer.pointsLayer);
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

    const saveStatus: SaveResultsType = { status: 'success' };
    setSaveStatus(saveStatus);
    if (onSave) onSave(saveStatus);
  }

  // Handles saving of the layer's scenario name and description fields.
  // Also checks the uniqueness of the scenario name, if the user is signed in.
  function handleSave() {
    // if the user hasn't signed in go ahead and save the
    // scenario name and description
    if (!portal || !signedIn) {
      updateScenario();
      return;
    }

    setSaveStatus({ status: 'fetching' });

    // if the user is signed in, go ahead and check if the
    // service (scenario) name is availble before continuing
    isServiceNameAvailable(portal, scenarioName)
      .then((res: any) => {
        if (res.error) {
          const saveStatus: SaveResultsType = {
            status: 'failure',
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
          const saveStatus: SaveResultsType = { status: 'name-not-available' };
          setSaveStatus(saveStatus);
          if (onSave) onSave(saveStatus);
          return;
        }

        updateScenario();
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
        maxLength={250}
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
        scenarioNameTakenMessage(scenarioName ? scenarioName : '')}
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
            {(saveStatus.status === 'none' ||
              saveStatus.status === 'changes' ||
              saveStatus.status === 'fetching') &&
              buttonText}
            {saveStatus.status === 'success' && (
              <React.Fragment>
                <i className="fas fa-check" /> Saved
              </React.Fragment>
            )}
            {(saveStatus.status === 'failure' ||
              saveStatus.status === 'fetch-failure' ||
              saveStatus.status === 'name-not-available') && (
              <React.Fragment>
                <i className="fas fa-exclamation-triangle" /> Error
              </React.Fragment>
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
  initialLayer?: LayerType | null;
  buttonText?: string;
  initialStatus?: SaveStatusType;
  onSave?: () => void;
};

function EditLayer({
  initialLayer = null,
  buttonText = 'Save',
  initialStatus = 'none',
  onSave,
}: EditLayerProps) {
  const { GraphicsLayer } = useEsriModulesContext();
  const { setGoTo, setGoToOptions } = React.useContext(NavigationContext);
  const {
    edits,
    setEdits,
    layers,
    setLayers,
    selectedScenario,
    setSelectedScenario,
    setSketchLayer,
    map,
  } = React.useContext(SketchContext);

  const [
    saveStatus,
    setSaveStatus, //
  ] = React.useState<SaveStatusType>(initialStatus);

  const [layerName, setLayerName] = React.useState(
    initialLayer ? initialLayer.label : '',
  );

  // focus on the first input
  React.useEffect(() => {
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
    let parentLayer: __esri.GroupLayer | null = selectedScenario
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
      if (mapLayer) mapLayer.sketchLayer.title = layerName;
      if (mapLayer?.pointsLayer) mapLayer.pointsLayer.title = layerName;

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
      const sketchLayerGraphics = initialLayer.sketchLayer as __esri.GraphicsLayer;
      const graphics = sketchLayerGraphics.graphics;
      graphics.forEach((graphic) => {
        graphic.attributes.DECISIONUNIT = layerName;
      });
      const editsCopy = updateLayerEdits({
        edits,
        scenario: selectedScenario,
        layer: { ...initialLayer, name: layerName, label: layerName },
        type: 'update',
        changes: graphics,
      });
      setEdits(editsCopy);
    } else {
      // create the layer
      const tempLayer = createSampleLayer(
        GraphicsLayer,
        layerName,
        parentLayer,
      );

      // add the new layer to layers
      setLayers((layers) => {
        return [...layers, tempLayer];
      });

      // add the new layer to edits
      const editsCopy = updateLayerEdits({
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
        const tempGroupLayer = groupLayer as __esri.GroupLayer;
        tempGroupLayer.add(tempLayer.sketchLayer);
        if (tempLayer.pointsLayer) {
          tempGroupLayer.add(tempLayer.pointsLayer);
        }
      }

      // make the new layer the active sketch layer
      setSketchLayer(tempLayer);

      setSelectedScenario((selectedScenario) => {
        if (!selectedScenario) return selectedScenario;

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
        Enter the name for a new empty sample layer and click save or use the{' '}
        <button
          css={modLinkButtonStyles}
          onClick={(ev) => {
            setGoTo('addData');
            setGoToOptions({
              from: 'file',
              layerType: 'Samples',
            });
          }}
        >
          Add Data tools
        </button>{' '}
        to import an existing sample layer.
      </p>
      <label htmlFor="layer-name-input">Layer Name</label>
      <input
        id="layer-name-input"
        css={inputStyles}
        maxLength={250}
        placeholder="Enter Layer Name"
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
            <React.Fragment>
              <i className="fas fa-check" /> Saved
            </React.Fragment>
          )}
        </button>
      </div>
    </form>
  );
}

// --- components (EditCustomSampleTypesTable) ---
type EditCustomSampleTypesTableProps = {
  initialStatus?: SaveStatusType;
  onSave?: (saveResults?: SaveResultsType) => void;
};

const fullWidthSelectStyles = css`
  width: 100%;
  margin-right: 10px;
`;

function EditCustomSampleTypesTable({
  initialStatus = 'none',
  onSave,
}: EditCustomSampleTypesTableProps) {
  const { Portal } = useEsriModulesContext();
  const {
    portal,
    signedIn, //
  } = React.useContext(AuthenticationContext);
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
  } = React.useContext(PublishContext);

  const [
    saveStatus,
    setSaveStatus, //
  ] = React.useState<SaveResultsType>({ status: initialStatus });

  const [queryInitialized, setQueryInitialized] = React.useState(false);
  const [featureServices, setFeatureServices] = React.useState<FeatureServices>(
    { status: 'fetching', data: [] },
  );
  React.useEffect(() => {
    if (queryInitialized) return;

    setQueryInitialized(true);

    const tmpPortal = portal ? portal : new Portal();
    tmpPortal
      .queryItems({
        categories: ['contains-epa-tots-user-defined-sample-types'],
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
  }, [Portal, portal, queryInitialized]);

  const handleSave = () => {
    setPublishSampleTableMetaData({
      value: '',
      label: sampleTableName,
      description: sampleTableDescription,
      url: '',
    });
    const saveStatus: SaveResultsType = { status: 'success' };
    setSaveStatus(saveStatus);
    if (onSave) onSave(saveStatus);
  };

  return (
    <React.Fragment>
      {publishSamplesMode === 'new' && (
        <React.Fragment>
          <label htmlFor="sample-table-name-input">
            Custom Sample Type Table Name
          </label>
          <input
            id="sample-table-name-input"
            css={inputStyles}
            maxLength={250}
            placeholder="Enter Custom Sample Type Table Name"
            value={sampleTableName}
            onChange={(ev) => setSampleTableName(ev.target.value)}
          />
          <label htmlFor="scenario-description-input">
            Custom Sample Type Table Description
          </label>
          <input
            id="scenario-description-input"
            css={inputStyles}
            maxLength={2048}
            placeholder="Enter Custom Sample Type Table Description (2048 characters)"
            value={sampleTableDescription}
            onChange={(ev) => setSampleTableDescription(ev.target.value)}
          />
        </React.Fragment>
      )}
      {publishSamplesMode === 'existing' && (
        <div>
          {featureServices.status === 'fetching' && <LoadingSpinner />}
          {featureServices.status === 'failure' && <p>Error!</p>}
          {featureServices.status === 'success' && (
            <React.Fragment>
              <label htmlFor="feature-service-select">
                Feature Service Select
              </label>
              <Select
                inputId="feature-service-select"
                css={fullWidthSelectStyles}
                value={selectedService}
                onChange={(ev) => setSelectedService(ev as SelectedService)}
                options={featureServices.data}
              />
            </React.Fragment>
          )}
        </div>
      )}

      {saveStatus.status === 'fetching' && <LoadingSpinner />}
      {saveStatus.status === 'failure' &&
        webServiceErrorMessage(saveStatus.error)}
      {saveStatus.status === 'name-not-available' &&
        scenarioNameTakenMessage(sampleTableName ? sampleTableName : '')}
      <div css={saveButtonContainerStyles}>
        <button
          css={saveButtonStyles(saveStatus.status)}
          onClick={() => {
            if (publishSamplesMode === 'existing' && selectedService) {
              setPublishSampleTableMetaData(selectedService);
            } else if (publishSamplesMode === 'new') {
              if (!portal || !signedIn) {
                handleSave();
                return;
              }

              setSaveStatus({ status: 'fetching' });

              // if the user is signed in, go ahead and check if the
              // service (scenario) name is availble before continuing
              isServiceNameAvailable(portal, sampleTableName)
                .then((res: any) => {
                  if (res.error) {
                    const saveStatus: SaveResultsType = {
                      status: 'failure',
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
                      status: 'name-not-available',
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
              JSON.stringify(publishSampleTableMetaData) ===
                JSON.stringify({
                  value: '',
                  label: sampleTableName,
                  description: sampleTableDescription,
                  url: '',
                })) ||
            (publishSamplesMode === 'existing' &&
              JSON.stringify(publishSampleTableMetaData) ===
                JSON.stringify(selectedService))
          }
        >
          {(saveStatus.status === 'none' ||
            saveStatus.status === 'changes' ||
            saveStatus.status === 'fetching') &&
            'Save'}
          {saveStatus.status === 'success' && (
            <React.Fragment>
              <i className="fas fa-check" /> Saved
            </React.Fragment>
          )}
          {(saveStatus.status === 'failure' ||
            saveStatus.status === 'fetch-failure' ||
            saveStatus.status === 'name-not-available') && (
            <React.Fragment>
              <i className="fas fa-exclamation-triangle" /> Error
            </React.Fragment>
          )}
        </button>
      </div>
    </React.Fragment>
  );
}

export { EditLayer, EditCustomSampleTypesTable, EditScenario };
