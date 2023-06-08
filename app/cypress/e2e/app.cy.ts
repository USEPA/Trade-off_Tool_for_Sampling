describe('Homepage', function () {
  beforeEach(function () {
    cy.loadPage(true);
  });

  it('contains placeholder text', function () {
    cy.findByText('Trade-off Tool for Sampling (TOTS)').should('be.visible');
  });

  it('verify help', function () {
    cy.findByRole('button', { name: 'OK' }).should('exist').click();
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

  it('Verify Expand Table Panel', function () {

    cy.fixture("swab.json").then((file) => {
      sessionStorage.setItem("tots_edits", JSON.stringify(file))
    });
    sessionStorage.setItem('tots_table_panel', JSON.stringify({
      "expanded": true,
      "height": 200
    }));
    cy.loadPage();

    cy.findByRole('button', { name: 'OK' }).should('exist').click();
    cy.findByRole('button', { name: 'Create Plan' }).should('exist').click();
    cy.get('#tots-table-div').children('div').children('div').first().click();
    cy.get('[aria-label="Collapse Table Panel"]').click({ force: true });
  });

});
