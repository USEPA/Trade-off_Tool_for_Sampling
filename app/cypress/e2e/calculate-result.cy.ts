describe("Calculate results tests", () => {
    beforeEach(() => {
        sessionStorage.clear()
    });

    const planName = 'Test Plan'
    const planDescription = 'test description'

    it("Verify empty samples", () => {
        cy.mapLoadDelay()
        cy.findByRole('button', { name: 'Create Plan' }).should('exist').click()
        cy.findByRole('button', { name: 'Save' }).should('be.disabled')
        cy.findByPlaceholderText("Enter Plan Name").type(planName);
        cy.findByRole('button', { name: 'Save' }).should('not.be.disabled').click()
        cy.findByRole('button', { name: 'Next' }).should('exist').click()
        cy.findByRole('button', { name: 'View Detailed Results' }).should('exist').click()
        cy.findByText('There are no samples to run calculations on. Please add samples and try again.').should('exist')
    });

    it("Calculate wet-vac samples", () => {
        cy.fixture("wet-vac.json").then((file) => {
            sessionStorage.setItem("tots_edits", JSON.stringify(file))
        })
        cy.displayMode("polygons")
        cy.visit('/')
        cy.findByRole("button", { name: "OK" }).click({ force: true });
        cy.findByRole('button', { name: 'Create Plan' }).click({ force: true })

        // needed for calculate
        cy.wait(1000)

        //Nav bar
        cy.findByText('Resource Tally').should('exist')
        cy.contains('Total Cost: $').should('exist')
        cy.contains('Max Time day(s):').should('exist')
        cy.contains('Limiting Factor').should('exist')

        cy.findByRole('button', { name: 'Calculate Resources' }).click({ force: true })
        cy.findByRole('button', { name: 'View Detailed Results' }).click({ force: true })

        // needed for calculate
        cy.wait(1000)

        //Calculate details
        cy.findByText('Summary').should('exist')
        cy.findByText('Sampling Plan').should('exist')
        cy.findByText('Details').should('exist')
        cy.findByText('Analysis').should('exist')
    });

    it("Calculate wet-vac download file", () => {
        cy.fixture("wet-vac.json").then((file) => {
            sessionStorage.setItem("tots_edits", JSON.stringify(file))
        })
        cy.visit('/')
        cy.findByRole("button", { name: "OK" }).click({ force: true });
        cy.findByRole('button', { name: 'Create Plan' }).click({ force: true })
        cy.findByRole('button', { name: 'Calculate Resources' }).click({ force: true })
        cy.findByRole('button', { name: 'View Detailed Results' }).click({ force: true })
        cy.findByRole('button', { name: 'Download' }).click()

        // needed for calculate
        cy.wait(20000)
        cy.readFile("cypress/downloads/tots_demo.xlsx").should("exist");

        cy.findByText('Success').should('exist')
        cy.findByText('The file was successfully downloaded.').should('exist')
    })

    it("Verify Name and Description", () => {
        cy.mapLoadDelay()
        cy.findByRole('button', { name: 'Create Plan' }).should('exist').click()

        cy.findByPlaceholderText("Enter Plan Name").type(planName);
        cy.get('#scenario-description-input').type(planDescription)

        cy.findByRole('button', { name: 'Save' }).click()
        cy.findByRole('button', { name: 'Next' }).should('exist').click()
        cy.contains(planName).should('exist')
        cy.contains(planDescription).should('exist')
    });
})