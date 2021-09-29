describe("Create Plan Drop Down Contents", function () {
  const sampleSelectId = "#sampling-layer-select";
  const aoiSelectId = "#aoi-mask-select";
  const legendId = "#legend-container";

  const planName = "Test Plan";

  beforeEach(function () {
    // clear session storage and open the app
    sessionStorage.clear();
    cy.visit("/");

    // close the splash screen
    cy.findByText("OK").click();

    // go to the create plan tab
    cy.findByText("Create Plan").click();

    // create a plan
    cy.findByPlaceholderText("Enter Plan Name").type(planName);
    cy.findByText("Save").click();

    // open the legend widget
    cy.findByText("Legend").click();
  });

  it("drop down has default samling layer and legend does not", function () {
    const layerName = "Default Sample Layer";

    // check the legend contents
    cy.findByTitle("Expand").click();
    cy.get(legendId).contains(layerName).should("be.visible");

    // check the dropdown contents
    cy.get(sampleSelectId).contains(layerName);
  });
});
