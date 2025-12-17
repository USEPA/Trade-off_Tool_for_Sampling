const { GetObjectCommand } = require('@aws-sdk/client-s3');
const axios = require('axios');
const { readFileSync } = require('fs');
const { resolve } = require('path');
const { setTimeout } = require('timers/promises');
const { getEnvironment } = require('../server/utilities/environment');
const logger = require('../server/utilities/logger');
const {
  getS3Client,
  getS3Config,
  uploadFileS3,
} = require('../server/utilities/s3');

const log = logger.logger;

async function fetchRetry(key, url, retryCount = 0) {
  try {
    let res = await axios.get(url, {
      timeout: 10_000,
    });
    if (res.status !== 200) {
      if (retryCount < 3) {
        log.info(`Non-200 response returned from the ${key} service, retrying`);
        await setTimeout(5_000);
        return fetchRetry(key, url, retryCount + 1);
      } else {
        throw new Error(`${key} request retry count exceeded`);
      }
    }
    return res;
  } catch (err) {
    log.error(`Failed to get ${key} data: ${err}`);
  }
}

async function refreshCacheFile(key, url) {
  try {
    const data = [];
    let hasMoreData = true;
    let page = 1;
    while (hasMoreData) {
      log.info(`fetching data for page ${page} of ${key}`);
      const res = await fetchRetry(key, `${url}?page=${page}`);
      data.push(...res.data.data);
      if (data.length >= res.data.total) hasMoreData = false;
      else page += 1;
    }

    await uploadFileS3(`${key}.json`, JSON.stringify(data));
    log.info(`Success refreshing ${key} data`);
  } catch (ex) {
    log.error(ex);
  }
}

async function refreshCacheData() {
  log.info(
    `Running refreshCacheData cron task on instance: ${process.env.CF_INSTANCE_INDEX}`,
  );

  try {
    const { isLocal } = getEnvironment();

    // get the URL of the RADAR services
    let services;
    if (isLocal) {
      services = readFileSync(
        resolve(__dirname, '../public/data/config/services.json'),
        'utf8',
      );
    } else {
      const command = new GetObjectCommand({
        Bucket: getS3Config().bucket,
        Key: 'data/config/services.json',
      });
      const s3 = getS3Client();
      services = await (await s3.send(command)).Body.transformToString();
    }

    const radarDatasets = JSON.parse(services).radarDatasets;
    const requests = [];
    Object.entries(radarDatasets).forEach(([key, url]) => {
      requests.push(refreshCacheFile(key, url));
    });

    await Promise.all(requests);
  } catch (err) {
    log.error(`Failed to refresh cache: ${err}`);
  }
}

module.exports = refreshCacheData;

if (require.main === module) {
  log.info('Starting Task: refreshCacheData');
  refreshCacheData().then(() => log.info('Task Completed: refreshCacheData'));
}
