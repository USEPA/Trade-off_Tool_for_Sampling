describe("Add data from file uploads", function () {
  beforeEach(function () {
    cy.loadPage(true);
  });
  const layerSelectId = "#layer-type-select";
  const loadingSpinnerId = "tots-loading-spinner";
  const planName = "CYPRESS-TEST-PLAN";

  it("Verify CSV file upload", function () {
    cy.findByRole("button", { name: "OK" })
      .should("exist")
      .click({ force: true });

    cy.findByRole("button", { name: "Add Data" })
      .should("exist")
      .click({ force: true });
    cy.get("#add-data-select").type("Add Layer from file{enter}");
    cy.findByRole("combobox", { name: "Layer Type" })
      .parent()
      .should("be.visible");
    cy.get(`${layerSelectId}-input`).type("Reference layer{enter}");

    const fileName = "2.5-week.csv";
    cy.fixture(fileName).then((file) => {
      cy.findByTestId("tots-dropzone").upload(file, fileName, "csv");
    });

    cy.findAllByTestId(loadingSpinnerId).should("exist");
    cy.findAllByTestId(loadingSpinnerId).should("not.exist");

    cy.findByText("Upload Succeeded").should("exist");
    cy.findByText(`"${fileName}" was successfully uploaded`).should("exist");
    cy.findByRole("button", { name: "Next" })
      .should("exist")
      .click({ force: true });

    cy.get("#scenario-name-input").type(planName);
    cy.findByRole("button", { name: "Save" }).click({ force: true });

    cy.findByTitle("Edit Layer").click({ force: true });
    cy.get("#layer-name-input").clear().type("CYPRESS-TEST-LAYER");
    cy.findByRole("button", { name: "Save" })
      .should("exist")
      .click({ force: true });

    cy.fixture("2.5-week-swab.json").then((file) => {
      sessionStorage.setItem("tots_edits", JSON.stringify(file));
    });
    cy.findByRole("button", { name: "Next" })
      .should("exist")
      .click({ force: true });

    cy.login();
    cy.loadPage();

    cy.findByRole("button", { name: "OK" })
      .should("exist")
      .click({ force: true });
    cy.findByRole("button", { name: "Create Plan" })
      .should("exist")
      .click({ force: true });

    cy.findByRole("button", { name: "Configure Output" })
      .should("exist")
      .click({ force: true });
    cy.findByText("Include Web Map").parent().parent().click();
    cy.findByText("Reference Layers to Include with web map");
    cy.findByRole("button", { name: "Next" }).click({ force: true });
    cy.get("#tots-panel-scroll-container").find("li").should("have.length", 2);
    cy.get("#tots-panel-scroll-container").contains(fileName).should("exist");
    cy.findByRole("button", { name: "Publish" })
      .should("exist")
      .click({ force: true });

    cy.findAllByTestId(loadingSpinnerId, { timeout: 200000 }).should("exist");
    cy.findAllByTestId(loadingSpinnerId, { timeout: 200000 }).should(
      "not.exist"
    );

    //create clone and publish again
    cy.findByText("Publish Succeeded").should("exist");
    cy.findByRole("button", { name: "Create Plan" })
      .should("exist")
      .click({ force: true });
    cy.findByTitle("Clone Scenario").click({ force: true });
    cy.findByRole("button", { name: "Next" }).click({ force: true });
    cy.findByRole("button", { name: "Publish Output" })
      .should("exist")
      .click({ force: true });
    cy.findByRole("button", { name: "Publish" })
      .should("exist")
      .click({ force: true });
  });

  it("Verify Search", function () {
    cy.findByRole("button", { name: "OK" })
      .should("exist")
      .click({ force: true });
    cy.login();
    cy.loadPage();

    cy.findByRole("button", { name: "OK" })
      .should("exist")
      .click({ force: true });
    cy.findByRole("button", { name: "Create Plan" })
      .should("exist")
      .click({ force: true });
    cy.findByRole("button", { name: "Add Data" })
      .should("exist")
      .click({ force: true });
    cy.findByRole("combobox", { name: "Layer Type" })
      .parent()
      .should("be.visible");
    cy.get(layerSelectId).type("TOTS Sampling Plans{enter}", { force: true });

    cy.findAllByTestId(loadingSpinnerId, { timeout: 200000 }).should("exist");
    cy.findAllByTestId(loadingSpinnerId, { timeout: 200000 }).should(
      "not.exist"
    );

    cy.get("#search-input").type(`${planName}{enter}`);
    cy.findAllByTestId(loadingSpinnerId, { timeout: 200000 }).should("exist");
    cy.findAllByTestId(loadingSpinnerId, { timeout: 200000 }).should(
      "not.exist"
    );

    cy.findByText(planName).should("exist");
    cy.findAllByRole("button", { name: "Add" }).first().click({ force: true });
  });

  it("Verify sample plan name error ", function () {
    cy.findByRole("button", { name: "OK" })
      .should("exist")
      .click({ force: true });
    cy.login();
    cy.loadPage();
    cy.findByRole("button", { name: "OK" })
      .should("exist")
      .click({ force: true });
    cy.findByRole("button", { name: "Create Plan" })
      .should("exist")
      .click({ force: true });
    cy.get("#scenario-name-input").type(planName);
    cy.findByRole("button", { name: "Save" })
      .should("exist")
      .click({ force: true });

    cy.findAllByTestId(loadingSpinnerId, { timeout: 200000 }).should("exist");
    cy.findAllByTestId(loadingSpinnerId, { timeout: 200000 }).should(
      "not.exist"
    );

    cy.findByRole("button", { name: "Error" }).should("exist");
    cy.findByRole("button", { name: "Error" }).should(
      "have.css",
      "background-color",
      "rgb(220, 53, 69)"
    );
    cy.findByText("Plan Name Not Available").should("exist");

    cy.get("#scenario-name-input").clear().type(`${planName}-1`);
    cy.findByRole("button", { name: "Save" })
      .should("exist")
      .click({ force: true });
  });

  it("Verify Include Custom Sample Types", function () {
    cy.findByRole("button", { name: "OK" })
      .should("exist")
      .click({ force: true });
    cy.findByRole("button", { name: "Create Plan" })
      .should("exist")
      .click({ force: true });
    cy.get("#scenario-name-input").type(`${planName}-123`);
    cy.findByRole("button", { name: "Save" })
      .should("exist")
      .click({ force: true });
    cy.findByText("Create Custom Sample Types")
      .should("exist")
      .click({ force: true });
    cy.findByTitle("Create Sample Type").click({ force: true });

    cy.get("#point-style-select-input").type("Square{enter}");
    cy.get("#sample-type-name-input").type("xyz_sample_name");
    cy.get("#sa-input").type("15");
    cy.get("#shape-type-select-input").type("Polygon{enter}");
    cy.get("#ttpk-input").type("14");
    cy.get("#ttc-input").type("12");
    cy.get("#tta-input").type("10");
    cy.get("#lod_p-input").type("Limited-of-detection-Porous");
    cy.get("#lod_non-input").type("Limited-of-detection-non-Porous");
    cy.get("#mcps-input").type("50");
    cy.get("#wvps-input").type("12");
    cy.get("#wwps-input").type("10");
    cy.get("#alc-input").type("100");
    cy.get("#amc-input").type("78");

    cy.findByRole("button", { name: "Save" }).click({ force: true });

    cy.fixture("custom-sample-type.json").then((file) => {
      sessionStorage.setItem("tots_edits", JSON.stringify(file));
    });

    cy.login();
    cy.loadPage();
    cy.findByRole("button", { name: "OK" })
      .should("exist")
      .click({ force: true });
    cy.findByRole("button", { name: "Next" }).click({ force: true });
    cy.findByRole("button", { name: "Next" }).click({ force: true });
    cy.findByText("Include Custom Sample Types")
      .should("exist")
      .click({ force: true })
      .then(() => {
        const sampleOptions = sessionStorage.getItem(
          "tots_user_defined_sample_options"
        );
        const sampleOption = JSON.parse(sampleOptions)[0];
        sessionStorage.setItem(
          "tots_sample_type_selections",
          JSON.stringify([
            {
              label: "xyz_sample_name",
              value: `${sampleOption?.value}`,
              serviceId: "",
              status: "add",
            },
          ])
        );
      });

    cy.findByRole("radio", { name: "Publish to new Feature Service" }).click({
      force: true,
    });
    const table_Name = "cypress_table_Name";
    cy.get("#sample-table-name-input").type(table_Name);
    cy.get("#scenario-description-input").type("scenario_description_input");
    cy.findByRole("button", { name: "Save" }).click({ force: true });
    cy.findAllByTestId(loadingSpinnerId, { timeout: 200000 }).should("exist");
    cy.findAllByTestId(loadingSpinnerId, { timeout: 200000 }).should(
      "not.exist"
    );

    cy.findByRole("button", { name: "Saved" }).should(
      "have.css",
      "background-color",
      "rgb(40, 167, 69)"
    );
    cy.findByRole("button", { name: "Saved" }).should("be.disabled");
    cy.findByRole("button", { name: "Next" }).click({ force: true });

    cy.loadPage();
    cy.findByRole("button", { name: "OK" })
      .should("exist")
      .click({ force: true });
    //publishSamplesMode = new
    cy.findByRole("button", { name: "Publish" })
      .should("exist")
      .click({ force: true });

    cy.findAllByTestId(loadingSpinnerId, { timeout: 200000 }).should("exist");
    cy.findAllByTestId(loadingSpinnerId, { timeout: 200000 }).should(
      "not.exist"
    );

    cy.findByRole("button", { name: "Configure Output" }).click({
      force: true,
    });
    cy.findByRole("radio", {
      name: "Publish to existing Feature Service",
    }).click({ force: true });
    cy.get("#feature-service-select").type(`${table_Name}{enter}`);
    cy.findByRole("button", { name: "Save" }).click({ force: true });
    cy.findByRole("button", { name: "Save" }).should("be.disabled");
    cy.findByRole("button", { name: "Next" }).click({ force: true });
    //publishSamplesMode = existing
    cy.findByRole("button", { name: "Publish" })
      .should("exist")
      .click({ force: true });
  });
});

describe("REMINDER: Manually delete ‘CYPRESS - TEST’ items from AGO", () => {
  it("REMINDER: Manually delete ‘CYPRESS - TEST’ items from AGO", function () {
    // Empty test that just serves as a reminder to clean up AGO after publishing tests
  });
});
