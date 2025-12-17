const { URL } = require('url');
const express = require('express');
const axios = require('axios');
const bodyParser = require('body-parser');
const querystring = require('querystring');
const config = require('../config/proxyConfig.json');
const { getEnvironment } = require('../utilities/environment');
const logger = require('../utilities/logger');
const log = logger.logger;

const { isLocal, isTest } = getEnvironment();

module.exports = function (app) {
  const router = express.Router();

  function deleteTSHeaders(response) {
    if (!response) return;

    /* This is a workaround for an issue where service responses don't 
      include headers. */
    if (!response.headers) response.headers = {};

    /* The EPA Terminology Services (TS) exposes sensitive 
      information about its underlying technology. While we 
      notified the TS Team about this, they have not had time 
      to address it with the product vendor. Based on this,
      we're going to programmatically remove them. */
    delete response.headers['x-powered-by'];
    delete response.headers['server'];
    delete response.headers['x-aspnet-version'];
    // end of EPA TS work around.

    // Disable cache for all proxy requests
    response.headers['cache-control'] = 'no-cache';
  }

  // only expose proxy in local environment or if env flag set
  if (!isLocal && !isTest && process.env.ALLOW_PROXY !== 'true') return;

  router.get('/', function (req, res, next) {
    let authoriztedURL = false;
    var parsedUrl;
    let metadataObj = logger.populateMetdataObjFromRequest(req);

    try {
      if (req.originalUrl) {
        parsedUrl = querystring.unescape(req.originalUrl.substring(11)); //get rid of /proxy?url=

        const url = new URL(parsedUrl);
        authoriztedURL = config.urls.includes(url.host.toLowerCase());
      } else {
        let msg = 'Missing proxy request';
        log.warn(logger.formatLogMsg(metadataObj, msg));
        res.status(403).json({ message: msg });
        return;
      }

      if (
        !authoriztedURL &&
        !parsedUrl.toLowerCase().includes('://' + req.hostname.toLowerCase())
      ) {
        let msg = 'Invalid proxy request';
        log.error(
          logger.formatLogMsg(metadataObj, `${msg}. parsedUrl = ${parsedUrl}`),
        );
        res.status(403).json({ message: msg });
        return;
      }
    } catch (err) {
      let msg = 'Invalid URL';
      log.error(
        logger.formatLogMsg(metadataObj, `${msg}. parsedUrl = ${parsedUrl}`),
      );
      res.status(403).json({ message: msg });
      return;
    }

    let request_headers = {};
    if (
      !isLocal &&
      !isTest &&
      parsedUrl.toLowerCase().includes('://' + req.hostname.toLowerCase()) &&
      parsedUrl.toLowerCase().includes('/data/')
    ) {
      //change out the URL for the internal s3 bucket that support this instance of the application in Cloud.gov
      var jsonFileName = parsedUrl.split('/data/').pop();
      parsedUrl = app.get('s3_bucket_url') + '/data/' + jsonFileName;
    }

    axios({
      method: req.query.method,
      url: parsedUrl,
      headers: request_headers,
      timeout: 10000,
      responseType: 'arraybuffer',
    })
      .then((response) => {
        if (response.status !== 200) {
          log.error(
            logger.formatLogMsg(
              metadataObj,
              `Non-200 returned from web service. parsedUrl = ${parsedUrl}.`,
            ),
          );
        } else {
          log.info(
            logger.formatLogMsg(
              metadataObj,
              `Successful request: ${parsedUrl}`,
            ),
          );
        }

        deleteTSHeaders(response);
        res
          .status(response.status)
          .header(response.headers)
          .send(response.data);
      })
      .catch((err) => {
        log.error(
          logger.formatLogMsg(
            metadataObj,
            `Unsuccessful request. parsedUrl = ${parsedUrl}. Detailed error: ${err}`,
          ),
        );
        if (res.headersSent) {
          log.error(
            logger.formatLogMsg(
              metadataObj,
              `Odd header already sent check = ${parsedUrl}. Detailed error: ${err}`,
            ),
          );
        }

        deleteTSHeaders(err.response);
        res
          .status(err.response.status)
          .header(err.response.headers)
          .send(err.response.data);
      });
  });

  router.post('/', bodyParser.json(), function (req, res, next) {
    let authoriztedURL = false;
    var parsedUrl;
    let metadataObj = logger.populateMetdataObjFromRequest(req);

    try {
      if (req.originalUrl) {
        parsedUrl = querystring.unescape(req.originalUrl.substring(11)); //get rid of /proxy?url=

        const url = new URL(parsedUrl);
        authoriztedURL = config.urls.includes(url.host.toLowerCase());
      } else {
        let msg = 'Missing proxy request';
        log.warn(logger.formatLogMsg(metadataObj, msg));
        res.status(403).json({ message: msg });
        return;
      }

      if (
        !authoriztedURL &&
        !parsedUrl.toLowerCase().includes('://' + req.hostname.toLowerCase())
      ) {
        let msg = 'Invalid proxy request';
        log.error(
          logger.formatLogMsg(metadataObj, `${msg}. parsedUrl = ${parsedUrl}`),
        );
        res.status(403).json({ message: msg });
        return;
      }
    } catch (err) {
      let msg = 'Invalid URL';
      log.error(
        logger.formatLogMsg(metadataObj, `${msg}. parsedUrl = ${parsedUrl}`),
      );
      res.status(403).json({ message: msg });
      return;
    }

    axios({
      method: req.method,
      url: parsedUrl,
      headers: {},
      data: req.body,
      timeout: 10000,
      responseType: 'arraybuffer',
    })
      .then((response) => {
        if (response.status !== 200) {
          log.error(
            logger.formatLogMsg(
              metadataObj,
              `Non-200 returned from web service. parsedUrl = ${parsedUrl}.`,
            ),
          );
        } else {
          log.info(
            logger.formatLogMsg(
              metadataObj,
              `Successful request: ${parsedUrl}`,
            ),
          );
        }

        res.status(response.status).send(response.data);
      })
      .catch((err) => {
        log.error(
          logger.formatLogMsg(
            metadataObj,
            `Unsuccessful request. parsedUrl = ${parsedUrl}. Detailed error: ${err}`,
          ),
        );
        if (res.headersSent) {
          log.error(
            logger.formatLogMsg(
              metadataObj,
              `Odd header already sent check = ${parsedUrl}. Detailed error: ${err}`,
            ),
          );
        }

        deleteTSHeaders(err.response);

        if (err.response) {
          res
            .status(err.response.status)
            .header(err.response.headers)
            .send(err.response.data);
        } else {
          res.status(500);
        }
      });
  });

  router.use((req, res) => {
    res.status(404).json({ message: 'The api route does not exist.' });
  });

  app.use('/proxy', router);
};
