/** @jsxImportSource @emotion/react */

import React from 'react';
import { css } from '@emotion/react';
// components
import MessageBox from 'components/MessageBox';
import ShowLessMore from 'components/ShowLessMore';
// config
import { SampleIssuesOutput } from 'config/sampleAttributes';
// types
import { ErrorType } from 'types/Misc';

const textAreaStyles = css`
  height: 200px;
  width: 100%;
`;

export const unsupportedBrowserMessage = (
  <MessageBox
    severity="error"
    title="Unsupported Browser"
    message="Chrome and Edge are the preferred browsers when working in Trade-off Tool for Sampling (TOTS). TOTS does not support Internet Explorer."
  />
);

export const webServiceErrorMessage = (
  error: ErrorType = {
    error: {},
    message: 'An error occurred in the web service',
  },
  title: string = 'Web Service Error',
) => {
  const id = `error-copy-input-${Date.now() + Math.random()}`;

  return (
    <MessageBox
      severity="error"
      title={title}
      message={
        <React.Fragment>
          <span>{error.message}</span>
          <br />
          <ShowLessMore
            text={
              <textarea
                id={id}
                css={textAreaStyles}
                value={JSON.stringify(error, null, '\t')}
              />
            }
            charLimit={0}
          />
          <br />
          <button
            onClick={() => {
              // get the text area input
              const textArea = document.getElementById(id) as HTMLInputElement;
              if (!textArea) return;

              // select all of the text
              textArea.select();

              // copy the text to the clipboard
              document.execCommand('copy');
            }}
          >
            Copy Detailed Error
          </button>
        </React.Fragment>
      }
    />
  );
};

export const errorBoundaryMessage = (
  <MessageBox
    severity="error"
    title="Error"
    message={
      <React.Fragment>
        Something went wrong. Please contact the application owner, Timothy Boe,
        at <a href="mailto:boe.timothy@epa.gov.">boe.timothy@epa.gov.</a>.
        Please include as much detail related to the sequence of interactions
        that triggered the error with your message.
      </React.Fragment>
    }
  />
);

export const notLoggedInMessage = (
  <MessageBox
    severity="warning"
    title="Not Logged In"
    message="Please login to use this feature"
  />
);

// add data tab - url panel messages
export const urlLayerSuccessMessage = (
  <MessageBox
    severity="info"
    title="Success"
    message="The layer was successfully added to the map"
  />
);

export const urlLayerFailureMessage = (url: string) => (
  <MessageBox
    severity="error"
    title="Failed to Add Layer"
    message={`Failed to add the layer at the following url: ${url}`}
  />
);

export const unsupportedLayerMessage = (layerType: string) => (
  <MessageBox
    severity="error"
    title="Unsupported layer type"
    message={`The "${layerType}" layer type is unsupported`}
  />
);

export const urlAlreadyAddedMessage = (url: string) => (
  <MessageBox
    severity="warning"
    title="URL Already Added"
    message={`The "${url}" has already been added. If you want to change the type, please remove the layer first and re-add it.`}
  />
);

// add data tab - file upload messages
export const invalidFileTypeMessage = (filename: string) => (
  <MessageBox
    severity="error"
    title="Invalid File Type"
    message={`${filename} is an invalid file type. The accepted file types are .zip, .csv, .kml, .gpx, .goe.json and .geojson`}
  />
);

export const fileReadErrorMessage = (filename: string) => (
  <MessageBox
    severity="error"
    title="File Read Error"
    message={`Failed to read the ${filename} file. Check the console log for details.`}
  />
);

export const noDataMessage = (filename: string) => (
  <MessageBox
    severity="error"
    title="No Data"
    message={`The ${filename} file did not have any data to display on the map`}
  />
);

export const userCanceledMessage = (filename: string) => (
  <MessageBox
    severity="error"
    title="Upload Canceled"
    message={`The ${filename} upload was canceled by the user`}
  />
);

export const missingAttributesMessage = (
  filename: string,
  missingAttributes: string,
) => (
  <MessageBox
    severity="error"
    title="Missing Required Attributes"
    message={`Features in the ${filename} are missing the following required attributes: ${missingAttributes}`}
  />
);

export const unknownSampleTypeMessage = (
  <MessageBox
    severity="error"
    title="Unknown Sample Type"
    message="An unknown sample type was found. Please use one of the sample types recognized by TOTS (Swab, Sponge, Micro Vac, Wet Vac, or Aggressive Air)."
  />
);

export const uploadSuccessMessage = (
  filename: string,
  layerName: string = '',
) => {
  return filename === layerName ? (
    <MessageBox
      severity="info"
      title="Upload Succeeded"
      message={`"${filename}" was successfully uploaded`}
    />
  ) : (
    <MessageBox
      severity="info"
      title="Upload Succeeded"
      message={`"${filename}" was successfully uploaded as "${layerName}"`}
    />
  );
};

export const sampleIssuesPopupMessage = (
  output: SampleIssuesOutput,
  areaTolerance: number,
) => {
  let message = '';
  if (output.areaOutOfTolerance) {
    message += `The surface area associated with some of your samples is outside of the allowable tolerance (+- ${areaTolerance} sqin) of the provided reference area. TOTS will adjust the representation of each of your samples to account for the difference. `;
  }
  if (output.attributeMismatch) {
    message +=
      'There is a mismatch between attributes. The attributes will need to be updated to continue. ';
  }
  message += 'Would you like to continue?';

  return message;
};

// create plan tab
export const cantUseWithVspMessage = (
  <MessageBox
    severity="warning"
    title="Cannot Use With VSP"
    message="Multiple Random Samples cannot be used in combination with VSP-Created Sampling Plans"
  />
);

export const generateRandomExceededTransferLimitMessage = (
  <MessageBox
    severity="error"
    title="Exceeded Transfer Limit"
    message="The request exceeded the transfer limit of the GP Server. Please reduce the number of samples and try again."
  />
);

export const generateRandomSuccessMessage = (
  numSamples: number,
  layerName: string,
) => (
  <MessageBox
    severity="info"
    title="Samples Added"
    message={`${numSamples} samples added to the "${layerName}" layer`}
  />
);

// calculate resources tab
export const noContaminationMapMessage = (
  <MessageBox
    severity="error"
    title="No Contamination Map Found"
    message="Return to Create Plan and add and/or select a contamination map"
  />
);

export const noSampleLayerMessage = (
  <MessageBox
    severity="error"
    title="No Samples"
    message="No sample layer has been selected. Please go to the Create Plan tab, select a layer and try again."
  />
);

export const noSamplesMessage = (
  <MessageBox
    severity="error"
    title="No Samples"
    message="There are no samples to run calculations on"
  />
);

export const noContaminationGraphicsMessage = (
  <MessageBox
    severity="error"
    title="No Features In Contamination Map"
    message="There are no features in the contamination map to run calculations on"
  />
);

export const contaminationHitsSuccessMessage = (numberOfHits: number) => (
  <MessageBox
    severity="info"
    title="Contamination Hits"
    message={`${numberOfHits} sample(s) placed in contaminated areas`}
  />
);

export const userDefinedValidationMessage = (
  message: JSX.Element[] | string,
) => (
  <MessageBox severity="error" title="Validation Failure" message={message} />
);

// calculate results panel
export const screenshotFailureMessage = (
  <MessageBox
    severity="error"
    title="Download Error"
    message="An error occurred while taking a screenshot of the map."
  />
);

export const base64FailureMessage = (
  <MessageBox
    severity="error"
    title="Download Error"
    message="An error occurred while converting the map screenshot."
  />
);

export const excelFailureMessage = (
  <MessageBox
    severity="error"
    title="Download Error"
    message="An error occurred while creating the excel document."
  />
);

export const downloadSuccessMessage = (
  <MessageBox
    severity="info"
    title="Success"
    message="The file was successfully downloaded."
  />
);

// publish plan tab
export const noSamplesPublishMessage = (
  <MessageBox
    severity="warning"
    title="No Samples to Publish"
    message="There are no samples to publish. Please add some samples to the plan and try again."
  />
);

export const noSampleTypesPublishMessage = (
  <MessageBox
    severity="warning"
    title="No Custom Sample Types Exist"
    message="There are no custom sample types created and/or loaded. Please add custom sample types to the plan and try again."
  />
);

export const noServiceSelectedMessage = (
  <MessageBox
    severity="warning"
    title="No Service Selected"
    message="There is no feature service selected to publish the custom sample types to. Please select a feature service and try again."
  />
);

export const noServiceNameMessage = (
  <MessageBox
    severity="warning"
    title="No Service Name Provided"
    message="No feature service name provided for publishing the custom sample types. Please provide a feature service name and try again."
  />
);

export const publishSuccessMessage = (
  <MessageBox
    severity="info"
    title="Publish Succeeded"
    message={
      'To view or share your TOTS content with others, go to the ' +
      'My Content menu in the Content section of your ArcGIS ' +
      'Online organization.'
    }
  />
);

// scenario name / description component messages
export const scenarioNameTakenMessage = (scenarioName: string) => (
  <MessageBox
    severity="warning"
    title="Plan Name Not Available"
    message={`The "${scenarioName}" name is already in use within your organization. Please rename the plan and try again.`}
  />
);

export const featureServiceTakenMessage = (serviceName: string) => (
  <MessageBox
    severity="warning"
    title="Feature Service Name Not Available"
    message={`The "${serviceName}" name is already in use. Please rename the feature service and try again.`}
  />
);

// feature not availble messages
export const featureNotAvailableMessage = (featureName: string) => (
  <MessageBox
    severity="error"
    title="Feature Not Available"
    message={`The "${featureName}" is unavailble, please try again later.`}
  />
);
