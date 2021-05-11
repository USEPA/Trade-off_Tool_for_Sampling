/**
 * Performs a fetch and validates the http status.
 *
 * @param apiUrl The webservice url to fetch data from
 * @returns A promise that resolves to the fetch response.
 */
export function fetchCheck(url: string) {
  return fetch(url).then(checkResponse);
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
export function fetchPostFile(url: string, data: object, file: any) {
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
      requestOptions: {
        timeout: 120000,
        cacheBust: true,
      },
    });

    geoprocessor
      .execute(inputParameters)
      .then((res) => {
        resolve(res);
      })
      .catch((err) => reject(err));
  });
}
