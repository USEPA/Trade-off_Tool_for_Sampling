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
    cy.fixture("targeted-sampling.zip").then((file) => {
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

  it("Verify notes in file upload", () => {
    cy.findByRole("button", { name: "OK" })
      .should("exist")
      .click({ force: true });
    cy.findByRole("button", { name: "Add Data" })
      .should("exist")
      .click({ force: true });
    cy.get("#add-data-select").type("Add Layer from File{enter}");
    cy.get("#layer-type-select-input").type("Samples{enter}");
    cy.fixture("targeted-sampling-with-notes.zip").then((file) => {
      cy.findByTestId("tots-dropzone").upload(
        file,
        "targeted-sampling-with-notes.zip"
      );
    });

    cy.findByText("Sample Issues");

    cy.findByRole("button", { name: "Continue" })
      .should("exist")
      .click({ force: true });

    cy.findByText("Upload Succeeded", { timeout: 120000 });

    // Come up with a way to check if notes were added
    cy.findByRole("button", { name: "Expand Table Panel" })
      .should("exist")
      .click();

    cy.findByText("Note Sample 35", { exact: false });
  });
});
