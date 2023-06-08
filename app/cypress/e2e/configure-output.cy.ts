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
        cy.findByRole("heading", { name: "Configure Output" });
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

    it("Verify add new attribute", () => {
        cy.loadPage();
        cy.findByRole("button", { name: "OK" }).click({ force: true });
        cy.findByRole('button', { name: 'Create Plan' }).should('exist').click();
        cy.findByPlaceholderText("Enter Plan Name").type(planName);
        cy.findByRole('button', { name: 'Save' }).click();
        cy.findByRole('button', { name: 'Configure Output' }).click();
        cy.findByText('Add User-Defined Attributes').should('exist').click({ force: true });
        cy.findByRole('button', { name: 'Add New Attribute' }).should('exist').click();

        //Attribute
        cy.findByRole('dialog').should('be.visible');
        cy.findByText('Edit Attribute').should('exist');
        cy.findByText('Enter Field Name:').should('exist');
        cy.findByText('Enter Display Name:').should('exist');
        cy.findByText('Choose Data Type:').should('exist');
        cy.findByRole('dialog').contains('a', 'working with fields').should('have.attr', 'href').and('equal', 'https://doc.arcgis.com/en/field-maps/android/help/configure-the-form.htm');
        cy.findByRole('dialog').contains('a', 'EXIT').should('have.attr', 'href').and('equal', 'https://www.epa.gov/home/exit-epa');
        cy.get('#attribute-name-input').type('user_defind_filed');
        cy.get('#attribute-label-input').type('user_display_name');
        cy.get('#data-type-select').type('String{enter}');
        cy.get('#length-input').should('be.visible');
        cy.get('#domain-type-select-input').type('None{enter}');
        cy.findByRole('button', { name: 'Close' });
        cy.findByRole('button', { name: 'Save' }).click();
    });

});

