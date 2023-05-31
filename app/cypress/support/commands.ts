import "@testing-library/cypress/add-commands";
import { Options } from "cypress-image-snapshot";
import { addMatchImageSnapshotCommand } from "cypress-image-snapshot/command";

addMatchImageSnapshotCommand()

declare global {
  namespace Cypress {
    interface Chainable {
      /**
       * Custom command to select DOM element by data-cy attribute.
       * @example cy.dataCy('greeting')
       */
      displayMode(shape: string): Chainable<Element>
      mapLoadDelay(): Chainable<Element>
      matchSnapshot(name?: string, options?: Options): Chainable<Element>
      upload(file: any, fileName: string): Chainable<Element>
      validateSession(key: string, point: string | boolean, value: string | boolean): Chainable<Element>
    }
  }
}

/**
 * This enables uploading files with Cypress and the react-dropzone node module.
 *
 * @param subject - The react-dropzone element to upload the file with
 * @param file - The file object to upload
 * @param fileName - The name of the file being uploaded
 */
Cypress.Commands.add(
  "upload",
  {
    prevSubject: "element",
  },
  (subject, file: any, fileName: string) => {
    // we need access window to create a file below
    cy.window().then((window) => {
      // Convert the file to a blob and upload
      const contents = Cypress.Blob.base64StringToBlob(file);

      // Please note that we need to create a file using window.File,
      // cypress overwrites File and this is not compatible with our change handlers in React Code
      const testFile = new window.File([contents], fileName);
      const dataTransfer = new DataTransfer();

      dataTransfer.items.add(testFile);
      const el = subject[0] as any;
      el.files = dataTransfer.files;

      // trigger the drop event on the file input component
      cy.wrap(subject).trigger("change", { force: true });
    });
  }
)

/**
 * This enables performing snapshot comparisons to support visual testing.
 *
 * @param subject - The element to take a snapshot of
 * @param name - Name of the snapshot to be taken
 * @param options (optional) - Additional options for the snapshot
 */
Cypress.Commands.add(
  "matchSnapshot",
  {
    prevSubject: "element",
  },
  (subject, name: string, options: Options) => {
    cy.wrap(subject).matchImageSnapshot(`${Cypress.browser.family}-${name}`, {
      comparisonMethod: "ssim",
      failureThresholdType: "percent",
      failureThreshold: 0.01,
      ...options,
    })
  }
);

// mapLoadDelay -> make delay for map load
Cypress.Commands.add("mapLoadDelay", () => {
  cy.visit("/")
  cy.wait(30000)
  cy.findByRole("button", { name: "OK" }).click({ force: true });
  cy.wait(500)
});

Cypress.Commands.add("displayMode", (shape: string) => {
  sessionStorage.setItem(
    "tots_display_mode",
    JSON.stringify({
      dimensions: "2d",
      geometryType: shape,
      terrain3dVisible: true,
      viewUnderground3d: false,
    })
  )
});

Cypress.Commands.add('validateSession', (key: string, point: string | boolean, value: string | boolean) => {
  const keyObject = sessionStorage.getItem(key)
  if (typeof (point) === 'string') {
    cy.wrap(JSON.parse(keyObject)[point]).should('equal', value);
  } else {
    cy.wrap(JSON.parse(keyObject)).should('equal', value);
  }

})
