import { proxyUrl } from 'config/webService';

/**
 * Performs a fetch and validates the http status.
 *
 * @param apiUrl The webservice url to fetch data from
 * @returns A promise that resolves to the fetch response.
 */
export function fetchCheck(url: string, useProxy: boolean = false) {
  const apiUrl = useProxy ? proxyUrl + url : url;
  return fetch(apiUrl).then(checkResponse);
}

/**
 * Performs a post request and validates the http status.
 *
 * @param apiUrl The webservice url to post against
 * @param data The data to send
 * @param headers (optional) The headers to send
 * @returns A promise that resolves to the fetch response.
 */
export function fetchPost(
  url: string,
  data: object,
  useProxy: boolean = false,
  headers: any = { 'content-type': 'application/x-www-form-urlencoded' },
) {
  const apiUrl = useProxy ? proxyUrl + url : url;

  // build the url search params
  const body = new URLSearchParams();
  for (let [key, value] of Object.entries(data)) {
    // get the value convert JSON to strings where necessary
    let valueToAdd = value;
    if (typeof value === 'object') {
      valueToAdd = JSON.stringify(value);
    }

    body.append(key, valueToAdd);
  }

  return fetch(apiUrl, {
    method: 'POST',
    headers,
    body,
  }).then(checkResponse);
}

/**
 * Performs a post request with a file and validates the http status.
 *
 * @param apiUrl The webservice url to post against
 * @param data The data to send
 * @param file The file to send
 * @returns A promise that resolves to the fetch response.
 */
export function fetchPostFile(
  url: string,
  data: object,
  file: any,
  useProxy: boolean = false,
) {
  const apiUrl = useProxy ? proxyUrl + url : url;

  // build the url search params
  const body = new FormData();
  for (let [key, value] of Object.entries(data)) {
    // get the value convert JSON to strings where necessary
    let valueToAdd = value;
    if (typeof value === 'object') {
      valueToAdd = JSON.stringify(value);
    }

    body.append(key, valueToAdd);
  }
  body.append('file', file);

  return fetch(apiUrl, {
    method: 'POST',
    body,
  }).then(checkResponse);
}

/**
 * Validates the http status code of the fetch's response.
 *
 * @param response The response object returned by the web service.
 * @returns A promise that resolves to the fetch response.
 */
export function checkResponse(response: any) {
  return new Promise((resolve, reject) => {
    if (response.status === 200) {
      response.json().then((json: any) => resolve(json));
    } else {
      reject(response);
    }
  });
}

/**
 * Makes a request to a GP Server using the esri Geoprocessor. Only returns a single
 * output parameter that corresponds to the provided outputParameter.
 *
 * @param Geoprocessor The esri Geoprocessor constructor
 * @param url The url of GP Server Task
 * @param inputParameters The input parameters for the task
 * @param outputParameter The output parameter for the task to return
 * @param outSpatialReference The spatial reference for the output data (default: { wkid: 3857 })
 * @returns A promise the resolves to the geoprocessor response.
 */
export function geoprocessorFetch({
  Geoprocessor,
  url,
  inputParameters,
  outSpatialReference = { wkid: 3857 },
}: {
  Geoprocessor: __esri.GeoprocessorConstructor;
  url: string;
  inputParameters: any;
  outSpatialReference?: any;
}): Promise<any> {
  return new Promise<any>((resolve, reject) => {
    const geoprocessor = new Geoprocessor({
      url,
      outSpatialReference,
    });

    geoprocessor
      .execute(inputParameters)
      .then((res) => {
        resolve(res);
      })
      .catch((err) => reject(err));
  });
}
