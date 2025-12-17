describe('Create Plan Drop Down Contents', function () {
  const planName = 'Test Plan';

  beforeEach(function () {
    cy.loadPage(true);

    cy.findByRole('button', { name: 'OK' })
      .should('exist')
      .click({ force: true });
  });

  it('Verify creating new custom sample type', function () {
    cy.findByRole('button', { name: 'Additional Tools' })
      .should('exist')
      .click({ force: true });

    cy.findByText('Create Custom Sample Types')
      .should('exist')
      .click({ force: true });
    cy.findByTitle('Create Sample Type').click({ force: true });
    cy.findByTitle('Cancel').should('exist');
    cy.findByText('Symbology Settings').should('exist');

    cy.get('#point-style-select-input').type('Square{enter}');
    cy.get('#sample-type-name-input').type('xyz_sample_name');
    cy.get('#sa-input').type('15');
    cy.get('#shape-type-select-input').type('Polygon{enter}');
    cy.get('#ttpk-input').type('14');
    cy.get('#ttc-input').type('12');
    cy.get('#tta-input').type('10');
    cy.get('#lod_p-input').type('Limited-of-detection-Porous');
    cy.get('#lod_non-input').type('Limited-of-detection-non-Porous');
    cy.get('#mcps-input').type('50');
    cy.get('#wvps-input').type('12');
    cy.get('#wwps-input').type('10');
    cy.get('#alc-input').type('100');
    cy.get('#amc-input').type('78');

    cy.findByRole('button', { name: 'Save' }).click({ force: true });
    cy.findByTitle('Edit Sample Type').should('exist').click({ force: true });

    cy.findAllByRole('button', { name: 'Cancel' }).should('exist');
    cy.findByRole('button', { name: 'Save' }).click({ force: true });

    //Clone
    cy.findByTitle('Clone Sample Type').should('exist').click({ force: true });
    cy.findByRole('button', { name: 'Save' }).click({ force: true });

    cy.findByRole('button', { name: 'Create Plan' })
      .should('exist')
      .click({ force: true });
    cy.get('#scenario-name-input').type(planName);
    cy.findByRole('button', { name: 'Save' }).click({ force: true });
    cy.findByTitle('Draw a xyz_sample_name (1): 0').should('exist');

    //Delete
    cy.findByRole('button', { name: 'Additional Tools' })
      .should('exist')
      .click({ force: true });
    cy.findByText('Create Custom Sample Types')
      .should('exist')
      .click({ force: true });
    cy.findByTitle('Delete Sample Type').click({ force: true });
    cy.findByText('Would you like to continue?').should('exist');
    cy.findByRole('button', { name: 'Continue' }).click({ force: true });
    cy.findByTitle('Draw a xyz_sample_name (1): 0').should('not.exist');
  });
});
