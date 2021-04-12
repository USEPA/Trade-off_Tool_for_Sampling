/** @jsx jsx */

import React from 'react';
import { jsx, css } from '@emotion/core';
// components
import { EditScenario } from 'components/EditLayerMetaData';
import LoadingSpinner from 'components/LoadingSpinner';
import MessageBox from 'components/MessageBox';
import ShowLessMore from 'components/ShowLessMore';
// contexts
import { useEsriModulesContext } from 'contexts/EsriModules';
import { AuthenticationContext } from 'contexts/Authentication';
import { NavigationContext } from 'contexts/Navigation';
import { SketchContext } from 'contexts/Sketch';
// utils
import { isServiceNameAvailable, publish } from 'utils/arcGisRestUtils';
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
`;

const sectionContainer = css`
  margin-bottom: 10px;
`;

const layerInfo = css`
  padding-bottom: 0.5em;
`;

// --- components (Publish) ---
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

function Publish() {
  const { GraphicsLayer, IdentityManager } = useEsriModulesContext();
  const {
    oAuthInfo,
    portal,
    signedIn, //
  } = React.useContext(AuthenticationContext);
  const { goToOptions, setGoToOptions } = React.useContext(NavigationContext);
  const {
    edits,
    setEdits,
    layers,
    setLayers,
    sketchLayer,
    selectedScenario,
  } = React.useContext(SketchContext);

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
    });
    const publishLayers: LayerType[] = publishLayer ? [publishLayer] : [];

    // build the layerEdits
    let layerEdits: LayerEditsType = {
      type: 'layer',
      id: editsScenario.id,
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
        name: editsScenario.scenarioName,
        description: editsScenario.scenarioDescription,
      },
    })
      .then((res: any) => {
        // get totals
        const totals = {
          added: 0,
          updated: 0,
          deleted: 0,
          failed: 0,
        };
        const changes: PublishResults = {};

        const layerRes: any = res[0];
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

          editsScenario.layers.forEach((editedLayer) => {
            const edits = changes[editedLayer.uuid];
            editedLayer.adds = edits.adds;
            editedLayer.updates = edits.updates;
            editedLayer.deletes = edits.deletes;
            editedLayer.published = edits.published;
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

            return {
              ...layer,
              status: 'published',
            };
          }),
        );
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
  ]);

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
          Publish the created plan to ArcGIS Online. A hosted feature layer is
          created in your ArcGIS Online organization account. By default, only
          you and the administrator can access the feature layer created. To
          allow others access to the plan, via Collector or Survey123 for
          example,{' '}
          <a
            href="https://doc.arcgis.com/en/arcgis-online/share-maps/share-items.htm"
            target="_blank"
            rel="noopener noreferrer"
          >
            share
          </a>{' '}
          <a
            className="exit-disclaimer"
            href="https://www.epa.gov/home/exit-epa"
            target="_blank"
            rel="noopener noreferrer"
          >
            EXIT
          </a>{' '}
          the layer and file with everyone (the public), your organization, or
          members of specific groups. You can edit{' '}
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
        sketchLayer?.status === 'published') &&
        publishSuccessMessage}
      {!signedIn && notLoggedInMessage}
      {sampleCount === 0 && noSamplesPublishMessage}
      {publishResponse.status !== 'name-not-available' &&
        sketchLayer &&
        sketchLayer.status !== 'published' &&
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
    </div>
  );
}

export default Publish;
