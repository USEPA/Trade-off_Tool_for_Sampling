describe("Testing Tools", function () {
  beforeEach(function () {
    const location = window.location;
    const origin =
      location.hostname === "localhost"
        ? `${location.protocol}//${location.hostname}:3000`
        : window.location.origin;

    cy.loadPage(true, `${origin}?devMode=true`);
  });

  it("Verify buttons", function () {
    cy.findByRole("button", { name: "OK" })
      .should("exist")
      .click({ force: true });
    cy.findByRole("button", { name: "Log Map" })
      .should("exist")
      .click({ force: true });
    cy.findByRole("button", { name: "Log Views" })
      .should("exist")
      .click({ force: true });
    cy.findByRole("button", { name: "Log Layers" })
      .should("exist")
      .click({ force: true });
    cy.findByRole("button", { name: "Log SketchVM" })
      .should("exist")
      .click({ force: true });
    cy.findByRole("button", { name: "Clear Session Data" })
      .should("exist")
      .click({ force: true });
  });
});
