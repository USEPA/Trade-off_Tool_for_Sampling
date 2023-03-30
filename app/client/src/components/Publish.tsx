/** @jsxImportSource @emotion/react */

import React, {
  Fragment,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import { css } from '@emotion/react';
import GraphicsLayer from '@arcgis/core/layers/GraphicsLayer';
import IdentityManager from '@arcgis/core/identity/IdentityManager';
import Portal from '@arcgis/core/portal/Portal';
// components
import {
  EditCustomSampleTypesTable,
  EditScenario,
  SaveResultsType,
} from 'components/EditLayerMetaData';
import LoadingSpinner from 'components/LoadingSpinner';
import MessageBox from 'components/MessageBox';
import ShowLessMore from 'components/ShowLessMore';
// contexts
import { AuthenticationContext } from 'contexts/Authentication';
import { useLayerProps } from 'contexts/LookupFiles';
import { NavigationContext } from 'contexts/Navigation';
import { defaultPlanAttributes, PublishContext } from 'contexts/Publish';
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
// config
import {
  noSamplesPublishMessage,
  noSampleTypesPublishMessage,
  noServiceNameMessage,
  noServiceSelectedMessage,
  notLoggedInMessage,
  publishSuccessMessage,
  webServiceErrorMessage,
} from 'config/errorMessages';
import { LayerType } from 'types/Layer';

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

const totsOutputContainer = css`
  padding-bottom: 1.5em;
`;

const checkedStyles = css`
  color: green;
  margin-right: 10px;
`;

const unCheckedStyles = css`
  color: red;
  margin-right: 10px;
`;

const webMapContainerCheckboxStyles = css`
  margin-left: 20px;
`;

// --- components (Publish) ---
function Publish() {
  const { oAuthInfo, portal, setSignedIn, setPortal, signedIn } = useContext(
    AuthenticationContext,
  );
  const { goToOptions, setGoToOptions } = useContext(NavigationContext);
  const {
    includeCustomSampleTypes,
    includeFullPlan,
    includeFullPlanWebMap,
    includePartialPlan,
    includePartialPlanWebMap,
    includePartialPlanWebScene,
    publishSamplesMode,
    publishSampleTableMetaData,
    sampleTableDescription,
    sampleTableName,
    sampleTypeSelections,
    selectedService,
    setSampleTableDescription,
    setSampleTableName,
    setSelectedService,
    webMapReferenceLayerSelections,
    webSceneReferenceLayerSelections,
  } = useContext(PublishContext);
  const {
    defaultSymbols,
    edits,
    setEdits,
    layers,
    setLayers,
    map,
    sampleAttributes,
    selectedScenario,
    setSelectedScenario,
    sketchLayer,
    userDefinedAttributes,
    setUserDefinedAttributes,
  } = useContext(SketchContext);

  const layerProps = useLayerProps();

  // Checks browser storage to determine if the user clicked publish and logged in.
  const [publishButtonClicked, setPublishButtonClicked] = useState(false);
  const [continueInitialized, setContinueInitialized] = useState(false);
  useEffect(() => {
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
  useEffect(() => {
    if (!oAuthInfo || !publishButtonClicked) return;

    // have the user login if necessary
    if (!portal || !signedIn) {
      setGoToOptions({ continuePublish: true });
      IdentityManager.getCredential(`${oAuthInfo.portalUrl}/sharing`, {
        oAuthPopupConfirmation: false,
      })
        .then(() => {
          setSignedIn(true);

          const portal = new Portal();
          portal.authMode = 'immediate';
          portal.load().then(() => {
            setPortal(portal);
          });
        })
        .catch((err) => {
          console.error(err);
          setSignedIn(false);
          setPortal(null);
        });
    }
  }, [
    oAuthInfo,
    portal,
    publishButtonClicked,
    setGoToOptions,
    setPortal,
    setSignedIn,
    signedIn,
  ]);

  // Check if the scenario name is available
  const [hasNameBeenChecked, setHasNameBeenChecked] = useState(false);
  useEffect(() => {
    if (!portal || !publishButtonClicked) return;

    // see if names have already been verified as available
    const fullPlanNameChecked =
      !includeFullPlan ||
      selectedScenario?.status === 'edited' ||
      selectedScenario?.status === 'published';
    const sampleTypesNameChecked =
      !includeCustomSampleTypes ||
      (publishSamplesMode === 'existing' && publishSampleTableMetaData?.value);

    if (fullPlanNameChecked && sampleTypesNameChecked) {
      setHasNameBeenChecked(true);
      return;
    }

    // fire off requests to check if service names are available
    const requests = [];
    let fullPlanIndex = -1,
      sampleTypesIndex = -1;
    if (!fullPlanNameChecked && selectedScenario) {
      setPublishResponse({
        status: 'fetching',
        summary: { success: '', failed: '' },
        rawData: null,
      });
      const request = isServiceNameAvailable(
        portal,
        selectedScenario.scenarioName,
      );
      requests.push(request);
      fullPlanIndex = requests.length - 1;
    }
    if (!sampleTypesNameChecked && publishSampleTableMetaData) {
      setPublishSamplesResponse({
        status: 'fetching',
        summary: { success: '', failed: '' },
        rawData: null,
      });
      const request = isServiceNameAvailable(
        portal,
        publishSampleTableMetaData.label,
      );
      requests.push(request);
      sampleTypesIndex = requests.length - 1;
    }

    Promise.all(requests)
      .then((responses: any[]) => {
        let stopEarly = false;

        function checkResponse(res: any, setter: Function) {
          if (res.error) {
            stopEarly = true;
            setter({
              status: 'fetch-failure',
              summary: { success: '', failed: '' },
              error: {
                error: createErrorObject(res),
                message: res.error.message,
              },
              rawData: null,
            });
          }

          if (!res.available) {
            stopEarly = true;
            setter({
              status: 'name-not-available',
              summary: { success: '', failed: '' },
              rawData: null,
            });
            return;
          }
        }

        // check responses for errors
        if (fullPlanIndex > -1) {
          checkResponse(responses[fullPlanIndex], setPublishResponse);
        }
        if (sampleTypesIndex > -1) {
          checkResponse(responses[sampleTypesIndex], setPublishSamplesResponse);
        }

        if (stopEarly) setPublishButtonClicked(false);

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
    includeCustomSampleTypes,
    includeFullPlan,
    portal,
    selectedScenario,
    sketchLayer,
    publishButtonClicked,
    publishSamplesMode,
    publishSampleTableMetaData,
    hasNameBeenChecked,
    layers,
  ]);

  const [publishResponse, setPublishResponse] = useState<PublishType>({
    status: 'none',
    summary: { success: '', failed: '' },
    rawData: null,
  });

  // publishes a plan with all of the attributes
  const publishFullPlan = useCallback(() => {
    if (!map || !portal || !selectedScenario) return;

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

    const scenarioName = `${selectedScenario.scenarioName}${
      includePartialPlan ? '-full' : ''
    }`;

    // make the layer publish layer
    const graphicsLayer = new GraphicsLayer({
      title: scenarioName,
      visible: false,
      listMode: 'hide',
    });
    const pointsLayer = new GraphicsLayer({
      title: scenarioName + '-points',
      visible: false,
      listMode: 'hide',
    });

    let publishLayer: LayerType | null = null;
    originalLayers.forEach((layer, index) => {
      if (index === 0) {
        publishLayer = {
          ...layer,
          label: scenarioName,
          layerId: selectedScenario.layerId,
          layerType: 'Samples',
          name: scenarioName,
          sketchLayer: graphicsLayer,
          pointsLayer,
          value: scenarioName,
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

    if (
      layerEdits.adds.length === 0 &&
      layerEdits.updates.length === 0 &&
      layerEdits.deletes.length === 0
    ) {
      setPublishResponse({
        status: 'success',
        summary: { success: '', failed: '' },
        rawData: {},
      });
      return;
    } else {
      setPublishResponse({
        status: 'fetching',
        summary: { success: '', failed: '' },
        rawData: null,
      });
    }

    publish({
      portal,
      layers: publishLayers,
      edits: [layerEdits],
      referenceMaterials: {
        createWebMap: includeFullPlanWebMap,
        createWebScene: false,
        webMapReferenceLayerSelections: [],
        webSceneReferenceLayerSelections: [],
      },
      map,
      table: editsScenario.table,
      referenceLayersTable: editsScenario.referenceLayersTable,
      layerProps,
      serviceMetaData: {
        value: '',
        label: scenarioName,
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
          if (layerRes.id === res.table.id) return;

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
                  const exist =
                    changes[decisionUUID].published.findIndex(
                      (x) =>
                        x.attributes.PERMANENT_IDENTIFIER ===
                        origItem.attributes.PERMANENT_IDENTIFIER,
                    ) > -1;
                  if (!exist) changes[decisionUUID].published.push(origItem);
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
              if (item.success && changes.hasOwnProperty(decisionUUID)) {
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
              if (item.success && changes.hasOwnProperty(decisionUUID)) {
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

            const edits = changes[editedLayer.uuid];

            if (edits) {
              const oldPublished = editedLayer.published.filter((x) => {
                const idx = editedLayer.deletes.findIndex(
                  (y) =>
                    y.PERMANENT_IDENTIFIER ===
                    x.attributes.PERMANENT_IDENTIFIER,
                );
                const idx2 = edits.published.findIndex(
                  (y) =>
                    y.attributes.PERMANENT_IDENTIFIER ===
                    x.attributes.PERMANENT_IDENTIFIER,
                );
                return idx === -1 && idx2 === -1;
              });

              editedLayer.adds = edits.adds;
              editedLayer.updates = edits.updates;
              editedLayer.published = [...oldPublished, ...edits.published];
              editedLayer.deletes = edits.deletes;
            }
          });
          editsScenario.table = res.table;

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
          if (!selectedScenario) return selectedScenario;

          selectedScenario.status = 'published';
          selectedScenario.portalId = portalId;
          return selectedScenario;
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
    edits,
    setEdits,
    includeFullPlanWebMap,
    includePartialPlan,
    setLayers,
    map,
    portal,
    layers,
    layerProps,
    selectedScenario,
    setSelectedScenario,
  ]);

  const [publishPartialResponse, setPublishPartialResponse] =
    useState<PublishType>({
      status: 'none',
      summary: { success: '', failed: '' },
      rawData: null,
    });

  // publishes a plan with all of the attributes
  const publishPartialPlan = useCallback(() => {
    if (!map || !portal || !selectedScenario) return;

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
      setPublishPartialResponse({
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

    // get the attributes to be published
    const attributesToInclude = [
      ...defaultPlanAttributes,
      ...editsScenario.customAttributes,
    ];

    // add graphics to the layer to publish while also setting
    // the DECISIONUNIT, DECISIONUNITUUID and DECISIONUNITSORT attributes
    editsScenario.layers.forEach((layer) => {
      layerEdits.published = layerEdits.published.concat(layer.published);

      layer.adds.forEach((item) => {
        let attributes: any = {};
        if (publishLayer?.sketchLayer.type === 'graphics') {
          const graphic = publishLayer.sketchLayer.graphics.find(
            (graphic) =>
              graphic.attributes.PERMANENT_IDENTIFIER ===
              item.attributes.PERMANENT_IDENTIFIER,
          );

          attributes['GLOBALID'] = graphic.attributes['GLOBALID'];
          attributes['OBJECTID'] = graphic.attributes['OBJECTID'];

          attributesToInclude.forEach((attribute) => {
            attributes[attribute.name] =
              graphic.attributes[attribute.name] || null;
          });
        }

        if (attributes.length === 0) {
          attributes = { ...item.attributes };
        }

        layerEdits.adds.push({
          ...item,
          attributes,
        });
      });

      const combinedUpdates = [...layer.updates, ...layer.published];
      combinedUpdates.forEach((item) => {
        let attributes: any = {};
        if (publishLayer?.sketchLayer.type === 'graphics') {
          const graphic = publishLayer.sketchLayer.graphics.find(
            (graphic) =>
              graphic.attributes.PERMANENT_IDENTIFIER ===
              item.attributes.PERMANENT_IDENTIFIER,
          );

          attributes['GLOBALID'] = graphic.attributes['GLOBALID'];
          attributes['OBJECTID'] = graphic.attributes['OBJECTID'];

          attributesToInclude.forEach((attribute) => {
            attributes[attribute.name] =
              graphic.attributes[attribute.name] || null;
          });
        }

        if (attributes.length === 0) {
          attributes = { ...item.attributes };
        }

        layerEdits.updates.push({
          ...item,
          attributes,
        });
      });
      layer.deletes.forEach((item) => {
        layerEdits.deletes.push({
          ...item,
          DECISIONUNITUUID: layer.uuid,
        });
      });
    });

    setPublishPartialResponse({
      status: 'fetching',
      summary: { success: '', failed: '' },
      rawData: null,
    });

    publish({
      portal,
      layers: publishLayers,
      edits: [layerEdits],
      referenceMaterials: {
        createWebMap: includePartialPlanWebMap,
        createWebScene: includePartialPlanWebScene,
        webMapReferenceLayerSelections,
        webSceneReferenceLayerSelections,
      },
      map,
      table: editsScenario.table,
      referenceLayersTable: editsScenario.referenceLayersTable,
      attributesToInclude,
      layerProps,
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

        res.edits.forEach((layerRes: any) => {
          if (layerRes.id !== 0) return;

          // need to loop through each array and check the success flag
          if (layerRes.addResults) {
            layerRes.addResults.forEach((item: any, index: number) => {
              item.success ? (totals.added += 1) : (totals.failed += 1);

              // update the edits arrays
              const origItem = layerEdits.adds[index];
              const decisionUUID = origItem.attributes.DECISIONUNITUUID;
              if (item.success) {
                const type = origItem.attributes.TYPE;
                origItem.attributes = { ...sampleAttributes[type] };
                origItem.attributes.DECISIONUNITUUID = decisionUUID;
                origItem.attributes.OBJECTID = item.objectId;
                origItem.attributes.GLOBALID = item.globalId;

                // update the published for this layer
                if (changes.hasOwnProperty(decisionUUID)) {
                  const exist =
                    changes[decisionUUID].published.findIndex(
                      (x) =>
                        x.attributes.PERMANENT_IDENTIFIER ===
                        origItem.attributes.PERMANENT_IDENTIFIER,
                    ) > -1;
                  if (!exist) changes[decisionUUID].published.push(origItem);
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
              if (item.success && changes.hasOwnProperty(decisionUUID)) {
                const type = origItem.attributes.TYPE;
                origItem.attributes = { ...sampleAttributes[type] };
                origItem.attributes.DECISIONUNITUUID = decisionUUID;
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
              if (item.success && changes.hasOwnProperty(decisionUUID)) {
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

        setPublishPartialResponse({
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

            const edits = changes[editedLayer.uuid];
            if (edits) {
              const oldPublished = editedLayer.published.filter((x) => {
                const idx = editedLayer.deletes.findIndex(
                  (y) =>
                    y.PERMANENT_IDENTIFIER ===
                    x.attributes.PERMANENT_IDENTIFIER,
                );
                const idx2 = edits.published.findIndex(
                  (y) =>
                    y.attributes.PERMANENT_IDENTIFIER ===
                    x.attributes.PERMANENT_IDENTIFIER,
                );
                return idx === -1 && idx2 === -1;
              });

              editedLayer.adds = edits.adds;
              editedLayer.updates = edits.updates;
              editedLayer.published = [...oldPublished, ...edits.published];
              editedLayer.deletes = edits.deletes;
            }
          });
          editsScenario.table = res.table;

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
          if (!selectedScenario) return selectedScenario;

          selectedScenario.status = 'published';
          selectedScenario.portalId = portalId;
          return selectedScenario;
        });
      })
      .catch((err) => {
        console.error('isServiceNameAvailable error', err);
        setPublishPartialResponse({
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
    edits,
    includePartialPlanWebMap,
    includePartialPlanWebScene,
    layers,
    layerProps,
    map,
    portal,
    sampleAttributes,
    selectedScenario,
    setEdits,
    setLayers,
    setSelectedScenario,
    webMapReferenceLayerSelections,
    webSceneReferenceLayerSelections,
  ]);

  const [publishSamplesResponse, setPublishSamplesResponse] =
    useState<PublishType>({
      status: 'none',
      summary: { success: '', failed: '' },
      rawData: null,
    });

  // publishes custom sample types
  const publishSampleTypes = useCallback(() => {
    if (!portal) return;

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
        layerProps,
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
                origUdt.status = origUdt.serviceId
                  ? 'published-ago'
                  : 'published';
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
                origUdt.status = origUdt.serviceId
                  ? 'published-ago'
                  : 'published';
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
        const symbolTypeUuid = sampleType.attributes.TYPEUUID ?? 'Samples';
        const defaultSymbol =
          defaultSymbols.symbols[
            defaultSymbols.symbols.hasOwnProperty(symbolTypeUuid)
              ? symbolTypeUuid
              : 'Samples'
          ];
        const item = {
          attributes: {
            ...sampleType.attributes,
            SYMBOLCOLOR: JSON.stringify(defaultSymbol.color),
            SYMBOLOUTLINE: JSON.stringify(defaultSymbol.outline),
            SYMBOLTYPE: defaultSymbol.type,
          },
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
              const symbolTypeUuid =
                sampleType.attributes.TYPEUUID ?? 'Samples';
              const defaultSymbol =
                defaultSymbols.symbols[
                  defaultSymbols.symbols.hasOwnProperty(symbolTypeUuid)
                    ? symbolTypeUuid
                    : 'Samples'
                ];
              const item = {
                attributes: {
                  ...sampleType.attributes,
                  SYMBOLCOLOR: JSON.stringify(defaultSymbol.color),
                  SYMBOLOUTLINE: JSON.stringify(defaultSymbol.outline),
                  SYMBOLTYPE: defaultSymbol.type,
                },
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
    defaultSymbols,
    layerProps,
    portal,
    publishSampleTableMetaData,
    userDefinedAttributes,
    publishSamplesMode,
    sampleTypeSelections,
    selectedService,
    setSampleTableDescription,
    setSampleTableName,
    setSelectedService,
    setUserDefinedAttributes,
  ]);

  // Run the publish
  useEffect(() => {
    if (!oAuthInfo || !portal || !signedIn) return;
    if (!publishButtonClicked || !hasNameBeenChecked) return;
    if (layerProps.status !== 'success') return;
    if (
      includeFullPlan &&
      (!layers || layers.length === 0 || !selectedScenario)
    ) {
      return;
    }

    if (
      includeCustomSampleTypes &&
      (Object.keys(sampleTypeSelections).length === 0 ||
        !publishSampleTableMetaData ||
        (publishSamplesMode === 'existing' && !selectedService))
    ) {
      return;
    }
    setPublishButtonClicked(false);

    if (includeFullPlan) {
      publishFullPlan();
    }

    if (includePartialPlan) {
      publishPartialPlan();
    }

    if (includeCustomSampleTypes) {
      publishSampleTypes();
    }
  }, [
    hasNameBeenChecked,
    includeCustomSampleTypes,
    includeFullPlan,
    includePartialPlan,
    layers,
    layerProps,
    oAuthInfo,
    portal,
    publishButtonClicked,
    publishFullPlan,
    publishPartialPlan,
    publishSampleTableMetaData,
    publishSampleTypes,
    publishSamplesMode,
    sampleTypeSelections,
    selectedScenario,
    selectedService,
    signedIn,
  ]);

  ///////////////////////////////////////////////////////////////////////////////////////
  //////////////////////////// END - Publish Sample Types ///////////////////////////////
  ///////////////////////////////////////////////////////////////////////////////////////

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

  const [publishNameCheck, setPublishNameCheck] = useState<SaveResultsType>({
    status: 'none',
  });
  const [sampleTypesNameCheck, setSampleTypesNameCheck] =
    useState<SaveResultsType>({ status: 'none' });

  const isPublishPlanReady =
    (!includeFullPlan && !includePartialPlan) ||
    // verify the service name is available
    ((publishResponse.status !== 'name-not-available' ||
      (publishResponse.status === 'name-not-available' &&
        publishNameCheck.status === 'success')) &&
      sampleCount !== 0 && // verify there are samples to publish
      // verify service name availbility if changed
      (publishNameCheck.status === 'none' ||
        publishNameCheck.status === 'success'));

  const isPublishSamplesReady =
    !includeCustomSampleTypes ||
    // verify the service name is available
    ((publishSamplesResponse.status !== 'name-not-available' ||
      (publishSamplesResponse.status === 'name-not-available' &&
        sampleTypesNameCheck.status === 'success')) &&
      // verify at least on custom sample type is selected and a service is selected
      sampleTypeSelections.length > 0 &&
      ((publishSamplesMode === 'new' && sampleTableName) ||
        (publishSamplesMode === 'existing' && selectedService !== null)) &&
      // verify service name availbility if changed
      (sampleTypesNameCheck.status === 'none' ||
        sampleTypesNameCheck.status === 'success'));

  return (
    <div css={panelContainer}>
      <h2>Publish Output</h2>
      <div css={sectionContainer}>
        <p>
          Publish the configured TOTS output to your ArcGIS Online account. A
          summary of the selections made on the Configure Output step is below.
          By default, only you and the ArcGIS Online administrator can access
          content created. Provide other collaborators access to TOTS content by{' '}
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
            initialStatus="name-not-available"
            onSave={(saveResults) => {
              if (!saveResults) return;

              setPublishNameCheck(saveResults);
            }}
          />
        )}
        {publishResponse.status !== 'name-not-available' && (
          <Fragment>
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
          </Fragment>
        )}
      </div>

      <div>
        <h3>Publish Summary</h3>
        <div css={totsOutputContainer}>
          <strong>
            {includePartialPlan ? (
              <i className="fas fa-check" css={checkedStyles}></i>
            ) : (
              <i className="fas fa-times" css={unCheckedStyles}></i>
            )}
            Include Tailored TOTS Output Files:
          </strong>
          {includePartialPlan && (
            <div>
              <div>
                <strong css={webMapContainerCheckboxStyles}>
                  {includePartialPlanWebMap ? (
                    <i className="fas fa-check" css={checkedStyles}></i>
                  ) : (
                    <i className="fas fa-times" css={unCheckedStyles}></i>
                  )}
                  Include Web Map:
                </strong>
              </div>
              {webMapReferenceLayerSelections.length > 0 && (
                <div css={webMapContainerCheckboxStyles}>
                  Reference layers to include:
                  <ul>
                    {webMapReferenceLayerSelections
                      .sort((a, b) => a.label.localeCompare(b.label))
                      .map((l, index) => (
                        <li key={index}>{l.label}</li>
                      ))}
                  </ul>
                </div>
              )}

              <div>
                <strong css={webMapContainerCheckboxStyles}>
                  {includePartialPlanWebScene ? (
                    <i className="fas fa-check" css={checkedStyles}></i>
                  ) : (
                    <i className="fas fa-times" css={unCheckedStyles}></i>
                  )}
                  Include Web Scene:
                </strong>
              </div>
              {webSceneReferenceLayerSelections.length > 0 && (
                <div css={webMapContainerCheckboxStyles}>
                  Reference layers to include:
                  <ul>
                    {webSceneReferenceLayerSelections
                      .sort((a, b) => a.label.localeCompare(b.label))
                      .map((l, index) => (
                        <li key={index}>{l.label}</li>
                      ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        {includeCustomSampleTypes && (
          <div>
            <strong>Include Custom Sample Types:</strong>
            <ul>
              {sampleTypeSelections.map((item, index) => {
                return <li key={index}>{item.label}</li>;
              })}
            </ul>
            <p>
              <strong>Publish Custom Sample Types to:</strong>
              <br />
              {selectedService ? (
                <Fragment>
                  <strong>Feature Service Name: </strong>
                  {selectedService.label}
                  <br />
                  <strong>Feature Service Description: </strong>
                  {selectedService.description}
                </Fragment>
              ) : (
                <Fragment>
                  <strong>Feature Service Name: </strong>
                  {sampleTableName}
                  <br />
                  <strong>Feature Service Description: </strong>
                  {sampleTableDescription}
                </Fragment>
              )}
            </p>
          </div>
        )}
      </div>

      {(publishResponse.status === 'fetching' ||
        publishPartialResponse.status === 'fetching' ||
        publishSamplesResponse.status === 'fetching') && <LoadingSpinner />}
      {publishResponse.status === 'fetch-failure' &&
        webServiceErrorMessage(publishResponse.error)}
      {publishPartialResponse.status === 'fetch-failure' &&
        webServiceErrorMessage(publishPartialResponse.error)}
      {publishSamplesResponse.status === 'fetch-failure' &&
        webServiceErrorMessage()}
      {layerProps.status === 'failure' && webServiceErrorMessage()}
      {publishResponse.status === 'success' &&
        publishResponse.summary.failed && (
          <MessageBox
            severity="error"
            title="Some item(s) failed to publish"
            message={publishResponse.summary.failed}
          />
        )}
      {publishPartialResponse.status === 'success' &&
        publishPartialResponse.summary.failed && (
          <MessageBox
            severity="error"
            title="Some item(s) failed to publish"
            message={publishPartialResponse.summary.failed}
          />
        )}
      {publishSamplesResponse.status === 'success' &&
        publishSamplesResponse.summary.failed && (
          <MessageBox
            severity="error"
            title="Some item(s) failed to publish"
            message={publishSamplesResponse.summary.failed}
          />
        )}
      {(!includeFullPlan ||
        (includeFullPlan && publishResponse.status === 'success')) &&
        (!includePartialPlan ||
          (includePartialPlan &&
            publishPartialResponse.status === 'success')) &&
        (!includeCustomSampleTypes ||
          (includeCustomSampleTypes &&
            publishSamplesResponse.status === 'success')) &&
        publishSuccessMessage}

      {!signedIn && notLoggedInMessage}
      {(includeFullPlan || includePartialPlan) &&
        sampleCount === 0 &&
        noSamplesPublishMessage}
      {includeCustomSampleTypes && (
        <Fragment>
          {sampleTypeSelections.length === 0 && noSampleTypesPublishMessage}
          {publishSamplesMode === 'new' &&
            publishSamplesResponse.status === 'none' &&
            !sampleTableName &&
            noServiceNameMessage}
          {publishSamplesMode === 'existing' &&
            publishSamplesResponse.status === 'none' &&
            !selectedService &&
            noServiceSelectedMessage}
        </Fragment>
      )}

      {publishSamplesResponse.status === 'name-not-available' &&
        publishSamplesMode === 'new' && (
          <EditCustomSampleTypesTable
            initialStatus="name-not-available"
            onSave={(saveResults) => {
              if (!saveResults) return;

              setSampleTypesNameCheck(saveResults);
            }}
          />
        )}
      {(includeFullPlan || includePartialPlan || includeCustomSampleTypes) &&
        isPublishPlanReady &&
        isPublishSamplesReady && (
          <div css={publishButtonContainerStyles}>
            <button
              css={publishButtonStyles}
              onClick={() => setPublishButtonClicked(true)}
            >
              Publish
            </button>
          </div>
        )}
    </div>
  );
}

export default Publish;
