describe("File Panel", () => {
  beforeEach(() => {
    cy.loadPage(true);
  });

  it("Verify AlertDialog Sample Issues", () => {
    cy.findByRole("button", { name: "OK" })
      .should("exist")
      .click({ force: true });
    cy.findByRole("button", { name: "Add Data" })
      .should("exist")
      .click({ force: true });
    cy.get("#add-data-select").type("Add Layer from File{enter}");
    cy.get("#layer-type-select-input").type("Samples{enter}");
    cy.fixture("targeted_sampling.zip").then((file) => {
      cy.findByTestId("tots-dropzone").upload(file, "targeted_sampling.zip");
    });

    cy.findByText("Sample Issues");

    cy.findByRole("button", { name: "Continue" }).should("exist");
    cy.findByRole("button", { name: "Cancel" })
      .should("exist")
      .click({ force: true });

    cy.get("#layer-type-select-input").type("Reference Layer{enter}");
    cy.get("#generalize-features-input").check({ force: true });
    cy.fixture("BOTE.zip").then((file) => {
      cy.findByTestId("tots-dropzone").upload(file, "BOTE.zip");
    });
  });
});
