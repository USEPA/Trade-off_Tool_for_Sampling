describe("Add data from file uploads", function () {
    beforeEach(function () {
        cy.loadPage(true);
    });
    const loadingSpinnerId = "tots-loading-spinner";
    const planName = 'CYPRESS-TEST-PLAN';

    it("Verify CSV file upload", function () {
        cy.findByRole("button", { name: "OK" }).should('exist').click({ force: true });

        cy.findByRole("button", { name: "Add Data" }).should('exist').click({ force: true });
        cy.get('#add-data-select').type('Add Layer from file{enter}');
        cy.get("#layer-type-select-input").type('Reference layer{enter}');

        const fileName = '2.5_week.csv';
        cy.fixture(fileName).then((file) => {
            cy.findByTestId('tots-dropzone').upload(file, fileName, 'csv');
        });

        cy.findAllByTestId(loadingSpinnerId).should("exist");
        cy.findAllByTestId(loadingSpinnerId).should("not.exist");

        cy.findByText('Upload Succeeded').should('exist');
        cy.findByText(`"${fileName}" was successfully uploaded`).should('exist');
        cy.findByRole("button", { name: "Next" }).should('exist').click({ force: true });


        cy.get('#scenario-name-input').type(planName);
        cy.findByRole('button', { name: 'Save' }).click({ force: true });

        cy.findByTitle('Edit Layer').click({ force: true });
        cy.get('#layer-name-input').clear().type('CYPRESS-TEST-LAYER');
        cy.findByRole('button', { name: 'Save' }).should('exist').click({ force: true });

        cy.fixture("2.5_week_swab.json").then((file) => {
            sessionStorage.setItem("tots_edits", JSON.stringify(file))
        });
        cy.findByRole("button", { name: "Next" }).should('exist').click({ force: true });

        cy.login();
        cy.loadPage();

        cy.findByRole("button", { name: "OK" }).should('exist').click({ force: true });
        cy.findByRole("button", { name: "Create Plan" }).should('exist').click({ force: true });

        cy.findByRole("button", { name: "Configure Output" }).should('exist').click({ force: true });
        cy.findByText('Include Web Map').parent().parent().click();
        cy.findByText('Reference Layers to Include with web map');
        cy.findByRole('button', { name: 'Next' }).click({ force: true });
        cy.get('#tots-panel-scroll-container').find('li').should('have.length', 2);
        cy.get('#tots-panel-scroll-container').contains(fileName).should('exist');
        cy.findByRole("button", { name: "Publish" }).should('exist').click({ force: true });

        cy.findAllByTestId(loadingSpinnerId, { timeout: 200000 }).should("exist");
        cy.findAllByTestId(loadingSpinnerId, { timeout: 200000 }).should("not.exist");

        //create clone and publish again
        cy.findByText('Publish Succeeded').should('exist')
        cy.findByRole("button", { name: "Create Plan" }).should('exist').click({ force: true });
        cy.findByTitle('Clone Scenario').click({ force: true });
        cy.findByRole('button', { name: 'Next' }).click({ force: true });
        cy.findByRole("button", { name: "Publish Output" }).should('exist').click({ force: true });
        cy.findByRole("button", { name: "Publish" }).should('exist').click({ force: true });
    });

    it("Verify Search", function () {
        cy.findByRole("button", { name: "OK" }).should('exist').click({ force: true });
        cy.login();
        cy.loadPage();

        cy.findByRole("button", { name: "OK" }).should('exist').click({ force: true });
        cy.findByRole("button", { name: "Create Plan" }).should('exist').click({ force: true });
        cy.findByRole("button", { name: "Add Data" }).should('exist').click({ force: true });
        cy.get('#layer-type-select').type('TOTS Sampling Plans{enter}');

        cy.findAllByTestId(loadingSpinnerId, { timeout: 200000 }).should("exist");
        cy.findAllByTestId(loadingSpinnerId, { timeout: 200000 }).should("not.exist");

        cy.get('#search-input').type(`${planName}{enter}`);
        cy.findAllByTestId(loadingSpinnerId, { timeout: 200000 }).should("exist");
        cy.findAllByTestId(loadingSpinnerId, { timeout: 200000 }).should("not.exist");


        cy.findByText(planName).should('exist');
        cy.findAllByRole('button', { name: 'Add' }).first().click({ force: true });

    })


    it('REMINDER: Manually delete ‘CYPRESS - TEST’ items from AGO', function () {
        // Empty test that just serves as a reminder to clean up AGO after publishing tests
    });
});
