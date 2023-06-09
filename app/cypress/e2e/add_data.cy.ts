describe("Add Data", function () {
  const dropzoneId = "tots-dropzone";
  const loadingSpinnerId = "tots-loading-spinner";
  const layerSelectId = "#layer-type-select";
  const sampleType = "Samples";
  const contaminationType = "Contamination Map";
  const aoiType = "Area of Interest";
  const successText = "Upload Succeeded";
  const failureText = "Unknown Sample Type";
  const timeout = 120000; // file upload timeout
  const sampleName = "targeted_sampling.zip";
  const contaminationName = "Contamination.zip";
  const aoiName = "BOTE.zip";
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

  function goToFileUpload() {
    // go to the file upload panel of the add data tab
    cy.findByRole("button", { name: "Add Data" })
      .should("exist")
      .click({ force: true });
    cy.get("#add-data-select").type("Add Layer from Fi", { force: true });
    cy.findByText("Add Layer from File").click();
  }

  function enableTrainingMode() {
    cy.findByTestId("locateSamples").click();
    cy.findByRole("button", { name: "Settings" }).click({ force: true });
    cy.findAllByRole("switch").first().click({ force: true });
  }

  beforeEach(function () {
    cy.loadPage(true);

    // close the splash screen
    cy.findByRole("button", { name: "OK" }).should("exist").click();

    goToFileUpload();
  });

  it("ensure the fixtures are loaded", function () {
    expect(samplesFile).to.not.equal(undefined);
    expect(contaminationMapFile).to.not.equal(undefined);
    expect(aoiFile).to.not.equal(undefined);
  });

  it("test file upload error messages", function () {
    // select samples layer type, upload the contamination map file,
    // wait for it to finish and check for failure
    cy.get(layerSelectId).click();
    cy.findByText(sampleType).click();
    cy.findByTestId(dropzoneId).upload(contaminationMapFile, sampleName);
    cy.findAllByTestId(loadingSpinnerId, { timeout }).should("exist");
    cy.findAllByTestId(loadingSpinnerId, { timeout }).should("not.exist");
    cy.findByText(failureText).should("exist");

    // select contamination map layer type, upload the samples file,
    // wait for it to finish and check for failure
    enableTrainingMode();
    goToFileUpload();
    cy.get(layerSelectId).click();
    cy.findByText(contaminationType).click();
    cy.findByTestId(dropzoneId).upload(samplesFile, sampleName);
    cy.findByText("Cancel").click();
    cy.findAllByTestId(loadingSpinnerId, { timeout }).should("not.exist");
    cy.findByText("Upload Canceled").should("exist");
  });

  it("test uploading multiple files of different layer types", function () {
    // select samples layer type, upload the sample file,
    // wait for it to finish and check for success
    cy.get(layerSelectId).click();
    cy.findByText(sampleType).click();
    cy.findByTestId(dropzoneId).upload(samplesFile, sampleName);
    cy.findByText("Continue").click();
    cy.findAllByTestId(loadingSpinnerId, { timeout }).should("exist");
    cy.findAllByTestId(loadingSpinnerId, { timeout }).should("not.exist");
    cy.findByText(successText).should("exist");

    // select contamination map layer type, upload the contamination map file,
    // wait for it to finish and check for success
    enableTrainingMode();
    goToFileUpload();
    cy.get(layerSelectId).click();
    cy.findByText(contaminationType).click();
    cy.findByTestId(dropzoneId).upload(contaminationMapFile, contaminationName);
    cy.findAllByTestId(loadingSpinnerId, { timeout }).should("exist");
    cy.findAllByTestId(loadingSpinnerId, { timeout }).should("not.exist");
    cy.findByText(successText).should("exist");

    // select area of interest layer type, upload the aoi file,
    // wait for it to finish and check for success
    cy.get(layerSelectId).click();
    cy.findByText(aoiType).click();
    cy.findByTestId(dropzoneId).upload(aoiFile, aoiName);
    cy.findAllByTestId(loadingSpinnerId, { timeout }).should("exist");
    cy.findAllByTestId(loadingSpinnerId, { timeout }).should("not.exist");
    cy.findByText(successText).should("exist");
  });

  it("Verify geo.json file upload", function () {
    cy.get("#layer-type-select-input").type("Reference{enter}");

    const fileName = "testing_geojson.geo.json";
    cy.fixture(fileName).then((file) => {
      cy.findByTestId("tots-dropzone").upload(file, fileName, "json");
    });
    cy.findAllByTestId(loadingSpinnerId, { timeout }).should("exist");
    cy.findAllByTestId(loadingSpinnerId, { timeout }).should("not.exist");
    cy.findByText(`"${fileName}" was successfully uploaded`).should("exist");
  });

  it("Verify geojson file upload", function () {
    cy.get("#layer-type-select-input").type("Reference{enter}");

    const fileName = "testing_geojson.geojson";
    cy.fixture(fileName).then((file) => {
      cy.findByTestId("tots-dropzone").upload(file, fileName, "geojson");
    });
    cy.findAllByTestId(loadingSpinnerId, { timeout }).should("exist");
    cy.findAllByTestId(loadingSpinnerId, { timeout }).should("not.exist");
    cy.findByText(`"${fileName}" was successfully uploaded`).should("exist");
  });

  it("Verify kml file upload", function () {
    cy.get("#layer-type-select-input").type("Reference{enter}");

    const fileName = "2.5_month_age_animated.kml";
    cy.fixture(fileName).then((file) => {
      cy.findByTestId("tots-dropzone").upload(file, fileName, "kml");
    });
    cy.findAllByTestId(loadingSpinnerId, { timeout }).should("exist");
    cy.findAllByTestId(loadingSpinnerId, { timeout }).should("not.exist");
    cy.findByText(`"${fileName}" was successfully uploaded`).should("exist");
  });

  it("Verify .gpx file upload", function () {
    cy.get("#layer-type-select-input").type("Reference{enter}");

    const fileName = "testing_gpx.gpx";
    cy.fixture(fileName).then((file) => {
      cy.findByTestId("tots-dropzone").upload(file, fileName, "gpx");
    });
    cy.findAllByTestId(loadingSpinnerId, { timeout }).should("exist");
    cy.findAllByTestId(loadingSpinnerId, { timeout }).should("not.exist");
    cy.findByText(`"${fileName}" was successfully uploaded`).should("exist");
  });
});
