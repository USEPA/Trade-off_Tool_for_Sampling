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

// --- styles (Publish) ---
const panelContainer = css`
  padding: 20px;
`;

const submitButtonStyles = css`
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

  // Run the publish
  const [publishResponse, setPublishResponse] = React.useState<PublishType>({
    status: 'none',
    summary: { success: '', failed: '' },
    rawData: null,
  });
  React.useEffect(() => {
    if (!oAuthInfo) return;
    if (!sketchLayer || !publishButtonClicked) return;

    setPublishButtonClicked(false);

    // have the user login if necessary
    if (!portal || !signedIn) {
      setGoToOptions({ continuePublish: true });
      IdentityManager.getCredential(`${oAuthInfo.portalUrl}/sharing`);
      return;
    }

    setPublishResponse({
      status: 'fetching',
      summary: { success: '', failed: '' },
      rawData: null,
    });

    // check if the service (scenario) name is availble before continuing
    isServiceNameAvailable(portal, sketchLayer.scenarioName)
      .then((res: any) => {
        if (!res.available) {
          setPublishResponse({
            status: 'name-not-available',
            summary: { success: '', failed: '' },
            rawData: null,
          });
          return;
        }

        const layerEdits = edits.edits.filter(
          (editLayer) =>
            editLayer.id === sketchLayer.id &&
            editLayer.name === sketchLayer.name,
        );

        publish({
          portal,
          layers: [sketchLayer],
          edits: layerEdits,
        })
          .then((res: any) => {
            // get totals
            const totals = {
              added: 0,
              updated: 0,
              deleted: 0,
              failed: 0,
            };
            res.forEach((layerRes: any) => {
              // need to loop through each array and check the success flag
              if (layerRes.addResults) {
                layerRes.addResults.forEach((item: any) => {
                  item.success ? (totals.added += 1) : (totals.failed += 1);
                });
              }
              if (layerRes.updateResults) {
                layerRes.updateResults.forEach((item: any) => {
                  item.success ? (totals.updated += 1) : (totals.failed += 1);
                });
              }
              if (layerRes.deleteResults) {
                layerRes.deleteResults.forEach((item: any) => {
                  item.success ? (totals.deleted += 1) : (totals.failed += 1);
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
          })
          .catch((err) => {
            console.error('publish error: ', err);
            setPublishResponse({
              status: 'fetch-failure',
              summary: { success: '', failed: '' },
              rawData: err,
            });
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
    portal,
    oAuthInfo,
    setGoToOptions,
    signedIn,
    sketchLayer,
    publishButtonClicked,
  ]);

  return (
    <div css={panelContainer}>
      <h2>Publish</h2>

      <div css={sectionContainer}>
        <p css={layerInfo}>
          <strong>Layer Name: </strong>
          {sketchLayer?.name}
        </p>
        {publishResponse.status === 'name-not-available' && (
          <EditLayerMetaData
            initialStatus="name-not-available"
            onSave={(status) => {
              // don't do anything for these statuses
              if (status !== 'success') return;

              setPublishResponse({
                status: 'none',
                summary: { success: '', failed: '' },
                rawData: null,
              });
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
      {publishResponse.status === 'fetch-failure' && (
        <MessageBox
          severity="error"
          title="Web Service Error"
          message="An error occurred in the web service"
        />
      )}
      {publishResponse.status === 'success' && (
        <React.Fragment>
          {publishResponse.summary.success && (
            <MessageBox
              severity="info"
              title="Publish Succeeded"
              message={publishResponse.summary.success}
            />
          )}
          {publishResponse.summary.failed && (
            <MessageBox
              severity="error"
              title="Some item(s) failed to publish"
              message={publishResponse.summary.failed}
            />
          )}
        </React.Fragment>
      )}
      <div>
        <button
          css={submitButtonStyles}
          onClick={() => setPublishButtonClicked(true)}
        >
          Publish
        </button>
      </div>
    </div>
  );
}

export default Publish;
