describe("Toolbar tests", () => {

    beforeEach(() => {
        sessionStorage.clear();
    });

    it("Verify Settings", () => {
        cy.visit('/')
        cy.findByRole('button', { name: 'OK' }).click();

        cy.findByRole('button', { name: 'Settings' }).should('exist').click({ force: true });

        //Dimension
        cy.findByText('Dimension').should('exist');
        cy.get('#dimension-3d').check({ force: true });
        cy.validateSession('tots_display_mode', 'dimensions', '3d')
        cy.get('#dimension-2d').check({ force: true });
        cy.validateSession('tots_display_mode', 'dimensions', '2d')

        //Shape
        cy.get('#shape-polygons').check({ force: true });
        cy.validateSession('tots_display_mode', 'geometryType', 'polygons')
        cy.get('#shape-points').check({ force: true });
        cy.validateSession('tots_display_mode', 'geometryType', 'points')

        //Training Mode
        cy.get(`[aria-label="Training Mode"]`).check({ force: true })
        cy.validateSession('tots_training_mode', false, true)
        cy.findByText('Trade-off Tool for Sampling (TOTS) - TRAINING MODE').should('exist')
        cy.get(`[aria-label="Training Mode"]`).click({ force: true });
        cy.validateSession('tots_training_mode', false, false);

    });

})
