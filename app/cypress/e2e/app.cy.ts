describe('Homepage', function () {
  beforeEach(function () {
    // clear session storage and open the app
    sessionStorage.clear();
    cy.visit('/');
  });

  it('contains placeholder text', function () {
    cy.findByText('Trade-off Tool for Sampling (TOTS)').should('be.visible');
  });

  it('verify help', function () {
    cy.findByRole('button', { name: 'OK' }).click();
    cy.findByRole('button', { name: 'Help' }).should('exist').click();
    cy.findByRole('dialog').should('be.visible');
    cy.findByText('Getting Started').should('exist');
    cy.findByRole('dialog').contains('a', 'TOTS User’s Guide (PDF)').should('have.attr', 'href').and('include', '/data/documents/TOTS-Users-Guide.pdf');
    cy.findByRole('button', { name: 'Close' }).should('exist').click();
    cy.findByRole('dialog').should('not.exist');
  });

  it('verify splash screen cookies', function () {
    cy.findByRole('dialog').should('be.visible');
    cy.get('#splash-screen-toggle').click();
    cy.findByRole('button', { name: 'OK' }).click();
    cy.visit('/');
    cy.findByRole('dialog').should('not.exist');
  });

});
