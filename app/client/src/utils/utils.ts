import { EditsType } from 'types/Edits';

export function activateSketchButton(id: string) {
  const sketchSelectedClass = 'sketch-button-selected';
  let wasSet = false;
  const sketchButtons = document.getElementsByClassName('sketch-button');
  for (let i = 0; i < sketchButtons.length; i++) {
    const sketchButton = sketchButtons[i];

    // make the button active if the id matches the provided id
    if (sketchButton.id === id) {
      // make the style of the button active
      if (!sketchButton.classList.contains(sketchSelectedClass)) {
        sketchButton.classList.add(sketchSelectedClass);
        wasSet = true;
      } else {
        // toggle the button off
        sketchButton.classList.remove(sketchSelectedClass);
        const activeElm = document?.activeElement as any;
        activeElm?.blur();
      }
      continue;
    }

    // remove the selected class from all other buttons
    if (sketchButton.classList.contains(sketchSelectedClass)) {
      sketchButton.classList.remove(sketchSelectedClass);
    }
  }

  return wasSet;
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
 * Delays code execution for the provided milliseconds
 * when awaited.
 *
 * @param ms milliseconds to delay
 * @returns The promise that waits for the desired milliseconds
 */
export function delay(ms: number) {
  return new Promise((res) => setTimeout(res, ms));
}

/**
 * Script from ESRI for escaping an ArcGIS Online usernames and
 * organization ids.
 *
 * @param value The ArcGIS Online username or organization id
 * @returns The escaped version of the username or org id.
 */
export function escapeForLucene(value: string) {
  const a = [
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
  const r = new RegExp('(\\' + a.join('|\\') + ')', 'g');
  return value.replace(r, '\\$1');
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

export function formatNumber(value: number, precision: number = 0) {
  const output = parseSmallFloat(value, precision);
  return output ? output.toLocaleString() : output;
}

/**
 * Gets the environment from the URL.
 *
 * @returns dev, stage, production or prototyp
 */
export function getEnvironment() {
  const hostname = window.location.hostname;
  if (hostname === 'tots.epa.gov' || hostname === 'tots-prod.app.cloud.gov')
    return 'production';
  else if (hostname === 'tots-stage.app.cloud.gov') return 'stage';
  else if (hostname === 'tots-dev.app.cloud.gov') return 'develop';
  else if (hostname === 'localhost') return 'local';
  else if (hostname === 'tots-decon-proto.app.cloud.gov') return 'prototype';
  return 'unknown';
}

/**
 * Determines if the desired name has already been used as a layer name.
 * If it has it appends in index to the end (i.e. '<desiredName> (2)').
 */
export function getNewName(existingNames: string[], desiredName: string) {
  const numInDesiredName = getNumberFromParen(desiredName);
  const newName =
    numInDesiredName || numInDesiredName === 0
      ? desiredName.replace(`(${numInDesiredName})`, '').trim()
      : desiredName;

  // get a list of names in use
  let duplicateCount = 0;
  existingNames.forEach((name) => {
    // remove any counts from the end of the name to ge an accurate count
    // for the new name
    const numInParen = getNumberFromParen(name);
    const possibleName =
      numInParen || numInParen === 0
        ? name.replaceAll(`(${numInParen})`, '').trim()
        : name;

    if (possibleName === newName) duplicateCount += 1;
  });

  if (duplicateCount === 0) return newName;
  else
    return `${newName} (${
      duplicateCount === numInDesiredName ? duplicateCount + 1 : duplicateCount
    })`;
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
 * Determines if the desired name has already been used as a scenario name.
 * If it has it appends in index to the end (i.e. '<desiredName> (2)').
 */
export function getScenarioName(edits: EditsType, desiredName: string) {
  const numInDesiredName = getNumberFromParen(desiredName);
  const newName =
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

/**
 * Checks if the provided error is an abort error.
 *
 * @param error
 * @returns true if it is an abort error
 */
export function isAbort(error: unknown) {
  if (!error || typeof error !== 'object' || !('name' in error)) return false;
  return (error as Error).name === 'AbortError';
}

export function parseSmallFloat(number: number, precision: number = 15) {
  if (precision < 0) return number;
  if (typeof number !== 'number') return number;
  return parseFloat(number.toFixed(precision));
}

/**
 * Joins the input string into a sentance (i.e., "A, B, and C", "A and B" or "A").
 *
 * @param values values to be joined
 * @returns Values joined into a sentence
 */
export function sentenceJoin(values: string[]) {
  // remove duplicates
  values = [...new Set(values)];

  if (values.length <= 1) return values.join('');
  return `${values.slice(0, -1).join(', ')} and ${values.slice(-1)}`;
}

/**
 * Rounds a float to a specified number of points after the decimal.
 *
 * @param num The number to be rounded
 * @param scale The number of points after the decimal
 * @returns A number rounded to the specified scale
 */
export function toScale(num: number | null, scale: number = 0) {
  if (num === null) return null;
  if (scale < 0) return num;
  const offset = 10 ** scale;
  return Math.round((num + Number.EPSILON) * offset) / offset;
}

/**
 * Converts base64 to a blob
 *
 * @param base64String base64 item to convert
 * @param contentType content type of the item
 * @param sliceSize slice size for converting
 * @returns blob
 */
export async function convertBase64ToBlob(
  base64String: string,
  contentType = '',
  sliceSize = 512,
) {
  const byteCharacters = atob(base64String.split(',')[1]); // Decoding Base64
  const byteArrays = [];

  for (let offset = 0; offset < byteCharacters.length; offset += sliceSize) {
    const slice = byteCharacters.slice(offset, offset + sliceSize);

    const byteNumbers = new Array(slice.length);
    for (let i = 0; i < slice.length; i++) {
      byteNumbers[i] = slice.charCodeAt(i);
    }

    const byteArray = new Uint8Array(byteNumbers);
    byteArrays.push(byteArray);
  }

  return new Blob(byteArrays, { type: contentType });
}

/**
 * Converts base64 to a File
 *
 * @param base64String base64 item to convert
 * @param fileName name of the resulting file
 * @param contentType content type of the item
 * @returns file
 */
export async function convertBase64ToFile(
  base64String: string,
  fileName: string,
  contentType = '',
) {
  const blob = await convertBase64ToBlob(base64String, contentType);
  return new File([blob], fileName, { type: contentType });
}

/**
 * Convert file to base64 (useful for storing files in session storage)
 *
 * @param file File to convert to base64
 * @returns base64 string
 */
export function convertFileToBase64(file: any) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
