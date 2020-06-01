/** @jsx jsx */
import { jsx } from '@emotion/core';
// components
import MessageBox from 'components/MessageBox';

export const unsupportedBrowserMessage = (
  <MessageBox
    severity="error"
    title="Unsupported Browser"
    message="Chrome and Edge are the preferred browsers when working in Trade-off Tool for Sampling (TOTS). TOTS does not support Internet Explorer."
  />
);

export const webServiceErrorMessage = (
  <MessageBox
    severity="error"
    title="Web Service Error"
    message="An error occurred in the web service"
  />
);

export const errorBoundaryMessage = (
  <MessageBox
    severity="error"
    title="Error"
    message="Something went wrong. Please notify the site administrator."
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

export const importErrorMessage = (
  <MessageBox
    severity="error"
    title="Invalid File Type"
    message="Unable to import this dataset."
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
export const pulblishSuccessMessage = (
  <MessageBox
    severity="info"
    title="Publish Succeeded"
    message={
      'To view or share your plan with others, go to the ' +
      'My Content menu in the Content section of your ArcGIS ' +
      'Online organization.'
    }
  />
);

// scenario name / description component messages
export const scenarioNameTakenMessage = (scenarioName: string) => (
  <MessageBox
    severity="warning"
    title="Scenario Name Not Available"
    message={`The "${scenarioName}" name is already in use. Please rename the scenario and try again.`}
  />
);
