import { initializeDb } from 'cypress/support/utilities';

Cypress.on('uncaught:exception', (err, runnable) => {
  // returning false here prevents Cypress from
  // failing the test
  return false;
});
describe('Map Widget', function () {
  beforeEach(function () {
    initializeDb();
  });

  it('Verify MapPopup', function () {
    cy.setDisplayMode('2d', 'polygons');

    cy.setIndexedDbValue('map_scene_position', {
      fov: 55,
      heading: 0,
      position: {
        spatialReference: {
          latestWkid: 3857,
          wkid: 102100,
        },
        x: -10753433.014336495,
        y: 3877462.0307391244,
      },
      tilt: 0,
    });
    cy.setIndexedDbValue('map_2d_extent', {
      spatialReference: {
        latestWkid: 3857,
        wkid: 102100,
      },
      xmin: -10753449.371039443,
      ymin: 3877454.855437033,
      xmax: -10753416.657633547,
      ymax: 3877469.206041216,
    });

    cy.fixture('map-popup.json').then((file) => {
      cy.setIndexedDbValue('edits', file);
    });

    cy.mapLoadDelay();

    cy.get('#tots-map-div').click(200, 200);
    cy.get('.esri-popup__main-container').first().should('be.visible');

    cy.findByRole('button', { name: 'Show More' })
      .should('exist')
      .click({ force: true });
    cy.findByRole('button', { name: 'Show Less' })
      .should('exist')
      .click({ force: true });
    cy.get('#graphic-note').type('graphic note');
    cy.findByRole('button', { name: 'Save' }).should('exist').click();
    cy.get('.esri-view-surface')
      .filter(':visible')
      .first()
      .focus()
      .realPress('{esc}');
    cy.findByRole('dialog').should('not.exist');
  });
});
