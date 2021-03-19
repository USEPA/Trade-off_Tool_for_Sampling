/**
 * This enables uploading files with Cypress and the react-dropzone node module.
 *
 * @param subject - The react-dropzone element to upload the file with
 * @param file - The file object to upload
 * @param fileName - The name of the file being uploaded
 */
Cypress.Commands.add(
  'upload',
  {
    prevSubject: 'element',
  },
  (subject, file, fileName) => {
    // we need access window to create a file below
    cy.window().then((window) => {
      // Convert the file to a blob and upload
      Cypress.Blob.base64StringToBlob(file).then((blob) => {
        // Please note that we need to create a file using window.File,
        // cypress overwrites File and this is not compatible with our change handlers in React Code
        const testFile = new window.File([blob], fileName);

        // trigger the drop event on the react-dropzone component
        cy.wrap(subject).trigger('drop', {
          force: true,
          dataTransfer: { files: [testFile], types: ['Files'] },
        });
      });
    });
  },
);
