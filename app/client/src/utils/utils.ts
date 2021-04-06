/**
 * Script from ESRI for escaping an ArcGIS Online usernames and
 * organization ids.
 *
 * @param value The ArcGIS Online username or organization id
 * @returns The escaped version of the username or org id.
 */
export function escapeForLucene(value: string) {
  var a = [
    '+',
    '-',
    '&',
    '!',
    '(',
    ')',
    '{',
    '}',
    '[',
    ']',
    '^',
    '"',
    '~',
    '*',
    '?',
    ':',
    '\\',
  ];
  var r = new RegExp('(\\' + a.join('|\\') + ')', 'g');
  return value.replace(r, '\\$1');
}

/**
 * Checks if the user is using Internet Explorer.
 *
 * @returns True if Internet Explorer and false for all other browsers
 */
export function isIE() {
  const ua = navigator.userAgent;
  /* MSIE used to detect old browsers and Trident used to newer ones*/
  return ua.indexOf('MSIE ') > -1 || ua.indexOf('Trident/') > -1;
}

/**
 * Utility function to split up an array into chunks of a designated length.
 *
 * @param array The original array
 * @param chunkLength The desired size of array chunks
 * @returns Array of specified chunk llength
 */
export function chunkArray(array: any, chunkLength: number): Array<Array<any>> {
  const chunks = [];
  let index = 0;
  while (index < array.length) {
    chunks.push(array.slice(index, (index += chunkLength)));
  }
  return chunks;
}

/**
 * Utility for creating an error object from the async catch function
 * (i.e. something.then().catch()), to be displayed in textareas.
 *
 * @param error The error from the catch
 * @returns An object representing the error
 */
export function createErrorObject(error: any) {
  const errorObj = new Error(error);

  let result = {
    name: errorObj.name,
    message: errorObj.message,
    stack: errorObj.stack,
  };

  if (typeof error === 'object' && Object.keys(error).length > 0) {
    result = {
      ...error,
      ...result,
    };
  }

  return result;
}
