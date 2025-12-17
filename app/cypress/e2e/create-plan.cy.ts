describe('Create Plan Drop Down Contents', function () {
  const sampleSelectId = '#sampling-layer-select';
  const legendId = '#legend-container';

  const planName = 'Test Plan';

  beforeEach(function () {
    cy.loadPage(true);

    cy.findByRole('button', { name: 'OK' })
      .should('exist')
      .click({ force: true });
    cy.findByRole('button', { name: 'Create Plan' })
      .should('exist')
      .click({ force: true });
    cy.get('#scenario-name-input').type(planName);
    cy.findByRole('button', { name: 'Save' }).click({ force: true });
  });

  it('drop down has default samling layer and legend does not', function () {
    const layerName = 'Default Sample Layer';

    // open the legend widget
    cy.findByRole('button', { name: 'Legend' }).click({ force: true });

    // check the legend contents
    cy.get(legendId)
      .get('.esri-layer-list__item')
      .first()
      .shadow()
      .find("div[title='Expand']")
      .click({ force: true });
    cy.get(legendId).contains(layerName);

    // check the dropdown contents
    cy.get(sampleSelectId).contains(layerName);
  });

  it('Specify Plan and Active Sampling Layer section', function () {
    cy.findByTitle('Add Layer').click({ force: true });
    cy.findByText('Layer Name').should('exist');
    cy.get('#layer-name-input').type('new layer');
    cy.findByRole('button', { name: 'Save' }).click({ force: true });

    //clone
    cy.findByTitle('Clone Layer').click({ force: true });
    cy.get('#sampling-layer-select-input').type('new layer (1){enter}');

    // Link and unlink
    cy.findByTitle('Unlink Layer').click({ force: true });
    cy.findByTitle('Link Layer').click({ force: true });

    //Delete
    cy.findAllByTitle('Delete Layer').last().click({ force: true });
  });

  it('Verify Add Multiple Random Samples', function () {
    cy.fixture('sample-mask.json').then((file) => {
      cy.setIndexedDbValue('edits', file);
    });

    cy.mapLoadDelay();

    cy.findByText('Add Multiple Random Samples')
      .should('exist')
      .click({ force: true });
    cy.findByText('Draw Sampling Mask');
    cy.findByRole('radio', { name: 'Draw Sampling Mask' }).click({
      force: true,
    });
    cy.findByRole('button', { name: 'Draw Sampling Mask' }).should('exist');
    cy.findByText('Use Imported Area of Interest');
    cy.findByRole('radio', { name: 'Use Imported Area of Interest' }).click({
      force: true,
    });
    cy.findByText('Area of Interest Mask').should('exist');
    cy.findByRole('button', { name: 'Add' }).should('exist');
    cy.findByRole('combobox', { name: 'Sample Type' }).type('wet vac{enter}');
    cy.findByRole('spinbutton', { name: 'Number of Samples' })
      .clear()
      .type('55');
    cy.findByText('Use AOI Elevation').should('exist');
    cy.findByText('Snap to Ground').should('exist');

    cy.findByRole('radio', { name: 'Draw Sampling Mask' }).click({
      force: true,
    });
    cy.findByRole('button', { name: 'Draw Sampling Mask' }).click({
      force: true,
    });
    cy.intercept(
      'https://geopub.epa.gov/arcgis/rest/services/ORD/TOTS/GPServer/Generate%20Random/execute',
    ).as('execute');
    cy.findByRole('button', { name: 'Submit' }).should('exist').click();
    cy.wait('@execute', { responseTimeout: 50000 });
    cy.findByRole('button', { name: 'Submit' }).should('not.exist');

    //Clone Plan
    cy.findByTitle('Clone Scenario').click({ force: true });

    //Delete cloned plan
    cy.findByTitle('Delete Plan').click({ force: true });

    cy.get('#draw-sample-Robot').click({ force: true });
    cy.get('#draw-sample-Robot').should(
      'have.css',
      'background-color',
      'rgb(231, 246, 248)',
    );
  });

  it('Verify start over', function () {
    cy.fixture('micro-vac.json').then((file) => {
      cy.setIndexedDbValue('edits', file);
    });
    cy.findByRole('button', { name: 'Start Over' })
      .should('exist')
      .click({ force: true });
    cy.findByText('Would you like to continue?').should('exist');
    cy.findByRole('button', { name: 'Continue' }).click({ force: true });
  });

  it('Verify Delete all samples', function () {
    cy.fixture('micro-vac.json').then((file) => {
      cy.setIndexedDbValue('edits', file);
    });
    cy.findByRole('button', { name: 'Delete All Samples' })
      .should('exist')
      .click({ force: true });
  });
});
