const axios = require('axios');
const express = require('express');
const { readFile } = require('node:fs/promises');
const path = require('node:path');
const { getEnvironment } = require('../utilities/environment');
const logger = require('../utilities/logger');
const log = logger.logger;

function logError(error, metadataObj, isLocal) {
  if (isLocal) {
    log.error(error);
    return;
  }

  if (typeof error.toJSON === 'function') {
    log.debug(logger.formatLogMsg(metadataObj, error.toJSON()));
  }

  const errorStatus = error.response?.status;
  const errorMethod = error.response?.config?.method?.toUpperCase();
  const errorUrl = error.response?.config?.url;
  const message = `S3 Error: ${errorStatus} ${errorMethod} ${errorUrl}`;
  log.error(logger.formatLogMsg(metadataObj, message));
}

// local development: read files directly from disk
// Cloud.gov: fetch files from the public s3 bucket
async function getFile(
  s3BucketUrl,
  filename,
  isLocal,
  responseType = undefined,
  responseEncoding = undefined,
) {
  return isLocal
    ? readFile(path.resolve(__dirname, '../../public', filename))
    : axios({
        method: 'get',
        url: `${s3BucketUrl}/${filename}`,
        timeout: 10000,
        responseType,
        responseEncoding,
      });
}

async function getUserGuide(app, res, req, path) {
  const metadataObj = logger.populateMetdataObjFromRequest(req);

  const { isLocal, isTest } = getEnvironment();
  const isLocalTest = isLocal || isTest;
  const s3BucketUrl = app.get('s3_bucket_url');

  try {
    const data = await getFile(
      s3BucketUrl,
      path,
      isLocalTest,
      'arraybuffer',
      'binary',
    );

    res.contentType('application/pdf');
    res.send(isLocalTest ? data : data.data);
  } catch (error) {
    logError(error, metadataObj, isLocalTest);

    return res
      .status(error?.response?.status || 500)
      .json({ message: 'Error getting static content from S3 bucket' });
  }
}

// local development: no further processing of strings needed
// Cloud.gov: get data from responses
function parseResponse(res, isLocal) {
  if (Array.isArray(res)) {
    return isLocal ? res.map((r) => JSON.parse(r)) : res.map((r) => r.data);
  } else {
    return isLocal ? JSON.parse(res) : res.data;
  }
}

module.exports = function (app) {
  const router = express.Router();

  function getFiles(req, res, filenames, dataMapper) {
    const metadataObj = logger.populateMetdataObjFromRequest(req);

    const { isLocal, isTest } = getEnvironment();
    const isLocalTest = isLocal || isTest;
    const s3BucketUrl = app.get('s3_bucket_url');

    const promise =
      filenames.length > 1
        ? Promise.all(
            filenames.map((filename) => {
              return getFile(s3BucketUrl, filename, isLocalTest);
            }),
          )
        : getFile(s3BucketUrl, filenames[0], isLocalTest);

    promise
      .then((stringsOrResponses) => {
        return parseResponse(stringsOrResponses, isLocalTest);
      })
      .then((data) => {
        if (dataMapper) return dataMapper(data);
        return data;
      })
      .then((data) => res.json(data))
      .catch((error) => {
        logError(error, metadataObj, isLocalTest);

        return res
          .status(error?.response?.status || 500)
          .json({ message: 'Error getting static content from S3 bucket' });
      });
  }

  router.get('/health', function (req, res, next) {
    res.json({ status: 'UP' });
  });

  // --- get static content from S3
  router.get('/lookupFiles', (req, res) => {
    const { isLocal, isTest } = getEnvironment();
    const isLocalTest = isLocal || isTest;
    const s3BucketUrl = app.get('s3_bucket_url');

    // NOTE: static content files found in `app/server/app/public/data` directory
    getFile(
      s3BucketUrl,
      'data/config/defaultGsg.gsg',
      isLocalTest,
      'arraybuffer',
      'binary',
    )
      .then((gsg) => {
        return isLocalTest ? gsg : gsg.data;
      })
      .then((gsg) => {
        getFiles(
          req,
          res,
          [
            'data/config/layerProps.json',
            'data/config/services.json',
            'data/notifications/messages.json',
            'data/cache/sampleMetadata.json',
            'data/technologyTypes/types.json',
            'data/cache/deconTechFactors.json',
            'data/cache/deconMaterialFactors.json',
            'data/cache/deconBuildingFactors.json',
            'data/cache/deconWasteFactors.json',
            'data/cache/deconBuildingClassFactors.json',
          ],
          (data) => {
            return {
              layerProps: data[0],
              services: data[1],
              notifications: data[2],
              sampleMetadata: data[3],
              technologyTypes: data[4],
              deconTechFactors: data[5],
              deconMaterialFactors: data[6],
              deconBuildingFactors: data[7],
              deconWasteFactors: data[8],
              deconBuildingClassFactors: data[9],
              defaultGsg: `data:application/octet-stream;base64,${gsg.toString('base64')}`,
            };
          },
        );
      })
      .catch((error) => {
        logError(error, metadataObj, isLocalTest);

        return res
          .status(error?.response?.status || 500)
          .json({ message: 'Error getting static content from S3 bucket' });
      });
  });

  // --- get static content from S3
  router.get('/supportedBrowsers', (req, res) => {
    // NOTE: static content files found in `app/server/app/public/data` directory
    getFiles(req, res, ['data/config/supported-browsers.json']);
  });

  // --- get static content from S3
  router.get('/tots/userGuide', (req, res) => {
    getUserGuide(app, res, req, 'data/documents/TOTS-Users-Guide.pdf');
  });

  router.get('/tods/userGuide', (req, res) => {
    getUserGuide(app, res, req, 'data/documents/TODS-Users-Guide.pdf');
  });

  router.use((req, res) => {
    res.status(404).json({ message: 'The api route does not exist.' });
  });

  app.use('/api', router);
};
