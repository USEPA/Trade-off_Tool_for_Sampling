import { EditsType } from 'types/Edits';
import { LayerType } from 'types/Layer';

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

/**
 * Sanitizes regex strings.
 *
 * @param str The regex string to be sanitized
 * @returns The sanitized regex string
 */
export function escapeRegex(str: string) {
  return str.replace(/([.*+?^=!:${}()|\]\\])/g, '\\$1');
}

/**
 * Determines if the desired name has already been used as a layer name.
 * If it has it appends in index to the end (i.e. '<desiredName> (2)').
 */
export function getLayerName(layers: LayerType[], desiredName: string) {
  // get a list of names in use
  let usedNames: string[] = [];
  layers.forEach((layer) => {
    usedNames.push(layer.label);
  });

  // Find a name where there is not a collision.
  // Most of the time this loop will be skipped.
  let duplicateCount = 0;
  let newName = desiredName;
  while (usedNames.includes(newName)) {
    duplicateCount += 1;
    newName = `${desiredName} (${duplicateCount})`;
  }

  return newName;
}

/**
 * Determines if the desired name has already been used as a scenario name.
 * If it has it appends in index to the end (i.e. '<desiredName> (2)').
 */
export function getScenarioName(edits: EditsType, desiredName: string) {
  // get a list of names in use
  let usedNames: string[] = [];
  edits.edits.forEach((scenario) => {
    usedNames.push(scenario.label);
  });

  // Find a name where there is not a collision.
  // Most of the time this loop will be skipped.
  let duplicateCount = 0;
  let newName = desiredName;
  while (usedNames.includes(newName)) {
    duplicateCount += 1;
    newName = `${desiredName} (${duplicateCount})`;
  }

  return newName;
}
