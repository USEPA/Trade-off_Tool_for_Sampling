describe('Create Plan Drop Down Contents', function () {
  const sampleSelectId = '#sampling-layer-select';
  const aoiSelectId = '#aoi-mask-select';
  const legendId = '#legend-container';

  beforeEach(function () {
    cy.visit('/');

    // close the splash screen
    cy.findByText('OK').click();

    // clear session storage
    sessionStorage.clear();
  });

  it('drop down has default samling layer and legend does not', function () {
    const layerName = 'Default Sample Layer';

    // go to the create plan tab
    cy.findByText('Create Plan').click();

    // check the legend contents
    cy.findByText('Legend').click();
    cy.get(legendId).contains(layerName).should('not.exist');

    // check the dropdown contents
    cy.get(sampleSelectId).contains(layerName);
  });

  it('drop down has sketched area of interest layer and legend does not', function () {
    const layerName = 'Sketched Area of Interest';

    // go to the create plan tab
    cy.findByText('Create Plan').click();

    // check the legend contents
    cy.findByText('Legend').click();
    cy.get(legendId).contains(layerName).should('not.exist');

    // check the dropdown contents
    cy.findByText('Add Multiple Random Samples').click();
    cy.get(aoiSelectId).contains(layerName);
  });

  it('drop down has default samling layer and legend does after placing a sample', function () {
    const layerName = 'Default Sample Layer';

    // go to the create plan tab
    cy.findByText('Create Plan').click();

    // check the legend contents and close
    cy.findByText('Legend').click();
    cy.get(legendId).contains(layerName).should('not.exist');
    cy.findByText('Legend').click();

    // place a sample on the map
    cy.findByText('Micro Vac').click();
    cy.findByTestId('tots-map').click();

    // check the dropdown contents
    cy.get(sampleSelectId).contains(layerName);

    // re-check the legend contents
    cy.findByText('Legend').click();
    cy.get(legendId).contains(layerName);
  });

  it('drop down has sketched area of interest layer and legend does after placing a sample', function () {
    const layerName = 'Sketched Area of Interest';

    // go to the create plan tab
    cy.findByText('Create Plan').click();

    // check the legend contents and close
    cy.findByText('Legend').click();
    cy.get(legendId).contains(layerName).should('not.exist');
    cy.findByText('Legend').click();

    // place a sample on the map
    cy.findByText('Add Multiple Random Samples').click();
    cy.findByText('Draw Area of Interest Mask').click();
    cy.findByTestId('tots-map').click();

    // check the dropdown contents
    cy.get(aoiSelectId).contains(layerName);

    // re-check the legend contents
    cy.findByText('Legend').click();
    cy.get(legendId).contains(layerName);
  });
});
