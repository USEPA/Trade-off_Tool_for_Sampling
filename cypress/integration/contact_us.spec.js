describe('Links', () => {
  const linkText = 'Contact Us';
  const href =
    'https://www.epa.gov/homeland-security-research/forms/contact-us-about-homeland-security-research';

  beforeEach(function () {
    cy.visit('/');
  });

  it('Clicking the "Contact Us" toolbar button opens a new tab with the contact us page.', () => {
    // close the splash screen
    cy.findByText('OK').click();

    // since Cypress doesn't support multiple tabs, we'll do the next best thing
    // (https://docs.cypress.io/guides/references/trade-offs.html#Multiple-tabs)
    const toolbarId = 'tots-toolbar';
    cy.findByTestId(toolbarId)
      .findByText(linkText)
      .should('have.attr', 'href', href);
    cy.findByTestId(toolbarId)
      .findByText(linkText)
      .should('have.attr', 'target', '_blank');
    cy.findByTestId(toolbarId)
      .findByText(linkText)
      .should('have.attr', 'rel', 'noopener noreferrer');
  });

  it('Clicking the "Contact Us" link on the splash screen button opens a new tab with the contact us page.', () => {
    // since Cypress doesn't support multiple tabs, we'll do the next best thing
    // (https://docs.cypress.io/guides/references/trade-offs.html#Multiple-tabs)
    const splashId = 'tots-splash-screen';
    cy.findByTestId(splashId)
      .findByText(linkText)
      .should('have.attr', 'href', href);
    cy.findByTestId(splashId)
      .findByText(linkText)
      .should('have.attr', 'target', '_blank');
    cy.findByTestId(splashId)
      .findByText(linkText)
      .should('have.attr', 'rel', 'noopener noreferrer');
  });
});
