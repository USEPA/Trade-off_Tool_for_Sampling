describe("Create Plan Drop Down Contents", function () {
  const sampleSelectId = "#sampling-layer-select";
  const aoiSelectId = "#aoi-mask-select";
  const legendId = "#legend-container";

  const planName = "Test Plan";

  beforeEach(function () {
    cy.loadPage(true);

    cy.findByRole("button", { name: "OK" }).should('exist').click({ force: true });
    cy.findByRole('button', { name: 'Create Plan' }).should('exist').click({ force: true });
    cy.get('#scenario-name-input').type(planName);
    cy.findByRole('button', { name: 'Save' }).click({ force: true });

  });

  it("drop down has default samling layer and legend does not", function () {
    const layerName = "Default Sample Layer";

    // open the legend widget
    cy.findByRole('button', { name: 'Legend' }).click({ force: true });

    // check the legend contents
    cy.findByTitle("Expand").click({ force: true });
    cy.get(legendId).contains(layerName).should("be.visible");

    // check the dropdown contents
    cy.get(sampleSelectId).contains(layerName);
  });

  it("Verify creating new custom sample type", function () {
    cy.findByText('Create Custom Sample Types').should('exist').click({ force: true });
    cy.findByTitle('Create Sample Type').click({ force: true });
    cy.findByTitle('Cancel').should('exist');
    cy.findByText('Symbology Settings').should('exist');

    cy.get('#point-style-select-input').type("Square{enter}");
    cy.get("#sample-type-name-input").type('xyz_sample_name');
    cy.get('#sa-input').type('15');
    cy.get("#shape-type-select-input").type('Polygon{enter}');
    cy.get('#ttpk-input').type('14');
    cy.get("#ttc-input").type('12');
    cy.get('#tta-input').type('10');
    cy.get("#lod_p-input").type('Limited-of-detection-Porous');
    cy.get('#lod_non-input').type('Limited-of-detection-non-Porous');
    cy.get('#mcps-input').type('50');
    cy.get("#wvps-input").type('12');
    cy.get('#wwps-input').type('10');
    cy.get("#alc-input").type('100');
    cy.get('#amc-input').type('78');

    cy.findByRole('button', { name: 'Save' }).click({ force: true });
    cy.findByTitle('Edit Sample Type').should('exist').click({ force: true });

    cy.findAllByRole('button', { name: 'Cancel' }).should('exist');
    cy.findByRole('button', { name: 'Save' }).click({ force: true });

    //Clone
    cy.findByTitle('Clone Sample Type').should('exist').click({ force: true });
    cy.findByRole('button', { name: 'Save' }).click({ force: true });
    cy.findByTitle('Draw a xyz_sample_name (1): 0').should('exist');

    //Delete 
    cy.findByTitle('Delete Sample Type').click({ force: true });
    cy.findByText('Would you like to continue?').should('exist');
    cy.findByRole('button', { name: 'Continue' }).click({ force: true });
    cy.findByTitle('Draw a xyz_sample_name (1): 0').should('not.exist');
  });

  it("Specify Plan and Active Sampling Layer section", function () {
    cy.findByTitle('Add Layer').click({ force: true });
    cy.findByText('Layer Name').should('exist');
    cy.get('#layer-name-input').type('new layer');
    cy.findByRole('button', { name: 'Save' }).click({ force: true });

    //clone
    cy.findByTitle('Clone Layer').click({ force: true });
    cy.get('#sampling-layer-select-input').type('new layer (1){enter}');

    // Link and unlink
    cy.findByTitle('Unlink Layer').click({ force: true });
    cy.findByTitle('Link Layer').click({ force: true });

    //Delete
    cy.findAllByTitle('Delete Layer').last().click({ force: true });
  });

  it("Verify Add Multiple Random Samples", function () {
    cy.fixture("sample_mask.json").then((file) => {
      sessionStorage.setItem("tots_edits", JSON.stringify(file))
    });

    cy.mapLoadDelay();

    cy.findByText('Add Multiple Random Samples').should('exist').click({ force: true });
    cy.findByText('Draw Sampling Mask');
    cy.get('#draw-aoi').click({ force: true });
    cy.findByRole('button', { name: 'Draw Sampling Mask' }).should('exist');
    cy.findByText('Use Imported Area of Interest');
    cy.get('#use-aoi-file').click({ force: true });
    cy.findByText('Area of Interest Mask').should('exist');
    cy.findByRole('button', { name: 'Add' }).should('exist');
    cy.get('#sample-type-select-input').type('wet vac{enter}');
    cy.get('#number-of-samples-input').type('55');
    cy.findByText('Use AOI Elevation').should('exist');
    cy.findByText('Snap to Ground').should('exist');

    cy.get('#draw-aoi').click({ force: true });
    cy.findByRole('button', { name: 'Submit' }).should('exist').click();
    cy.intercept('https://geopub.epa.gov/arcgis/rest/services/ORD/TOTS/GPServer/Generate%20Random/execute',).as('execute');
    cy.wait('@execute', { responseTimeout: 50000 });
    cy.findByRole('button', { name: 'Submit' }).should('not.exist');

    //Clone Plan
    cy.findByTitle('Clone Scenario').click({ force: true });

    //Delete cloned plan
    cy.findByTitle('Delete Plan').click({ force: true });

    cy.get('#Robot').click({ force: true });
    cy.get('#Robot').should('have.css', 'background-color', 'rgb(231, 246, 248)');
  });

  it("Verify start over", function () {
    cy.fixture("micro-vac.json").then((file) => {
      sessionStorage.setItem("tots_edits", JSON.stringify(file))
    })
    cy.findByRole("button", { name: "Start Over" }).should('exist').click({ force: true });
    cy.findByText('Would you like to continue?').should('exist');
    cy.findByRole('button', { name: 'Continue' }).click({ force: true });
  });

  it("Verify Delete all samples", function () {
    cy.fixture("micro-vac.json").then((file) => {
      sessionStorage.setItem("tots_edits", JSON.stringify(file))
    });
    cy.findByRole("button", { name: "Delete All Samples" }).should('exist').click({ force: true });
  });
});
