import { escapeRegex } from 'utils/utils';

/**
 * Performs a fetch and validates the http status.
 *
 * @param apiUrl The webservice url to fetch data from
 * @returns A promise that resolves to the fetch response.
 */
export function fetchCheck(url: string) {
  const startTime = performance.now();
  return fetch(url)
    .then((response: any) => {
      logCallToGoogleAnalytics(url, response.status, startTime);
      return checkResponse(response);
    })
    .catch((err) => {
      console.error(err);

      let status = err;
      if (err && err.status) status = err.status;
      logCallToGoogleAnalytics(url, status, startTime);
      return checkResponse(err);
    });
}

/**
 * Performs a fetch through the TOTS proxy.
 *
 * @param url The webservice url to fetch data from
 * @returns A promise that resolves to the fetch response.
 */
export function proxyFetch(url: string) {
  const { REACT_APP_PROXY_URL } = process.env;
  // if environment variable is not set, default to use the current site origin
  const proxyUrl = REACT_APP_PROXY_URL || `${window.location.origin}/proxy`;

  return fetchCheck(`${proxyUrl}?url=${url}`);
}

/**
 * Performs a fetch to get a lookup file from S3.
 *
 * @param path The path to the lookup file to return
 * @returns A promise that resolves to the fetch response.
 */
export function lookupFetch(path: string) {
  const { REACT_APP_SERVER_URL } = process.env;
  const baseUrl = REACT_APP_SERVER_URL || window.location.origin;
  const url = `${baseUrl}/data/${path}`;

  return new Promise<Object>((resolve, reject) => {
    // Function that fetches the lookup file.
    // This will retry the fetch 3 times if the fetch fails with a
    // 1 second delay between each retry.
    const fetchLookup = (retryCount: number = 0) => {
      proxyFetch(url)
        .then((data: any) => {
          resolve(data);
        })
        .catch((err) => {
          console.error(err);

          // resolve the request when the max retry count of 3 is hit
          if (retryCount === 3) {
            reject(err);
          } else {
            // recursive retry (1 second between retries)
            console.log(
              `Failed to fetch ${path}. Retrying (${retryCount + 1} of 3)...`,
            );
            setTimeout(() => fetchLookup(retryCount + 1), 1000);
          }
        });
    };

    fetchLookup();
  });
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
  headers: any = { 'content-type': 'application/x-www-form-urlencoded' },
) {
  const startTime = performance.now();

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

  return fetch(url, {
    method: 'POST',
    headers,
    body,
  })
    .then((response) => {
      logCallToGoogleAnalytics(url, response.status, startTime);
      return checkResponse(response);
    })
    .catch((err) => {
      console.error(err);
      logCallToGoogleAnalytics(url, err, startTime);
      return checkResponse(err);
    });
}

/**
 * Performs a post request with a file and validates the http status.
 *
 * @param apiUrl The webservice url to post against
 * @param data The data to send
 * @param file The file to send
 * @returns A promise that resolves to the fetch response.
 */
export function fetchPostFile(url: string, data: object, file: any) {
  const startTime = performance.now();

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

  return fetch(url, {
    method: 'POST',
    body,
  })
    .then((response) => {
      logCallToGoogleAnalytics(url, response.status, startTime);
      return checkResponse(response);
    })
    .catch((err) => {
      console.error(err);
      logCallToGoogleAnalytics(url, err, startTime);
      return checkResponse(err);
    });
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
    const startTime = performance.now();

    const geoprocessor = new Geoprocessor({
      url,
      outSpatialReference,
    });

    geoprocessor
      .execute(inputParameters)
      .then((res) => {
        logCallToGoogleAnalytics(url, res.status, startTime);
        resolve(res);
      })
      .catch((err) => {
        console.error(err);
        logCallToGoogleAnalytics(url, err, startTime);
        return checkResponse(err);
      });
  });
}

/**
 * Logs webservice calls to Google Analytics along with timing information.
 *
 * @param url The url of the web service call
 * @param status The response status code of the service call
 * @param startTime The time the web service was called
 * @returns
 */
export function logCallToGoogleAnalytics(
  url: string,
  status: number,
  startTime: number,
) {
  if (!window.gaTarget) return;
  if (!window.ga) return;

  const duration = performance.now() - startTime;

  // combine the web service and map service mappings
  let mapping = window.googleAnalyticsMapping;

  // get the short name from the url
  let eventAction = 'UNKNOWN';
  mapping.forEach((item: any) => {
    if (eventAction === 'UNKNOWN' && wildcardIncludes(url, item.wildcardUrl)) {
      eventAction = item.name;
    }
  });
  eventAction = `ow-tots1-${eventAction}`;

  const eventLabel = `${url} | status:${status} | time:${duration}`;

  // log to google analytics if it has been setup
  window.logToGa('send', 'event', 'Web-service', eventAction, eventLabel);
}

/**
 * Determines if a string includes another substring with the
 * support of wildcards.
 *
 * @param str The string to search in
 * @param rule The string to find with or without wildcards
 * @returns True if the string does containe the substring, otherwise false
 */
function wildcardIncludes(str: string, rule: string) {
  return new RegExp(
    '^' + rule.split('*').map(escapeRegex).join('.*') + '$',
  ).test(str);
}

/**
 * Gets a string representing what environment the app is running on
 *
 * @returns A string representing the current environment
 */
export const getEnvironmentString = function () {
  const envStringMap: any = {
    localhost: 'onlocalhost',
    'tots-dev.app.cloud.gov': 'ondev',
    'tots-stage.app.cloud.gov': 'onstage',
  };

  return envStringMap[window.location.hostname];
};
