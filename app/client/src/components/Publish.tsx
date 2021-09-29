/** @jsxImportSource @emotion/react */

import React from 'react';
import { css } from '@emotion/react';
// components
import { EditScenario } from 'components/EditLayerMetaData';
import LoadingSpinner from 'components/LoadingSpinner';
import MessageBox from 'components/MessageBox';
import Select from 'components/Select';
import ShowLessMore from 'components/ShowLessMore';
// contexts
import { useEsriModulesContext } from 'contexts/EsriModules';
import { AuthenticationContext } from 'contexts/Authentication';
import { useSampleTypesContext } from 'contexts/LookupFiles';
import { NavigationContext } from 'contexts/Navigation';
import { PublishContext } from 'contexts/Publish';
import { SketchContext } from 'contexts/Sketch';
// utils
import {
  getAllFeatures,
  getFeatureTables,
  isServiceNameAvailable,
  publish,
  publishTable,
} from 'utils/arcGisRestUtils';
import { findLayerInEdits } from 'utils/sketchUtils';
import { createErrorObject } from 'utils/utils';
// types
import {
  DeleteFeatureType,
  FeatureEditsType,
  LayerEditsType,
  ScenarioEditsType,
} from 'types/Edits';
import { ErrorType } from 'types/Misc';
import { SampleTypeOptions } from 'types/Publish';
// config
import {
  noSamplesPublishMessage,
  featureServiceTakenMessage,
  notLoggedInMessage,
  publishSuccessMessage,
  pulblishSamplesSuccessMessage,
  webServiceErrorMessage,
} from 'config/errorMessages';
import { LayerType } from 'types/Layer';

type FeatureServices = {
  status: 'fetching' | 'failure' | 'success';
  data: SelectedService[];
};

type PublishResults = {
  [key: string]: {
    adds: FeatureEditsType[];
    updates: FeatureEditsType[];
    deletes: DeleteFeatureType[];
    published: FeatureEditsType[];
  };
};

type PublishType = {
  status:
    | 'none'
    | 'fetching'
    | 'success'
    | 'failure'
    | 'fetch-failure'
    | 'name-not-available';
  summary: {
    success: string;
    failed: string;
  };
  error?: ErrorType;
  rawData: any;
};

type SelectedService = {
  url: string;
  description: string;
  label: string;
  value: string;
};

// --- styles (Publish) ---
const panelContainer = css`
  padding: 20px;
`;

const publishButtonContainerStyles = css`
  display: flex;
  justify-content: flex-end;
`;

const publishButtonStyles = css`
  margin-top: 10px;

  &:disabled {
    cursor: default;
    opacity: 0.65;
  }
`;

const sectionContainer = css`
  margin-bottom: 10px;
`;

const layerInfo = css`
  padding-bottom: 0.5em;
`;

const radioLabelStyles = css`
  padding-left: 0.375rem;
`;

const fullWidthSelectStyles = css`
  width: 100%;
  margin-right: 10px;
`;

const multiSelectStyles = css`
  ${fullWidthSelectStyles}
  margin-bottom: 10px;
`;

const inputStyles = css`
  width: 100%;
  height: 36px;
  margin: 0 0 10px 0;
  padding-left: 8px;
  border: 1px solid #ccc;
  border-radius: 4px;
`;

// --- components (Publish) ---
function Publish() {
  const {
    Graphic,
    GraphicsLayer,
    IdentityManager,
    Portal,
  } = useEsriModulesContext();
  const {
    oAuthInfo,
    portal,
    signedIn, //
  } = React.useContext(AuthenticationContext);
  const { goToOptions, setGoToOptions } = React.useContext(NavigationContext);
  const {
    publishSamplesMode,
    setPublishSamplesMode,
    publishSampleTableMetaData,
    setPublishSampleTableMetaData,
    sampleTableDescription,
    setSampleTableDescription,
    sampleTableName,
    setSampleTableName,
    sampleTypeSelections,
    setSampleTypeSelections,
    selectedService,
    setSelectedService,
  } = React.useContext(PublishContext);
  const {
    edits,
    setEdits,
    layers,
    setLayers,
    sampleAttributes,
    selectedScenario,
    setSelectedScenario,
    sketchLayer,
    userDefinedAttributes,
    setUserDefinedAttributes,
    setUserDefinedOptions,
  } = React.useContext(SketchContext);

  const sampleTypeContext = useSampleTypesContext();

  ///////////////////////////////////////////////////////////////////////////////////////
  //////////////////////////// START - Publish Layers ///////////////////////////////////
  ///////////////////////////////////////////////////////////////////////////////////////

  // Checks browser storage to determine if the user clicked publish and logged in.
  const [publishButtonClicked, setPublishButtonClicked] = React.useState(false);
  const [continueInitialized, setContinueInitialized] = React.useState(false);
  React.useEffect(() => {
    if (continueInitialized) return;

    // continue publish is not true, exit early
    if (!goToOptions?.continuePublish) {
      setContinueInitialized(true);
      return;
    }

    // wait until TOTS is signed in before trying to continue the publish
    if (!portal || !signedIn) return;

    // continue with publishing
    setPublishButtonClicked(true);
    setGoToOptions({ continuePublish: false });
    setContinueInitialized(true);
  }, [portal, signedIn, goToOptions, setGoToOptions, continueInitialized]);

  // Sign in if necessary
  React.useEffect(() => {
    if (!oAuthInfo || !publishButtonClicked) return;

    // have the user login if necessary
    if (!portal || !signedIn) {
      setGoToOptions({ continuePublish: true });
      IdentityManager.getCredential(`${oAuthInfo.portalUrl}/sharing`);
    }
  }, [
    IdentityManager,
    setGoToOptions,
    portal,
    signedIn,
    oAuthInfo,
    publishButtonClicked,
  ]);

  // Check if the scenario name is available
  const [hasNameBeenChecked, setHasNameBeenChecked] = React.useState(false);
  React.useEffect(() => {
    if (
      !portal ||
      !selectedScenario ||
      !publishButtonClicked ||
      hasNameBeenChecked
    ) {
      return;
    }

    setPublishResponse({
      status: 'fetching',
      summary: { success: '', failed: '' },
      rawData: null,
    });

    if (selectedScenario.status === 'edited') {
      setHasNameBeenChecked(true);
      return;
    }

    // check if the service (scenario) name is availble before continuing
    isServiceNameAvailable(portal, selectedScenario.scenarioName)
      .then((res: any) => {
        if (res.error) {
          setPublishButtonClicked(false);
          setPublishResponse({
            status: 'fetch-failure',
            summary: { success: '', failed: '' },
            error: {
              error: createErrorObject(res),
              message: res.error.message,
            },
            rawData: null,
          });
          return;
        }

        if (!res.available) {
          setPublishButtonClicked(false);
          setPublishResponse({
            status: 'name-not-available',
            summary: { success: '', failed: '' },
            rawData: null,
          });
          return;
        }

        setHasNameBeenChecked(true);
      })
      .catch((err) => {
        console.error('isServiceNameAvailable error', err);
        setPublishResponse({
          status: 'fetch-failure',
          summary: { success: '', failed: '' },
          error: {
            error: createErrorObject(err),
            message: err.message,
          },
          rawData: err,
        });

        window.logErrorToGa(err);
      });
  }, [
    portal,
    selectedScenario,
    sketchLayer,
    publishButtonClicked,
    hasNameBeenChecked,
    layers,
  ]);

  // Run the publish
  const [publishResponse, setPublishResponse] = React.useState<PublishType>({
    status: 'none',
    summary: { success: '', failed: '' },
    rawData: null,
  });
  React.useEffect(() => {
    if (!oAuthInfo || !portal || !signedIn) return;
    if (
      !layers ||
      layers.length === 0 ||
      !selectedScenario ||
      !publishButtonClicked ||
      !hasNameBeenChecked
    ) {
      return;
    }

    setPublishButtonClicked(false);

    setPublishResponse({
      status: 'fetching',
      summary: { success: '', failed: '' },
      rawData: null,
    });

    const { scenarioIndex, editsScenario } = findLayerInEdits(
      edits.edits,
      selectedScenario.layerId,
    );

    // exit early if the scenario was not found
    if (
      scenarioIndex === -1 ||
      !editsScenario ||
      editsScenario.layers.length === 0
    ) {
      setPublishResponse({
        status: 'fetch-failure',
        summary: { success: '', failed: '' },
        error: { error: null, message: 'No data to publish.' },
        rawData: null,
      });
      return;
    }

    const originalLayers = layers.filter(
      (layer) =>
        editsScenario.layers.findIndex(
          (childLayer) => childLayer.layerId === layer.layerId,
        ) !== -1,
    );

    // make the layer publish layer
    const graphicsLayer = new GraphicsLayer({
      title: selectedScenario.scenarioName,
      visible: false,
      listMode: 'hide',
    });
    const pointsLayer = new GraphicsLayer({
      title: selectedScenario.scenarioName + '-points',
      visible: false,
      listMode: 'hide',
    });

    let publishLayer: LayerType | null = null;
    originalLayers.forEach((layer, index) => {
      if (index === 0) {
        publishLayer = {
          ...layer,
          label: selectedScenario.scenarioName,
          layerId: selectedScenario.layerId,
          layerType: 'Samples',
          name: selectedScenario.scenarioName,
          sketchLayer: graphicsLayer,
          pointsLayer,
          value: selectedScenario.scenarioName,
        };
      }

      if (
        !publishLayer ||
        publishLayer.sketchLayer.type !== 'graphics' ||
        layer.sketchLayer.type !== 'graphics'
      ) {
        return;
      }

      const clonedGraphics = layer.sketchLayer.graphics.clone();
      publishLayer.sketchLayer.addMany(clonedGraphics.toArray());

      if (layer.pointsLayer && publishLayer.pointsLayer) {
        const clonedPoints = layer.pointsLayer.graphics.clone();
        publishLayer.pointsLayer.addMany(clonedPoints.toArray());
      }
    });
    const publishLayers: LayerType[] = publishLayer ? [publishLayer] : [];

    // build the layerEdits
    let layerEdits: LayerEditsType = {
      type: 'layer',
      id: editsScenario.id,
      pointsId: -1,
      uuid: '', // no need for a uuid since this is combining layers into one
      layerId: editsScenario.layerId,
      portalId: editsScenario.portalId,
      name: editsScenario.name,
      label: editsScenario.label,
      layerType: editsScenario.layerType,
      addedFrom: editsScenario.addedFrom,
      hasContaminationRan: editsScenario.hasContaminationRan,
      status: editsScenario.status,
      editType: editsScenario.editType,
      visible: editsScenario.visible,
      listMode: editsScenario.listMode,
      sort: 0, // no need for a uuid since this is combining layers into one
      adds: [],
      updates: [],
      deletes: [],
      published: [],
    };

    // add graphics to the layer to publish while also setting
    // the DECISIONUNIT, DECISIONUNITUUID and DECISIONUNITSORT attributes
    editsScenario.layers.forEach((layer) => {
      layerEdits.published = layerEdits.published.concat(layer.published);

      layer.adds.forEach((item) => {
        layerEdits.adds.push({
          ...item,
          attributes: {
            ...item.attributes,
            DECISIONUNITUUID: layer.uuid,
            DECISIONUNIT: layer.label,
            DECISIONUNITSORT: layer.sort,
          },
        });
      });
      layer.updates.forEach((item) => {
        layerEdits.updates.push({
          ...item,
          attributes: {
            ...item.attributes,
            DECISIONUNITUUID: layer.uuid,
            DECISIONUNIT: layer.label,
            DECISIONUNITSORT: layer.sort,
          },
        });
      });
      layer.deletes.forEach((item) => {
        layerEdits.deletes.push({
          ...item,
          DECISIONUNITUUID: layer.uuid,
        });
      });
    });

    publish({
      portal,
      layers: publishLayers,
      edits: [layerEdits],
      serviceMetaData: {
        value: '',
        label: editsScenario.scenarioName,
        description: editsScenario.scenarioDescription,
        url: '',
      },
    })
      .then((res: any) => {
        const portalId = res.portalId;

        // get totals
        const totals = {
          added: 0,
          updated: 0,
          deleted: 0,
          failed: 0,
        };
        const changes: PublishResults = {};

        res.edits.forEach((layerRes: any, index: number) => {
          // odd layers are points layers so ignore those
          const isOdd = index % 2 === 1;
          if (isOdd) return;

          // need to loop through each array and check the success flag
          if (layerRes.addResults) {
            layerRes.addResults.forEach((item: any, index: number) => {
              item.success ? (totals.added += 1) : (totals.failed += 1);

              // update the edits arrays
              const origItem = layerEdits.adds[index];
              const decisionUUID = origItem.attributes.DECISIONUNITUUID;
              if (item.success) {
                origItem.attributes.OBJECTID = item.objectId;
                origItem.attributes.GLOBALID = item.globalId;

                // update the published for this layer
                if (changes.hasOwnProperty(decisionUUID)) {
                  changes[decisionUUID].published.push(origItem);
                } else {
                  changes[decisionUUID] = {
                    adds: [],
                    updates: [],
                    deletes: [],
                    published: [origItem],
                  };
                }

                // find the tots layer
                const mapLayer = layers.find(
                  (layer) => layer.uuid === decisionUUID,
                );

                // update the graphic on the map
                if (mapLayer && mapLayer.sketchLayer.type === 'graphics') {
                  const graphic = mapLayer.sketchLayer.graphics.find(
                    (graphic) =>
                      graphic.attributes.PERMANENT_IDENTIFIER ===
                      origItem.attributes.PERMANENT_IDENTIFIER,
                  );

                  if (graphic) {
                    graphic.attributes.OBJECTID = item.objectId;
                    graphic.attributes.GLOBALID = item.globalId;
                  }
                }
              } else {
                // update the adds for this layer
                if (changes.hasOwnProperty(decisionUUID)) {
                  changes[decisionUUID].adds.push(origItem);
                } else {
                  changes[decisionUUID] = {
                    adds: [origItem],
                    updates: [],
                    deletes: [],
                    published: [],
                  };
                }
              }
            });
          }
          if (layerRes.updateResults) {
            layerRes.updateResults.forEach((item: any, index: number) => {
              item.success ? (totals.updated += 1) : (totals.failed += 1);

              // update the edits arrays
              const origItem = layerEdits.updates[index];
              const decisionUUID = origItem.attributes.DECISIONUNITUUID;
              if (item.success) {
                origItem.attributes.OBJECTID = item.objectId;
                origItem.attributes.GLOBALID = item.globalId;

                // get the publish items for this layer
                let layerNewPublished = changes[decisionUUID].published;

                // find the item in published
                const index = layerNewPublished.findIndex(
                  (pubItem) =>
                    pubItem.attributes.PERMANENT_IDENTIFIER ===
                    origItem.attributes.PERMANENT_IDENTIFIER,
                );

                // update the item in newPublished
                if (index > -1) {
                  changes[decisionUUID].published = [
                    ...layerNewPublished.slice(0, index),
                    origItem,
                    ...layerNewPublished.slice(index + 1),
                  ];
                }

                // find the tots layer
                const mapLayer = layers.find(
                  (layer) => layer.uuid === decisionUUID,
                );

                // update the graphic on the map
                if (mapLayer && mapLayer.sketchLayer.type === 'graphics') {
                  const graphic = mapLayer.sketchLayer.graphics.find(
                    (graphic) =>
                      graphic.attributes.PERMANENT_IDENTIFIER ===
                      origItem.attributes.PERMANENT_IDENTIFIER,
                  );

                  if (graphic) {
                    graphic.attributes.OBJECTID = item.objectId;
                    graphic.attributes.GLOBALID = item.globalId;
                  }
                }
              } else {
                // update the updates for this layer
                if (changes.hasOwnProperty(decisionUUID)) {
                  changes[decisionUUID].updates.push(origItem);
                } else {
                  changes[decisionUUID] = {
                    adds: [],
                    updates: [origItem],
                    deletes: [],
                    published: [],
                  };
                }
              }
            });
          }
          if (layerRes.deleteResults) {
            layerRes.deleteResults.forEach((item: any, index: number) => {
              item.success ? (totals.deleted += 1) : (totals.failed += 1);

              // update the edits delete array
              const origItem = layerEdits.deletes[index];
              const decisionUUID = origItem.DECISIONUNITUUID;
              if (item.success) {
                // get the publish items for this layer
                let layerNewPublished = changes[decisionUUID].published;

                // find the item in published
                const pubIndex = layerNewPublished.findIndex(
                  (pubItem) =>
                    pubItem.attributes.PERMANENT_IDENTIFIER ===
                    origItem.PERMANENT_IDENTIFIER,
                );

                // update the item in newPublished
                if (pubIndex > -1) {
                  changes[decisionUUID].published = [
                    ...layerNewPublished.slice(0, pubIndex),
                    ...layerNewPublished.slice(pubIndex + 1),
                  ];
                }
              } else {
                // update the updates for this layer
                if (changes.hasOwnProperty(decisionUUID)) {
                  changes[decisionUUID].deletes.push(origItem);
                } else {
                  changes[decisionUUID] = {
                    adds: [],
                    updates: [],
                    deletes: [origItem],
                    published: [],
                  };
                }
              }
            });
          }
        });

        // create the message string for each type of change (add, update and delete)
        const successParts = [];
        if (totals.added) {
          successParts.push(`${totals.added} item(s) added`);
        }
        if (totals.updated) {
          successParts.push(`${totals.updated} item(s) updated`);
        }
        if (totals.deleted) {
          successParts.push(`${totals.deleted} item(s) deleted`);
        }

        // combine the messages
        let success = '';
        if (successParts.length === 1) {
          success = successParts[0];
        }
        if (successParts.length > 1) {
          success =
            successParts.slice(0, -1).join(', ') +
            ' and ' +
            successParts.slice(-1);
        }

        // create the failed status message
        const failed = totals.failed
          ? `${totals.failed} item(s) failed to publish. Check the console log for details.`
          : '';
        if (failed) console.error('Some items failed to publish: ', res);

        setPublishResponse({
          status: 'success',
          summary: { success, failed },
          rawData: res,
        });

        // make a copy of the edits context variable
        // update the edits state
        setEdits((edits) => {
          const editsScenario = edits.edits[scenarioIndex] as ScenarioEditsType;
          editsScenario.status = 'published';
          editsScenario.portalId = portalId;

          editsScenario.layers.forEach((editedLayer) => {
            // update the ids
            if (res.idMapping.hasOwnProperty(editedLayer.uuid)) {
              editedLayer.portalId = portalId;
              editedLayer.id = res.idMapping[editedLayer.uuid].id;
              editedLayer.pointsId = res.idMapping[editedLayer.uuid].pointsId;
              editsScenario.id = editedLayer.id;
              editsScenario.pointsId = editedLayer.pointsId;
            }

            const oldPublished = editedLayer.published.filter((x) => {
              const idx = editedLayer.deletes.findIndex(
                (y) =>
                  y.PERMANENT_IDENTIFIER === x.attributes.PERMANENT_IDENTIFIER,
              );
              return idx === -1;
            });

            const edits = changes[editedLayer.uuid];
            if (edits) {
              editedLayer.adds = edits.adds;
              editedLayer.updates = edits.updates;
              editedLayer.published = [...oldPublished, ...edits.published];
              editedLayer.deletes = edits.deletes;
            }
          });

          return {
            count: edits.count + 1,
            edits: [
              ...edits.edits.slice(0, scenarioIndex),
              editsScenario,
              ...edits.edits.slice(scenarioIndex + 1),
            ],
          };
        });

        // updated the edited layer
        setLayers((layers) =>
          layers.map((layer) => {
            if (!changes.hasOwnProperty(layer.uuid)) return layer;

            const updatedLayer: LayerType = {
              ...layer,
              status: 'published',
              portalId,
            };

            // update the ids
            if (res.idMapping.hasOwnProperty(layer.uuid)) {
              updatedLayer.id = res.idMapping[layer.uuid].id;
              updatedLayer.pointsId = res.idMapping[layer.uuid].pointsId;
            }

            return updatedLayer;
          }),
        );

        setSelectedScenario((selectedScenario) => {
          if(!selectedScenario) return selectedScenario;

          selectedScenario.status = 'published';
          selectedScenario.portalId = portalId;
          return selectedScenario
        });
      })
      .catch((err) => {
        console.error('isServiceNameAvailable error', err);
        setPublishResponse({
          status: 'fetch-failure',
          summary: { success: '', failed: '' },
          error: {
            error: createErrorObject(err),
            message: err.message,
          },
          rawData: err,
        });

        window.logErrorToGa(err);
      });
  }, [
    GraphicsLayer,
    IdentityManager,
    edits,
    setEdits,
    setLayers,
    portal,
    oAuthInfo,
    setGoToOptions,
    signedIn,
    layers,
    publishButtonClicked,
    hasNameBeenChecked,
    selectedScenario,
    setSelectedScenario,
  ]);

  ///////////////////////////////////////////////////////////////////////////////////////
  //////////////////////////// END - Publish Layers /////////////////////////////////////
  ///////////////////////////////////////////////////////////////////////////////////////

  ///////////////////////////////////////////////////////////////////////////////////////
  //////////////////////////// START - Publish Sample Types /////////////////////////////
  ///////////////////////////////////////////////////////////////////////////////////////

  // Checks browser storage to determine if the user clicked publish and logged in.
  const [
    publishSamplesButtonClicked,
    setPublishSamplesButtonClicked,
  ] = React.useState(false);
  const [
    continueSamplesInitialized,
    setContinueSamplesInitialized,
  ] = React.useState(false);
  React.useEffect(() => {
    if (continueSamplesInitialized) return;

    // continue publish is not true, exit early
    if (!goToOptions?.continueSamplesPublish) {
      setContinueSamplesInitialized(true);
      return;
    }

    // wait until TOTS is signed in before trying to continue the publish
    if (!portal || !signedIn) return;

    // continue with publishing
    setPublishSamplesButtonClicked(true);
    setGoToOptions({ continueSamplesPublish: false });
    setContinueSamplesInitialized(true);
  }, [
    portal,
    signedIn,
    goToOptions,
    setGoToOptions,
    continueSamplesInitialized,
  ]);

  // Sign in if necessary
  React.useEffect(() => {
    if (!oAuthInfo || !publishSamplesButtonClicked) return;

    // have the user login if necessary
    if (!portal || !signedIn) {
      setGoToOptions({ continueSamplesPublish: true });
      IdentityManager.getCredential(`${oAuthInfo.portalUrl}/sharing`);
    }
  }, [
    IdentityManager,
    setGoToOptions,
    portal,
    signedIn,
    oAuthInfo,
    publishSamplesButtonClicked,
  ]);

  // Check if the feature service name is available
  const [
    hasSamplesNameBeenChecked,
    setHasSamplesNameBeenChecked,
  ] = React.useState(false);
  React.useEffect(() => {
    if (
      !portal ||
      !publishSamplesButtonClicked ||
      !publishSampleTableMetaData ||
      hasSamplesNameBeenChecked
    ) {
      return;
    }

    setPublishSamplesResponse({
      status: 'fetching',
      summary: { success: '', failed: '' },
      rawData: null,
    });

    if (publishSamplesMode === 'existing' && publishSampleTableMetaData.value) {
      setHasSamplesNameBeenChecked(true);
      return;
    }

    // check if the service (scenario) name is availble before continuing
    isServiceNameAvailable(portal, publishSampleTableMetaData.label)
      .then((res: any) => {
        if (!res.available) {
          setPublishSamplesButtonClicked(false);
          setPublishSamplesResponse({
            status: 'name-not-available',
            summary: { success: '', failed: '' },
            rawData: null,
          });
          return;
        }

        setHasSamplesNameBeenChecked(true);
      })
      .catch((err) => {
        console.error('isServiceNameAvailable error', err);
        setPublishSamplesResponse({
          status: 'fetch-failure',
          summary: { success: '', failed: '' },
          rawData: err,
        });
      });
  }, [
    portal,
    publishSamplesMode,
    publishSamplesButtonClicked,
    hasSamplesNameBeenChecked,
    layers,
    publishSampleTableMetaData,
  ]);

  // Run the publish
  const [
    publishSamplesResponse,
    setPublishSamplesResponse,
  ] = React.useState<PublishType>({
    status: 'none',
    summary: { success: '', failed: '' },
    rawData: null,
  });
  React.useEffect(() => {
    if (!oAuthInfo || !portal || !signedIn) return;
    if (
      Object.keys(sampleTypeSelections).length === 0 ||
      !publishSampleTableMetaData ||
      !publishSamplesButtonClicked ||
      !hasSamplesNameBeenChecked ||
      (publishSamplesMode === 'existing' && !selectedService)
    ) {
      return;
    }

    setPublishSamplesButtonClicked(false);

    setPublishSamplesResponse({
      status: 'fetching',
      summary: { success: '', failed: '' },
      rawData: null,
    });

    const tempPortal = portal as any;
    const token = tempPortal.credential.token;

    const changes: {
      id: number;
      adds: any[];
      updates: any[];
      deletes: any[];
    } = {
      id: -1,
      adds: [],
      updates: [],
      deletes: [],
    };

    function publishSampleTypes() {
      if (!portal || !publishSampleTableMetaData) return;

      // exit early if there are no edits
      if (
        changes.adds.length === 0 &&
        changes.updates.length === 0 &&
        changes.deletes.length === 0
      ) {
        setPublishSamplesResponse({
          status: 'fetch-failure',
          summary: { success: '', failed: '' },
          rawData: null,
        });
        return;
      }

      publishTable({
        portal,
        changes,
        serviceMetaData: publishSampleTableMetaData,
      })
        .then((res: any) => {
          // get totals
          const totals = {
            added: 0,
            updated: 0,
            deleted: 0,
            failed: 0,
          };

          const newUserDefinedAttributes = { ...userDefinedAttributes };

          // need to loop through each array and check the success flag
          if (res.edits.addResults) {
            res.edits.addResults.forEach((item: any, index: number) => {
              item.success ? (totals.added += 1) : (totals.failed += 1);

              // update the edits arrays
              const origItem = changes.adds[index];
              const origUdt =
                newUserDefinedAttributes.sampleTypes[
                  origItem.attributes.TYPEUUID
                ];
              if (item.success) {
                origUdt.status = origUdt.serviceId ? 'published-ago' : 'published';
                origUdt.serviceId = res.service.featureService.serviceItemId;
                origUdt.attributes.GLOBALID = item.globalId;
                origUdt.attributes.OBJECTID = item.objectId;
              }
            });
          }
          if (res.edits.updateResults) {
            res.edits.updateResults.forEach((item: any, index: number) => {
              item.success ? (totals.updated += 1) : (totals.failed += 1);

              // update the edits arrays
              const origItem = changes.updates[index];
              const origUdt =
                newUserDefinedAttributes.sampleTypes[
                  origItem.attributes.TYPEUUID
                ];
              if (item.success) {
                origUdt.status = origUdt.serviceId ? 'published-ago' : 'published';
                origUdt.serviceId = res.service.featureService.serviceItemId;
                origUdt.attributes.GLOBALID = item.globalId;
                origUdt.attributes.OBJECTID = item.objectId;
              }
            });
          }
          if (res.edits.deleteResults) {
            res.edits.deleteResults.forEach((item: any, index: number) => {
              item.success ? (totals.deleted += 1) : (totals.failed += 1);

              // update the edits arrays
              const origItem = changes.deletes[index];
              delete newUserDefinedAttributes.sampleTypes[
                origItem.attributes.TYPEUUID
              ];
            });
          }

          // create the message string for each type of change (add, update and delete)
          const successParts = [];
          if (totals.added) {
            successParts.push(`${totals.added} item(s) added`);
          }
          if (totals.updated) {
            successParts.push(`${totals.updated} item(s) updated`);
          }
          if (totals.deleted) {
            successParts.push(`${totals.deleted} item(s) deleted`);
          }

          // combine the messages
          let success = '';
          if (successParts.length === 1) {
            success = successParts[0];
          }
          if (successParts.length > 1) {
            success =
              successParts.slice(0, -1).join(', ') +
              ' and ' +
              successParts.slice(-1);
          }

          // create the failed status message
          const failed = totals.failed
            ? `${totals.failed} item(s) failed to publish. Check the console log for details.`
            : '';
          if (failed)
            console.error('Some items failed to publish: ', res.edits);

          newUserDefinedAttributes.editCount =
            newUserDefinedAttributes.editCount + 1;
          setPublishSamplesResponse({
            status: 'success',
            summary: { success, failed },
            rawData: res.edits,
          });
          setUserDefinedAttributes(newUserDefinedAttributes);

          if (publishSamplesMode === 'new') {
            setSampleTableDescription('');
            setSampleTableName('');
          }
          if (publishSamplesMode === 'existing') {
            setSelectedService(null);
          }
        })
        .catch((err) => {
          console.error('publishTable error', err);
          setPublishSamplesResponse({
            status: 'fetch-failure',
            summary: { success: '', failed: '' },
            rawData: err,
          });
        });
    }

    if (publishSamplesMode === 'new') {
      sampleTypeSelections.forEach((type) => {
        if (!type.value) return;

        const sampleType = userDefinedAttributes.sampleTypes[type.value];
        const item = {
          attributes: sampleType.attributes,
        };
        if (publishSamplesMode === 'new') {
          changes.adds.push(item);
        }
      });

      publishSampleTypes();
      return;
    }

    if (!selectedService) return;

    // get the list of feature layers in this feature server
    getFeatureTables(selectedService.url, token)
      .then((res: any) => {
        // fire off requests to get the details and features for each layer
        const layerPromises: Promise<any>[] = [];
        res.forEach((layer: any) => {
          // get the layer features promise
          const featuresCall = getAllFeatures(
            portal,
            selectedService.url + '/' + layer.id,
          );
          layerPromises.push(featuresCall);
        });

        // wait for all of the promises to resolve
        Promise.all(layerPromises)
          .then((responses) => {
            // define items used for updating states
            const existingTypeUuids: string[] = [];

            // create the user defined sample types to be added to TOTS
            responses.forEach((layerFeatures) => {
              // get the graphics from the layer
              layerFeatures.features.forEach((feature: any) => {
                const uuid = feature.attributes.TYPEUUID;
                if (!existingTypeUuids.includes(uuid)) {
                  existingTypeUuids.push(uuid);
                }
              });
            });

            sampleTypeSelections.forEach((type) => {
              if (!type.value) return;

              const sampleType = userDefinedAttributes.sampleTypes[type.value];
              const item = {
                attributes: sampleType.attributes,
              };
              const typeUuid = item.attributes.TYPEUUID || '';

              if (existingTypeUuids.includes(typeUuid)) {
                if (sampleType.status === 'delete') changes.deletes.push(item);
                else changes.updates.push(item);
              } else {
                if (sampleType.status !== 'delete') changes.adds.push(item);
              }
            });

            publishSampleTypes();
          })
          .catch((err) => {
            console.error('publishTable error', err);
            setPublishSamplesResponse({
              status: 'fetch-failure',
              summary: { success: '', failed: '' },
              rawData: err,
            });
          });
      })
      .catch((err) => {
        console.error('publishTable error', err);
        setPublishSamplesResponse({
          status: 'fetch-failure',
          summary: { success: '', failed: '' },
          rawData: err,
        });
      });
  }, [
    Graphic,
    GraphicsLayer,
    IdentityManager,
    portal,
    oAuthInfo,
    setGoToOptions,
    signedIn,
    publishSampleTableMetaData,
    publishSamplesButtonClicked,
    hasSamplesNameBeenChecked,
    userDefinedAttributes,
    setUserDefinedAttributes,
    publishSamplesMode,
    sampleAttributes,
    sampleTypeContext,
    sampleTypeSelections,
    selectedService,
    setSampleTableDescription,
    setSampleTableName,
    setSelectedService,
    setUserDefinedOptions,
  ]);

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

  ///////////////////////////////////////////////////////////////////////////////////////
  //////////////////////////// END - Publish Sample Types ///////////////////////////////
  ///////////////////////////////////////////////////////////////////////////////////////

  const sampleTypeOptions: SampleTypeOptions = Object.values(
    userDefinedAttributes.sampleTypes,
  ).map((type) => {
    return {
      label: `${type.attributes.TYPE}${
        type.status === 'delete' ? ' (deleted)' : ''
      }`,
      value: type.attributes.TYPEUUID,
      serviceId: type.serviceId,
      status: type.status,
    };
  });

  // count the number of samples of the selected sampling plan
  let sampleCount = 0;
  if (selectedScenario?.scenarioName) {
    layers.forEach((layer) => {
      if (layer.layerType !== 'Samples' && layer.layerType !== 'VSP') return;
      if (layer.sketchLayer.type === 'feature') return;
      if (layer.parentLayer?.title !== selectedScenario.scenarioName) return;

      sampleCount += layer.sketchLayer.graphics.length;
    });
  }

  return (
    <div css={panelContainer}>
      <h2>Publish Plan</h2>
      <div css={sectionContainer}>
        <p>
          Publish the created plan to your ArcGIS Online account. A hosted
          feature layer is created in your ArcGIS Online organization account.
          By default, only you and the administrator can access the feature
          layer created. Provide other collaborators access to TOTS content by{' '}
          <a
            href="https://doc.arcgis.com/en/arcgis-online/share-maps/share-items.htm"
            target="_blank"
            rel="noopener noreferrer"
          >
            sharing
          </a>{' '}
          <a
            className="exit-disclaimer"
            href="https://www.epa.gov/home/exit-epa"
            target="_blank"
            rel="noopener noreferrer"
          >
            EXIT
          </a>{' '}
          the content to everyone (the public), your organization, or members of
          specific groups. You can edit{' '}
          <a
            href="https://doc.arcgis.com/en/arcgis-online/manage-data/item-details.htm"
            target="_blank"
            rel="noopener noreferrer"
          >
            item details
          </a>{' '}
          and change{' '}
          <a
            href="https://doc.arcgis.com/en/arcgis-online/manage-data/manage-hosted-feature-layers.htm"
            target="_blank"
            rel="noopener noreferrer"
          >
            feature layer settings
          </a>
          .{' '}
          <a
            className="exit-disclaimer"
            href="https://www.epa.gov/home/exit-epa"
            target="_blank"
            rel="noopener noreferrer"
          >
            EXIT
          </a>
        </p>
        {publishResponse.status === 'name-not-available' && (
          <EditScenario
            initialScenario={selectedScenario}
            buttonText="Publish"
            initialStatus="name-not-available"
            onSave={() => setPublishButtonClicked(true)}
          />
        )}
        {publishResponse.status !== 'name-not-available' && (
          <React.Fragment>
            <p css={layerInfo}>
              <strong>Plan Name: </strong>
              {selectedScenario?.scenarioName}
            </p>
            <p css={layerInfo}>
              <strong>Plan Description: </strong>
              <ShowLessMore
                text={selectedScenario?.scenarioDescription}
                charLimit={20}
              />
            </p>
          </React.Fragment>
        )}
      </div>

      {publishResponse.status === 'fetching' && <LoadingSpinner />}
      {publishResponse.status === 'fetch-failure' &&
        webServiceErrorMessage(publishResponse.error)}
      {publishResponse.status === 'success' &&
        publishResponse.summary.failed && (
          <MessageBox
            severity="error"
            title="Some item(s) failed to publish"
            message={publishResponse.summary.failed}
          />
        )}
      {(publishResponse.summary.success ||
        selectedScenario?.status === 'published') &&
        publishSuccessMessage}
      {!signedIn && notLoggedInMessage}
      {sampleCount === 0 && noSamplesPublishMessage}
      {publishResponse.status !== 'name-not-available' &&
        selectedScenario &&
        selectedScenario.status !== 'published' &&
        sampleCount !== 0 && (
          <div css={publishButtonContainerStyles}>
            <button
              css={publishButtonStyles}
              onClick={() => setPublishButtonClicked(true)}
            >
              Publish
            </button>
          </div>
        )}

      <div>
        <p>
          Publish custom sample types to ArcGIS Online. Select one or more
          custom sample types from the drop-down list and specify whether to
          publish output to a new or existing feature service. If appending
          output to an existing feature service, select the feature service from
          the drop-down list. Click Publish Custom Sample Types.
        </p>
        <div>
          <label htmlFor="publish-sample-select">Sample Types to Publish</label>
          <Select
            inputId="publish-sample-select"
            isMulti={true as any}
            isSearchable={false}
            options={sampleTypeOptions as any}
            value={sampleTypeSelections as any}
            onChange={(ev) => setSampleTypeSelections(ev as any)}
            css={multiSelectStyles}
          />
        </div>

        <div>
          {publishSamplesResponse.status === 'name-not-available' &&
            featureServiceTakenMessage(sampleTableName ? sampleTableName : '')}
          <input
            id="draw-aoi"
            type="radio"
            name="mode"
            value="Publish to Existing Service"
            checked={publishSamplesMode === 'new'}
            onChange={(ev) => {
              setPublishSamplesMode('new');
            }}
          />
          <label htmlFor="draw-aoi" css={radioLabelStyles}>
            Publish to new Feature Service
          </label>
        </div>
        <div>
          <input
            id="use-aoi-file"
            type="radio"
            name="mode"
            value="Publish to New Service"
            checked={publishSamplesMode === 'existing'}
            onChange={(ev) => {
              setPublishSamplesMode('existing');
            }}
          />
          <label htmlFor="use-aoi-file" css={radioLabelStyles}>
            Publish to existing Feature Service
          </label>
        </div>

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
        {publishSamplesResponse.status === 'fetching' && <LoadingSpinner />}
        {publishSamplesResponse.status === 'fetch-failure' &&
          webServiceErrorMessage}
        {publishSamplesResponse.status === 'success' &&
          publishSamplesResponse.summary.failed && (
            <MessageBox
              severity="error"
              title="Some item(s) failed to publish"
              message={publishSamplesResponse.summary.failed}
            />
          )}
        {publishSamplesResponse.summary.success &&
          pulblishSamplesSuccessMessage}
        {!signedIn && notLoggedInMessage}
        {publishSamplesMode && (
          <div css={publishButtonContainerStyles}>
            <button
              css={publishButtonStyles}
              disabled={
                !sampleTypeSelections ||
                sampleTypeSelections.length === 0 ||
                (publishSamplesMode === 'new' && !sampleTableName) ||
                (publishSamplesMode === 'existing' && !selectedService)
              }
              onClick={() => {
                if (publishSamplesMode === 'existing' && selectedService) {
                  setPublishSampleTableMetaData(selectedService);
                } else if (publishSamplesMode === 'new') {
                  setPublishSampleTableMetaData({
                    value: '',
                    label: sampleTableName,
                    description: sampleTableDescription,
                    url: '',
                  });
                }

                setPublishSamplesButtonClicked(true);
              }}
            >
              Publish Custom Sample Types
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default Publish;
