describe("Toolbar tests", () => {

    beforeEach(() => {
        sessionStorage.clear();
    });

    it.skip("Verify Settings", () => {
        cy.visit('/')
        cy.findByRole('button', { name: 'OK' }).click();

        cy.findByRole('button', { name: 'Settings' }).should('exist').click({ force: true });

        //Dimension
        cy.findByText('Dimension').should('exist');
        cy.get('#dimension-3d').check({ force: true });
        cy.validateSession('tots_display_mode', 'dimensions', '3d');
        cy.get('#dimension-2d').check({ force: true });
        cy.validateSession('tots_display_mode', 'dimensions', '2d');

        //Shape
        cy.get('#shape-polygons').check({ force: true });
        cy.validateSession('tots_display_mode', 'geometryType', 'polygons');
        cy.get('#shape-points').check({ force: true });
        cy.validateSession('tots_display_mode', 'geometryType', 'points');

        //Training Mode
        cy.get(`[aria-label="Training Mode"]`).check({ force: true });
        cy.validateSession('tots_training_mode', false, true);
        cy.findByText('Trade-off Tool for Sampling (TOTS) - TRAINING MODE').should('exist');
        cy.get(`[aria-label="Training Mode"]`).click({ force: true });
        cy.validateSession('tots_training_mode', false, false);
    });

    it("Verify Legend", () => {
        cy.fixture("micro-vac.json").then((file) => {
            sessionStorage.setItem("tots_edits", JSON.stringify(file));
        })
        cy.mapLoadDelay();

        cy.findByRole('button', { name: 'Legend' }).should('exist').click({ force: true });
        cy.get('#legend-container').contains('demo').should("be.visible");

        cy.findByTitle("Expand").click();
        cy.get('#legend-container').contains('Default Sample Layer').should("be.visible");
        const sampleTypes = ['Aggressive Air', 'Micro Vac', 'Robot', 'Sponge', 'Swab', 'Wet Vac'];
        sampleTypes.map((item) => {
            cy.get('#legend-container').contains(item).should('exist');
        });
    })

})
