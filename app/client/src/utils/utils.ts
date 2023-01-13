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
 * Gets the number from the last parentheses. If the value
 * is not a number NaN is returned.
 *
 * @param str String to get number in last parentheses
 * @returns
 */
function getNumberFromParen(str: string) {
  const splitLabel = str.split('(');
  return parseInt(splitLabel[splitLabel.length - 1].replace(')', ''));
}

/**
 * Determines if the desired name has already been used as a layer name.
 * If it has it appends in index to the end (i.e. '<desiredName> (2)').
 */
export function getLayerName(layers: LayerType[], desiredName: string) {
  const numInDesiredName = getNumberFromParen(desiredName);
  let newName =
    numInDesiredName || numInDesiredName === 0
      ? desiredName.replace(`(${numInDesiredName})`, '').trim()
      : desiredName;

  // get a list of names in use
  let duplicateCount = 0;
  layers.forEach((layer) => {
    // remove any counts from the end of the name to ge an accurate count
    // for the new name
    const numInParen = getNumberFromParen(layer.label);
    const possibleName =
      numInParen || numInParen === 0
        ? layer.label.replaceAll(`(${numInParen})`, '').trim()
        : layer.label;

    if (possibleName === newName) duplicateCount += 1;
  });

  if (duplicateCount === 0) return newName;
  else
    return `${newName} (${
      duplicateCount === numInDesiredName ? duplicateCount + 1 : duplicateCount
    })`;
}

/**
 * Determines if the desired name has already been used as a scenario name.
 * If it has it appends in index to the end (i.e. '<desiredName> (2)').
 */
export function getScenarioName(edits: EditsType, desiredName: string) {
  const numInDesiredName = getNumberFromParen(desiredName);
  let newName =
    numInDesiredName || numInDesiredName === 0
      ? desiredName.replace(`(${numInDesiredName})`, '').trim()
      : desiredName;

  // get a list of names in use
  let duplicateCount = 0;
  edits.edits.forEach((scenario) => {
    // remove any counts from the end of the name to ge an accurate count
    // for the new name
    const numInParen = getNumberFromParen(scenario.label);
    const possibleName =
      numInParen || numInParen === 0
        ? scenario.label.replaceAll(`(${numInParen})`, '').trim()
        : scenario.label;

    if (possibleName === newName) duplicateCount += 1;
  });

  if (duplicateCount === 0) return newName;
  else
    return `${newName} (${
      duplicateCount === numInDesiredName ? duplicateCount + 1 : duplicateCount
    })`;
}
