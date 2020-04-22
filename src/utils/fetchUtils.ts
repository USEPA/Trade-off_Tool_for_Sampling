/**
 * Performs a fetch and validates the http status.
 *
 * @param apiUrl The webservice url to fetch data from
 * @returns A promise that resolves to the fetch response.
 */
export function fetchCheck(apiUrl: string) {
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
  apiUrl: string,
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
export function fetchPostFile(apiUrl: string, data: object, file: any) {
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
  outputParameter,
  outSpatialReference = { wkid: 3857 },
}: {
  Geoprocessor: __esri.GeoprocessorConstructor;
  url: string;
  inputParameters: any;
  outputParameter: string;
  outSpatialReference?: any;
}): Promise<__esri.ParameterValue> {
  return new Promise<__esri.ParameterValue>((resolve, reject) => {
    const geoprocessor = new Geoprocessor({
      url,
      outSpatialReference,
    });

    geoprocessor
      .submitJob(inputParameters)
      .then((jobInfo) => {
        const jobId = jobInfo.jobId;

        geoprocessor
          .waitForJobCompletion(jobId)
          .then(() => {
            geoprocessor
              .getResultData(jobId, outputParameter)
              .then((res) => resolve(res))
              .catch((err) => reject(err));
          })
          .catch((err) => reject(err));
      })
      .catch((err) => reject(err));
  });
}

/**
 * Makes a request to a GP Server using the esri Geoprocessor. Returns multiple
 * output parameters that corresponds to the provided outputParameters array.
 *
 * @param Geoprocessor The esri Geoprocessor constructor
 * @param url The url of GP Server Task
 * @param inputParameters The input parameters for the task
 * @param outputParameters An array of output parameters for the task to return
 * @param outSpatialReference The spatial reference for the output data (default: { wkid: 3857 })
 * @returns A promise the resolves to the geoprocessor response.
 */
type MultiResponse = { [key: string]: __esri.ParameterValue };
export function geoprocessorMultiOutputFetch({
  Geoprocessor,
  url,
  inputParameters,
  outputParameters,
  outSpatialReference = { wkid: 3857 },
}: {
  Geoprocessor: __esri.GeoprocessorConstructor;
  url: string;
  inputParameters: any;
  outputParameters: string[];
  outSpatialReference?: any;
}): Promise<MultiResponse> {
  return new Promise<MultiResponse>((resolve, reject) => {
    const geoprocessor = new Geoprocessor({
      url,
      outSpatialReference,
    });

    geoprocessor
      .submitJob(inputParameters)
      .then((jobInfo) => {
        const jobId = jobInfo.jobId;

        geoprocessor
          .waitForJobCompletion(jobId)
          .then(() => {
            const promises: Promise<__esri.ParameterValue>[] = [];

            outputParameters.forEach((name) => {
              const promise = geoprocessor.getResultData(jobId, name);
              promises.push(promise);
            });

            Promise.all(promises)
              .then((responses) => {
                const objectResponse: MultiResponse = {};

                responses.forEach((res, index) => {
                  const name = outputParameters[index];
                  objectResponse[name] = res;
                });

                resolve(objectResponse);
              })
              .catch((err) => reject(err));
          })
          .catch((err) => reject(err));
      })
      .catch((err) => reject(err));
  });
}
