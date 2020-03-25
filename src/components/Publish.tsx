/** @jsx jsx */

import React from 'react';
import { jsx, css } from '@emotion/core';
// components
import LoadingSpinner from 'components/LoadingSpinner';
import MessageBox from 'components/MessageBox';
import ShowLessMore from 'components/ShowLessMore';
// contexts
import { useEsriModulesContext } from 'contexts/EsriModules';
import { AuthenticationContext } from 'contexts/Authentication';
import { SketchContext } from 'contexts/Sketch';
// utils
import { publish } from 'utils/arcGisRestUtils';

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
  status: 'none' | 'fetching' | 'success' | 'failure';
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
  const {
    edits,
    sketchLayer, //
  } = React.useContext(SketchContext);

  const [publishResponse, setPublishResponse] = React.useState<PublishType>({
    status: 'none',
    summary: { success: '', failed: '' },
    rawData: null,
  });
  function runPublish() {
    if (!oAuthInfo) return;
    if (!sketchLayer) return;

    // have the user login if necessary
    if (!portal || !signedIn) {
      IdentityManager.getCredential(`${oAuthInfo.portalUrl}/sharing`);
      return;
    }

    setPublishResponse({
      status: 'fetching',
      summary: { success: '', failed: '' },
      rawData: null,
    });

    const layerEdits = edits.edits.filter(
      (editLayer) =>
        editLayer.id === sketchLayer.id && editLayer.name === sketchLayer.name,
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
              if (item.success) totals.updated += 1;
              else totals.failed += 1;
            });
          }
          if (layerRes.deleteResults) {
            layerRes.deleteResults.forEach((item: any) => {
              if (item.success) totals.deleted += 1;
              else totals.failed += 1;
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
          status: 'failure',
          summary: { success: '', failed: '' },
          rawData: err,
        });
      });
  }

  return (
    <div css={panelContainer}>
      <h2>Publish</h2>

      <div css={sectionContainer}>
        <p css={layerInfo}>
          <strong>Layer Name: </strong>
          {sketchLayer?.name}
        </p>
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
      </div>

      {publishResponse.status === 'fetching' && <LoadingSpinner />}
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
      {publishResponse.status === 'failure' && (
        <MessageBox
          severity="error"
          title="Web Service Error"
          message="An error occurred in the web service"
        />
      )}
      <div>
        <button css={submitButtonStyles} onClick={runPublish}>
          Publish
        </button>
      </div>
    </div>
  );
}

export default Publish;
