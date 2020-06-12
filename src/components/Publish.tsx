/** @jsx jsx */

import React from 'react';
import { jsx, css } from '@emotion/core';
// components
import EditLayerMetaData from 'components/EditLayerMetaData';
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
// types
import { DeleteFeatureType, FeatureEditsType } from 'types/Edits';
// config
import {
  notLoggedInMessage,
  pulblishSuccessMessage,
  webServiceErrorMessage,
} from 'config/errorMessages';

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
  rawData: any;
};

function Publish() {
  const { IdentityManager } = useEsriModulesContext();
  const {
    oAuthInfo,
    portal,
    signedIn, //
  } = React.useContext(AuthenticationContext);
  const { goToOptions, setGoToOptions } = React.useContext(NavigationContext);
  const {
    edits,
    setEdits,
    setLayers,
    sketchLayer, //
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
      !sketchLayer ||
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

    if (sketchLayer.status === 'edited') {
      setHasNameBeenChecked(true);
      return;
    }

    // check if the service (scenario) name is availble before continuing
    isServiceNameAvailable(portal, sketchLayer.scenarioName)
      .then((res: any) => {
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
          rawData: err,
        });
      });
  }, [portal, sketchLayer, publishButtonClicked, hasNameBeenChecked]);

  // Run the publish
  const [publishResponse, setPublishResponse] = React.useState<PublishType>({
    status: 'none',
    summary: { success: '', failed: '' },
    rawData: null,
  });
  React.useEffect(() => {
    if (!oAuthInfo || !portal || !signedIn) return;
    if (!sketchLayer || !publishButtonClicked || !hasNameBeenChecked) return;

    setPublishButtonClicked(false);

    setPublishResponse({
      status: 'fetching',
      summary: { success: '', failed: '' },
      rawData: null,
    });

    const layerEditsIndex = edits.edits.findIndex(
      (editLayer) => editLayer.layerId === sketchLayer.layerId,
    );
    if (layerEditsIndex === -1) return;

    const layerEdits = edits.edits[layerEditsIndex];

    publish({
      portal,
      layers: [sketchLayer],
      edits: [layerEdits],
    })
      .then((res: any) => {
        // get totals
        const totals = {
          added: 0,
          updated: 0,
          deleted: 0,
          failed: 0,
        };
        const newAdds: FeatureEditsType[] = [];
        const newUpdates: FeatureEditsType[] = [];
        const newDeletes: DeleteFeatureType[] = [];
        let newPublished = layerEdits.published;

        const layerRes: any = res[0];
        // need to loop through each array and check the success flag
        if (layerRes.addResults) {
          layerRes.addResults.forEach((item: any, index: number) => {
            item.success ? (totals.added += 1) : (totals.failed += 1);

            // update the edits arrays
            const origItem = layerEdits.adds[index];
            if (item.success) {
              origItem.attributes.OBJECTID = item.objectId;
              origItem.attributes.GLOBALID = item.globalId;

              newPublished.push(origItem);

              // update the graphic on the map
              if (sketchLayer.sketchLayer.type === 'graphics') {
                const graphic = sketchLayer.sketchLayer.graphics.find(
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
              newAdds.push(origItem);
            }
          });
        }
        if (layerRes.updateResults) {
          layerRes.updateResults.forEach((item: any, index: number) => {
            item.success ? (totals.updated += 1) : (totals.failed += 1);

            // update the edits arrays
            const origItem = layerEdits.updates[index];
            if (item.success) {
              origItem.attributes.OBJECTID = item.objectId;
              origItem.attributes.GLOBALID = item.globalId;

              // find the item in published
              const index = newPublished.findIndex(
                (pubItem) =>
                  pubItem.attributes.PERMANENT_IDENTIFIER ===
                  origItem.attributes.PERMANENT_IDENTIFIER,
              );

              // update the item in newPublished
              if (index > -1) {
                newPublished = [
                  ...newPublished.slice(0, index),
                  origItem,
                  ...newPublished.slice(index + 1),
                ];
              }

              // update the graphic on the map
              if (sketchLayer.sketchLayer.type === 'graphics') {
                const graphic = sketchLayer.sketchLayer.graphics.find(
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
              newUpdates.push(origItem);
            }
          });
        }
        if (layerRes.deleteResults) {
          layerRes.deleteResults.forEach((item: any, index: number) => {
            item.success ? (totals.deleted += 1) : (totals.failed += 1);

            // update the edits delete array
            const origItem = layerEdits.deletes[index];
            if (item.success) {
              // find the item in published
              const pubIndex = newPublished.findIndex(
                (pubItem) =>
                  pubItem.attributes.PERMANENT_IDENTIFIER ===
                  origItem.PERMANENT_IDENTIFIER,
              );

              // update the item in newPublished
              if (pubIndex > -1) {
                newPublished = [
                  ...newPublished.slice(0, pubIndex),
                  ...newPublished.slice(pubIndex + 1),
                ];
              }
            } else {
              newDeletes.push(origItem);
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
          const editedLayer = edits.edits[layerEditsIndex];
          editedLayer.status = 'published';
          editedLayer.adds = newAdds;
          editedLayer.updates = newUpdates;
          editedLayer.deletes = newDeletes;
          editedLayer.published = newPublished;

          return {
            count: edits.count + 1,
            edits: [
              ...edits.edits.slice(0, layerEditsIndex),
              editedLayer,
              ...edits.edits.slice(layerEditsIndex + 1),
            ],
          };
        });

        // updated the edited layer
        setLayers((layers) => {
          const editedLayerIndex = layers.findIndex(
            (layer) => layer.layerId === sketchLayer.layerId,
          );
          const editedLayer = layers[editedLayerIndex];
          editedLayer.status = 'published';

          return [
            ...layers.slice(0, editedLayerIndex),
            editedLayer,
            ...layers.slice(editedLayerIndex + 1),
          ];
        });
      })
      .catch((err) => {
        console.error('isServiceNameAvailable error', err);
        setPublishResponse({
          status: 'fetch-failure',
          summary: { success: '', failed: '' },
          rawData: err,
        });
      });
  }, [
    IdentityManager,
    edits,
    setEdits,
    setLayers,
    portal,
    oAuthInfo,
    setGoToOptions,
    signedIn,
    sketchLayer,
    publishButtonClicked,
    hasNameBeenChecked,
  ]);

  return (
    <div css={panelContainer}>
      <h2>Publish</h2>

      <div css={sectionContainer}>
        <p>
          Publish the created plan to ArcGIS Online. A hosted feature layer is
          created in your ArcGIS Online organization account. By default, only
          you and the administrator can access the feature layer created. To
          allow others to access it, via Collector or Survey123 for example,{' '}
          <a
            href="https://doc.arcgis.com/en/arcgis-online/share-maps/share-items.htm"
            target="_blank"
            rel="noopener noreferrer"
          >
            share
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
          .
        </p>
        <p css={layerInfo}>
          <strong>Layer Name: </strong>
          {sketchLayer?.label}
        </p>
        {publishResponse.status === 'name-not-available' && (
          <EditLayerMetaData
            buttonText="Publish"
            initialStatus="name-not-available"
            onSave={(status) => {
              // let the component handle all statuses except for success
              if (status !== 'success') return;

              setPublishButtonClicked(true);
            }}
          />
        )}
        {publishResponse.status !== 'name-not-available' && (
          <React.Fragment>
            <p css={layerInfo}>
              <strong>Scenario Name: </strong>
              {sketchLayer?.scenarioName}
            </p>
            <p css={layerInfo}>
              <strong>Scenario Description: </strong>
              <ShowLessMore
                text={sketchLayer?.scenarioDescription}
                charLimit={20}
              />
            </p>
          </React.Fragment>
        )}
      </div>

      {publishResponse.status === 'fetching' && <LoadingSpinner />}
      {publishResponse.status === 'fetch-failure' && webServiceErrorMessage}
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
        pulblishSuccessMessage}
      {!signedIn && notLoggedInMessage}
      {publishResponse.status !== 'name-not-available' &&
        sketchLayer &&
        sketchLayer.status !== 'published' && (
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
