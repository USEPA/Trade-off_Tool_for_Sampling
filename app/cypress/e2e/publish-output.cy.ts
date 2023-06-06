describe("Publish output tests", () => {
    beforeEach(() => {
        sessionStorage.clear();
    });

    const planName = 'Test Plan';
    const planDescription = 'test description';

    it("Verify URLs", () => {
        cy.visit('/');
        cy.findByRole('button', { name: 'OK' }).click();

        cy.findByRole('button', { name: 'Publish Output' }).should('exist').click();

        const hrefs = ['https://doc.arcgis.com/en/arcgis-online/share-maps/share-items.htm', 'https://www.epa.gov/home/exit-epa', 'https://doc.arcgis.com/en/arcgis-online/manage-data/item-details.htm', 'https://doc.arcgis.com/en/arcgis-online/manage-data/manage-hosted-feature-layers.htm', 'https://www.epa.gov/home/exit-epa'];
        cy.get("#tots-panel-scroll-container").children('div').children('div').first().children('p').first().children('a').then(($ele) => {
            for (let i = 0; i < $ele.length; i++) {
                const a = $ele[i];
                expect(a.href).equal(hrefs[i]);
            }
        });
    });

    it("Verify Name and Description", () => {
        cy.visit('/');
        cy.findByRole('button', { name: 'OK' }).click();
        cy.findByRole('button', { name: 'Create Plan' }).should('exist').click();

        cy.findByPlaceholderText("Enter Plan Name").type(planName);
        cy.get('#scenario-description-input').type(planDescription);
        cy.findByRole('button', { name: 'Save' }).click();

        cy.findByRole('button', { name: 'Publish Output' }).should('exist').click();
        cy.contains(planName).should('exist');
        cy.contains(planDescription).should('exist');
    });

    it('Verify the summary text', () => {
        cy.mapLoadDelay();
        cy.findByRole('button', { name: 'Add Data' }).should('exist').click();
        cy.get('#add-data-select').type('Add Layer from Web{enter}');
        cy.get('#url-type-select').type('An ArcGIS Server{enter}');
        cy.get('#url-upload-input').type('https://maps7.arcgisonline.com/arcgis/rest/services/EPA_Regions/MapServer{enter}');
        cy.findByText('The layer was successfully added to the map');
        cy.findByRole('button', { name: 'Next' }).click({ force: true });

        cy.findByPlaceholderText("Enter Plan Name").type(planName);
        cy.get('#scenario-description-input').type(planDescription);
        cy.findByRole('button', { name: 'Save' }).click({ force: true });

        cy.findByRole('button', { name: 'Configure Output' }).click({ force: true });
        cy.findByRole("heading", { name: "Configure Output" });
        cy.findByText('Include Web Map').parent().parent().click();
        cy.findByText('Reference Layers to Include with web map');
        cy.findByRole('button', { name: 'Next' }).click({ force: true });

        cy.findByText('Include Tailored TOTS Output Files:').should('exist');
        cy.findByText('Include Web Map:').should('exist');
        cy.findAllByText('Reference layers to include:').should('have.length', 2);
        cy.findByText('Include Web Scene:').should('exist');
        cy.get('#tots-panel-scroll-container').find('li').should('have.length', 2);
        cy.get('#tots-panel-scroll-container').contains('EPA Regions').should('exist');
    });
});
