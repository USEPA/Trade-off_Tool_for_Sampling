import "@testing-library/cypress/add-commands";

declare global {
  namespace Cypress {
    interface Chainable {
      /**
       * Custom command to select DOM element by data-cy attribute.
       * @example cy.dataCy('greeting')
       */
      upload(file: any, fileName: string): Chainable<Element>;
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
);
