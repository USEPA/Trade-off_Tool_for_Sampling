/** @jsx jsx */
import { jsx } from '@emotion/core';
// components
import MessageBox from 'components/MessageBox';

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
  if (!layerName) {
    return (
      <MessageBox
        severity="info"
        title="Upload Succeeded"
        message={`"${filename}" was successfully uploaded`}
      />
    );
  }

  return (
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

// scenario name / description component messages
export const scenarioNameTakenMessage = (scenarioName: string) => (
  <MessageBox
    severity="warning"
    title="Scenario Name Not Available"
    message={`The "${scenarioName}" name is already in use. Please rename the scenario and try again.`}
  />
);
