describe("Configure output tests", () => {
    beforeEach(() => {
        sessionStorage.clear();
    });

    const planName = 'Test Plan';
    const planDescription = 'test description';

    it("Verify Name and Description", () => {
        cy.mapLoadDelay();
        cy.findByRole('button', { name: 'Create Plan' }).should('exist').click();

        cy.findByPlaceholderText("Enter Plan Name").type(planName);
        cy.get('#scenario-description-input').type(planDescription);

        cy.findByRole('button', { name: 'Save' }).click();

        cy.findByRole('button', { name: 'Configure Output' }).should('exist').click();
        cy.contains(planName).should('exist');
        cy.contains(planDescription).should('exist');
    });

    it("Verify texts", () => {
        cy.mapLoadDelay();
        cy.findByRole('button', { name: 'Create Plan' }).should('exist').click();

        cy.findByPlaceholderText("Enter Plan Name").type(planName);
        cy.get('#scenario-description-input').type(planDescription);

        cy.findByRole('button', { name: 'Save' }).click();

        cy.findByRole('button', { name: 'Configure Output' }).click();
        cy.get('h2').contains('Configure Output').should('exist');
        cy.findByText('Not Logged In').should('exist');

        //TOTS Sampling Plan
        cy.findByText('Include TOTS Sampling Plan (and optional custom attributes)').should('exist');
        cy.findByText('A subset of TOTS output will be published by default. Click Add User-Defined Attributes to optionally add additional attributes to use with field data collection apps.').should('exist');
        cy.findByText('Add User-Defined Attributes').should('exist').click({ force: true });
        cy.findByRole('button', { name: 'Add New Attribute' }).should('exist');
        cy.findByRole('table').should('exist');
        cy.findAllByRole("switch").first().click({ force: true });
        cy.findByText('A subset of TOTS output will be published by default. Click Add User-Defined Attributes to optionally add additional attributes to use with field data collection apps.').should('not.exist');

        //Custom sample type
        cy.findByText('Include Custom Sample Types').should('exist').click({ force: true });

        cy.findByRole('radio', { name: 'Publish to new Feature Service' }).click({ force: true });
        cy.findByText('Custom Sample Type Table Name').should('exist');
        cy.findByText('Custom Sample Type Table Description').should('exist');

        cy.findByRole('radio', { name: 'Publish to existing Feature Service' }).click({ force: true });
        cy.findByText('Feature Service Select').should('exist');
        cy.findByRole('button', { name: 'Save' }).should('exist');

    });

})