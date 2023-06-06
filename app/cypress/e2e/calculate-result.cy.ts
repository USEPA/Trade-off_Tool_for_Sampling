describe("Calculate results tests", () => {
    beforeEach(() => {
        sessionStorage.clear();
    });

    const loadingSpinnerId = "tots-loading-spinner";
    const planName = 'Test Plan';
    const planDescription = 'test description';

    it("Verify empty samples", () => {
        cy.mapLoadDelay();
        cy.findByRole('button', { name: 'Create Plan' }).should('exist').click();
        cy.findByRole('button', { name: 'Save' }).should('be.disabled');
        cy.findByPlaceholderText("Enter Plan Name").type(planName);
        cy.findByRole('button', { name: 'Save' }).should('not.be.disabled').click();
        cy.findByRole('button', { name: 'Next' }).should('exist').click();
        cy.findByRole('button', { name: 'View Detailed Results' }).should('exist').click();
        cy.findByText('There are no samples to run calculations on. Please add samples and try again.').should('exist');
    });

    it("Calculate wet-vac samples", () => {
        cy.fixture("wet-vac.json").then((file) => {
            sessionStorage.setItem("tots_edits", JSON.stringify(file));
        })
        cy.displayMode("2d", "polygons");
        cy.visit('/');
        cy.findByRole("button", { name: "OK" }).click({ force: true });
        cy.findByRole('button', { name: 'Create Plan' }).click({ force: true });

        //Nav bar
        cy.findByText('Resource Tally').should('exist');
        cy.contains('Total Cost: $').should('exist');
        cy.contains('Max Time day(s):').should('exist');
        cy.contains('Limiting Factor').should('exist');

        cy.findByRole('button', { name: 'Calculate Resources' }).click({ force: true });
        cy.findByRole('button', { name: 'View Detailed Results' }).click({ force: true });

        cy.findAllByTestId(loadingSpinnerId).should("exist");
        cy.findAllByTestId(loadingSpinnerId).should("not.exist");

        //Calculate details
        const summarys = ['Summary', 'Sampling Plan', 'Total Number of User-Defined Samples:', 'Total Number of Samples:', 'Total Time (days):', 'Limiting Time Factor:', 'Sampling Operation', 'Total Required Sampling Time (team hrs):', 'Total Sampling Material Cost ($):', 'Analysis Operation', 'Total Required Analysis Time (lab hrs):', 'Total Analysis Labor Cost ($):', 'Total Analysis Material Cost ($):', 'Details', 'Spatial Information', 'Percent of Area Sampled:', 'Sampling Hours per Day:', 'Sampling Personnel Hours per Day:', 'User Specified Sampling Team Labor Cost ($):', 'Time to Prepare Kits (person hours):', 'Time to Collect (person hours):', 'Sampling Material Cost ($):', 'Sampling Personnel Labor Cost ($):', 'Analysis', 'Time to Analyze (person hours):', 'Analysis Labor Cost ($):', 'Analysis Material Cost ($):', 'Total Waste Volume (L):', 'Total Waste Weight (lbs):'];
        summarys.map((item) => {
            cy.findByText(item).should('exist');
        });

        // 'Total Cost ($)' 'Plan Name:', 'Plan Description:' ,'Time to Complete Sampling (days):' ,'Total Sampling Labor Cost ($):','Time to Complete Analyses (days):,'Sampling'
    });

    it("Calculate wet-vac download file", () => {
        cy.fixture("wet-vac.json").then((file) => {
            sessionStorage.setItem("tots_edits", JSON.stringify(file));
        })
        cy.visit('/');
        cy.findByRole("button", { name: "OK" }).click({ force: true });
        cy.findByRole('button', { name: 'Create Plan' }).click({ force: true });
        cy.findByRole('button', { name: 'Calculate Resources' }).click({ force: true });
        cy.findByRole('button', { name: 'View Detailed Results' }).click({ force: true });
        cy.findByRole('button', { name: 'Download' }).click();

        cy.findAllByTestId(loadingSpinnerId).should("exist");
        cy.findAllByTestId(loadingSpinnerId).should("not.exist");

        cy.readFile("cypress/downloads/tots_demo.xlsx").should("exist");

        cy.findByText('Success').should('exist');
        cy.findByText('The file was successfully downloaded.').should('exist');
    })

    it("Verify Name and Description", () => {
        cy.mapLoadDelay();
        cy.findByRole('button', { name: 'Create Plan' }).should('exist').click();

        cy.findByPlaceholderText("Enter Plan Name").type(planName);
        cy.get('#scenario-description-input').type(planDescription);

        cy.findByRole('button', { name: 'Save' }).click();
        cy.findByRole('button', { name: 'Next' }).should('exist').click();
        cy.contains(planName).should('exist');
        cy.contains(planDescription).should('exist');
    });
});
