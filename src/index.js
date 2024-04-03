const CronJob = require('cron').CronJob;
const winston = require('winston');
const express = require('express');

const Extractor = require('./extractor');
const Responses = require('./responses');

require('dotenv').config()

process.on('SIGINT', function () {
  process.exit();
});

const port = parseInt(process.env.PORT, 10) || 8081;
const server = express();

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.timestamp(),
        winston.format.align(),
        winston.format.printf(info => `${info.timestamp} ${info.level}: ${info.message}`)
      )
    })
  ],
});

const app = new Extractor({
  username: process.env.DEWA_USERNAME,
  password: process.env.DEWA_PASSWORD,
  chromepath: process.env.PUPPETEER_EXECUTABLE_PATH,
  headless: process.env.PUPPETEER_HEADLESS
}, logger);

app.run().then(() => logger.info('Initial Run... Done...'));

const job = new CronJob('0 */6 * * *', () => {
  logger.info('STARTING CRON');
  app.run().then(() => logger.info('ENDING CRON')).catch(error => console.error(error));
});

job.start();

server.get('/', (_req, res) => {
  return new Promise((resolve, reject) => {
    return Responses.get().then(result => {
      return resolve(result);
    }).catch(err => {
      return reject(err);
    });
  }).then(data => {

    let result = JSON.parse(data);
    let consumption = result?.consumption || [{}];
    let currentDay = new Date().getDate();
    let previousDay = currentDay <= 1 ? 1 : currentDay - 1;
    let dayIndex = previousDay - 1;

    result.current = consumption[0];
    result.summary = {
      latest: {
        electricity: result.readings.find(r => r.params.rtype === 'E')?.data[dayIndex] || 0,
        water: result.readings.find(r => r.params.rtype === 'W')?.data[dayIndex] || 0,
      },
      totals: {
        electricity: result.readings.find(r => r.params.rtype === 'E')?.data.filter((_d, i) => (i <= dayIndex)).reduce((p, a) => p + a, 0),
        water: result.readings.find(r => r.params.rtype === 'W')?.data.filter((_d, i) => (i <= dayIndex)).reduce((p, a) => p + a, 0),
      }
    };

    return res.json(result);
  })
});

server.listen(port, '0.0.0.0', () => {
  console.log(`App listening at http://localhost:${port}`)
});
