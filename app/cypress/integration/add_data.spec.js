describe('Add Data', function () {
  const dropzoneId = 'tots-dropzone';
  const loadingSpinnerId = 'tots-loading-spinner';
  const layerSelectId = '#layer-type-select';
  const sampleType = 'Samples';
  const contaminationType = 'Contamination Map';
  const aoiType = 'Area of Interest';
  const successText = 'Upload Succeeded';
  const failureText = 'Missing Required Attributes';
  const timeout = 20000; // file upload timeout
  const sampleName = 'targeted_sampling.zip';
  const contaminationName = 'Contamination.zip';
  const aoiName = 'BOTE.zip';
  let samplesFile, contaminationMapFile, aoiFile;

  // load in the fixtures first
  before(function () {
    cy.fixture(sampleName).then((file) => {
      samplesFile = file;
    });

    cy.fixture(contaminationName).then((file) => {
      contaminationMapFile = file;
    });

    cy.fixture(aoiName).then((file) => {
      aoiFile = file;
    });
  });

  beforeEach(function () {
    // ensure the fixtures are loaded
    expect(samplesFile).to.not.equal(undefined);
    expect(contaminationMapFile).to.not.equal(undefined);
    expect(aoiFile).to.not.equal(undefined);

    // clear session storage and open the app
    sessionStorage.clear();
    cy.visit('/');

    // close the splash screen
    cy.findByText('OK').click();

    // go to the file upload panel of the add data tab
    cy.findByText('Add Data').click();
    cy.get('#add-data-select').click();
    cy.findByText('Add Layer from File').click();
  });

  it('test file upload error messages', function () {
    // select samples layer type, upload the contamination map file,
    // wait for it to finish and check for failure
    cy.get(layerSelectId).click();
    cy.findByText(sampleType).click();
    cy.findByTestId(dropzoneId).upload(contaminationMapFile, sampleName);
    cy.findAllByTestId(loadingSpinnerId, { timeout }).should('not.exist');
    cy.findByText(failureText).should('exist');

    // select contamination map layer type, upload the samples file,
    // wait for it to finish and check for failure
    cy.get(layerSelectId).click();
    cy.findByText(contaminationType).click();
    cy.findByTestId(dropzoneId).upload(samplesFile, sampleName);
    cy.findAllByTestId(loadingSpinnerId, { timeout }).should('not.exist');
    cy.findByText(failureText).should('exist');
  });

  it('test uploading multiple files of different layer types', function () {
    // select samples layer type, upload the sample file,
    // wait for it to finish and check for success
    cy.get(layerSelectId).click();
    cy.findByText(sampleType).click();
    cy.findByTestId(dropzoneId).upload(samplesFile, sampleName);
    cy.findAllByTestId(loadingSpinnerId, { timeout }).should('not.exist');
    cy.findByText(successText).should('exist');

    // select contamination map layer type, upload the contamination map file,
    // wait for it to finish and check for success
    cy.get(layerSelectId).click();
    cy.findByText(contaminationType).click();
    cy.findByTestId(dropzoneId).upload(contaminationMapFile, contaminationName);
    cy.findAllByTestId(loadingSpinnerId, { timeout }).should('not.exist');
    cy.findByText(successText).should('exist');

    // select area of interest layer type, upload the aoi file,
    // wait for it to finish and check for success
    cy.get(layerSelectId).click();
    cy.findByText(aoiType).click();
    cy.findByTestId(dropzoneId).upload(aoiFile, aoiName);
    cy.findAllByTestId(loadingSpinnerId, { timeout }).should('not.exist');
    cy.findByText(successText).should('exist');
  });
});
