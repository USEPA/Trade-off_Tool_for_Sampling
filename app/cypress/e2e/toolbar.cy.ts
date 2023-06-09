Cypress.on('uncaught:exception', (err, runnable) => {
    // returning false here prevents Cypress from
    // failing the test
    return false;
});
describe("Toolbar tests", () => {

    beforeEach(() => {
        cy.loadPage(true);
    });

    it("Verify toolbar items", () => {
        cy.findByRole('button', { name: 'OK' }).click();
        const toolbarItems = ['Trade-off Tool for Sampling (TOTS)', 'Settings', 'Basemap', 'Login', 'Contact Us'];
        toolbarItems.map((item) => {
            cy.get('[data-testid="tots-toolbar"]').contains(item).should('exist');
        });
    });

    it("Verify Settings", () => {
        cy.findByRole('button', { name: 'OK' }).click();

        cy.findByRole('button', { name: 'Settings' }).should('exist').click({ force: true });

        //Dimension
        cy.findByText('Dimension').should('exist');
        cy.get('#dimension-3d').click({ force: true });
        cy.validateSession('tots_display_mode', 'dimensions', '3d');
        cy.get('#dimension-2d').click({ force: true });
        cy.validateSession('tots_display_mode', 'dimensions', '2d');

        //Shape
        cy.get('#shape-polygons').click({ force: true });
        cy.validateSession('tots_display_mode', 'geometryType', 'polygons');
        cy.get('#shape-points').check({ force: true });
        cy.validateSession('tots_display_mode', 'geometryType', 'points');

        //Training Mode
        cy.get(`[aria-label="Training Mode"]`).check({ force: true })
        cy.validateSession('tots_training_mode', false, true);
        cy.findByText('Trade-off Tool for Sampling (TOTS) - TRAINING MODE').should('exist');
        cy.get(`[aria-label="Training Mode"]`).click({ force: true });
        cy.validateSession('tots_training_mode', false, false);
    });

    it("Verify Legend", () => {
        cy.fixture("micro-vac.json").then((file) => {
            sessionStorage.setItem("tots_edits", JSON.stringify(file));
        });
        cy.mapLoadDelay();

        cy.findByRole('button', { name: 'Legend' }).should('exist').click({ force: true });
        cy.get('#legend-container').contains('demo').should("be.visible");

        cy.findByTitle("Expand").click();
        cy.get('#legend-container').contains('Default Sample Layer').should("be.visible");
        const sampleTypes = ['Aggressive Air', 'Micro Vac', 'Robot', 'Sponge', 'Swab', 'Wet Vac'];
        sampleTypes.map((item) => {
            cy.get('#legend-container').contains(item).should('exist');
        });
        cy.findByTitle('Zoom to Layer').click({ force: true });
        cy.findByTitle('Delete Layer').click({ force: true });
    });

    it("Verify Basemap ", () => {
        cy.findByRole('button', { name: 'OK' }).click();
        cy.findByRole('button', { name: 'Basemap' }).click({ force: true });
        cy.get('#basemap-container').find('li').each(($el, index) => {
            if (index === 2) {
                cy.wrap($el).click({ force: true })
            }
        });
        cy.findByRole('button', { name: 'Basemap' }).click({ force: true });
    });
});
