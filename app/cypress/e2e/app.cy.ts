describe('Homepage', function () {
  it('contains placeholder text', function () {
    cy.loadPage(true);
    cy.findByText('Trade-off Tool for Sampling (TOTS)').should('be.visible');
  });

  it('verify help', function () {
    cy.loadPage(true);
    cy.findByRole('button', { name: 'OK' }).should('exist').click();
    cy.findByRole('button', { name: 'Help' }).should('exist').click();
    cy.findByRole('dialog').should('be.visible');
    cy.findByText('Getting Started').should('exist');
    cy.findByRole('dialog')
      .contains('a', 'TOTS User’s Guide (PDF)')
      .should('have.attr', 'href')
      .and('include', '/api/tots/userGuide');
    cy.findByRole('button', { name: 'Close' }).should('exist').click();
    cy.findByRole('dialog').should('not.exist');
  });

  it('verify splash screen cookies', function () {
    cy.loadPage(true);
    cy.findByRole('dialog').should('be.visible');
    cy.get('#splash-screen-toggle').click();
    cy.findByRole('button', { name: 'OK' }).click();
    cy.visit('/');
    cy.findByRole('dialog').should('not.exist');
  });

  it('Verify Expand Table Panel', function () {
    cy.fixture('swab.json').then((file) => {
      cy.setIndexedDbValue('edits', file);
    });
    cy.setIndexedDbValue('table_panel', {
      expanded: true,
      height: 200,
    });

    cy.loadPage();
    cy.findByRole('button', { name: 'OK' }).should('exist').click();
    cy.findByRole('button', { name: 'Create Plan' }).should('exist').click();
    cy.get('#tots-table-div').children('div').children('div').first().click();
    cy.get('[aria-label="Collapse Table Panel"]').click({ force: true });
  });

  it('Verify Accordion toggle', function () {
    cy.loadPage(true);
    cy.findByRole('button', { name: 'OK' }).should('exist').click();
    cy.findByRole('button', { name: 'Create Plan' }).should('exist').click();
    cy.get('#scenario-name-input').type('TOTS-CYPRESS-TEST-PLAN');
    cy.findByRole('button', { name: 'Save' }).click({ force: true });
    cy.findByText('Add Multiple Random Samples')
      .should('exist')
      .click({ force: true });
    cy.findByText('Draw Sampling Mask').should('exist');
    cy.findByText('Add Multiple Random Samples').trigger('keyup', {
      keyCode: 13,
    });
    cy.findByText('Draw Sampling Mask').should('not.exist');
  });
});
