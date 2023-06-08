describe("Alert message tests", () => {
  beforeEach(() => { });

  const notificationMessage =
    "There will be scheduled maintenance on the geopub.epa.gov services on Thursday, July 16th starting at 8am and ending at 11am.";
  const urlInterceptPath = "@notifications-messages";

  it("Verify notification does not appear", () => {
    cy.visit("/");

    cy.findByTestId("all-pages-notifications-banner").should("not.exist");
  });

  it("Verify notifications on the home page", () => {
    const location = window.location;
    const origin = `${location.protocol}//${location.hostname}:9091`;

    cy.intercept(
      `${origin}/proxy?url=${origin}/data/notifications/messages.json`,
      {
        statusCode: 200,
        body: {
          color: "#721c24",
          backgroundColor: "#f8d7da",
          message:
            '<p>There will be <a href="https://www.epa.gov" target="_blank">scheduled maintenance</a> on the <strong>geopub.epa.gov</strong> services on Thursday, July 16th starting at 8am and ending at 11am.</p>',
        },
      }
    ).as("notifications-messages");

    cy.visit("/");

    cy.wait(urlInterceptPath);

    cy.findByTestId("all-pages-notifications-banner")
      .should("exist")
      .contains(notificationMessage);
  });

  it('Verify Error message', () => {
    cy.loadPage(true);
    cy.findByRole('button', { name: 'OK' }).should('exist').click({ force: true });

    cy.findByRole('button', { name: 'Add Data' }).should('exist').click({ force: true });
    cy.get('#add-data-select').type('Add Layer from Web{enter}');
    cy.get('#url-type-select').type('An ArcGIS Server{enter}');
    cy.findByRole('button', { name: 'ADD' }).click({ force: true });
    cy.findByText('Failed to Add Layer');
  });
});
