const CronJob = require('cron').CronJob;
const winston = require('winston');
const express = require('express');
const { createObjectCsvStringifier } = require('csv-writer');

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

const dateDMYToEpochTimestampInSeconds = (dateString) => {
  const parts = dateString.split('/');
  if (parts.length !== 3) {
    throw new Error('Invalid date format. Expected format: d/m/y');
  }

  const day = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1; // Months are zero-based in JavaScript
  const year = parseInt(parts[2], 10);

  const epochTimestampInSeconds = Date.UTC(year, month, day) / 1000;
  return epochTimestampInSeconds;
}

server.get('/csv/electricity', (_req, res) => {
  return new Promise((resolve, reject) => {
    return Responses.get().then(result => {
      return resolve(result);
    }).catch(err => {
      return reject(err);
    });
  }).then(data => {
    let result = JSON.parse(data);

    let electricity = result.historical.filter(h => h.params.rtype === 'E').map(h => {
      return {
        data: h.data.map((data, idx) => {
          let day = idx + 1;
          let dateString = `${day}/${h.params.month}/${h.params.year}`;
          return {
            timestamp: dateDMYToEpochTimestampInSeconds(dateString),
            value: data || 0
          }
        }),
        labels: {
          year: h.params.year,
          month: h.params.month,
          date: h.params.date,
        }
      }
    }).map(h => {
      let obj = {};
      h.data.forEach(d => {
        obj[d.timestamp] = d.value;
      });
      return obj;
    });

    let flatten = electricity.flat(1);

    return res.json(flatten);
  });
});

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

    result.reporting = {
      electricity: result.historical.filter(h => h.params.rtype === 'E').map(h => {
        return {
          data: h.data.map((data, idx) => {
            let day = idx + 1;
            let dateString = `${day}/${h.params.month}/${h.params.year}`;
            return {
              timestamp: dateDMYToEpochTimestampInSeconds(dateString),
              value: data || 0
            }
          }),
          labels: {
            year: h.params.year,
            month: h.params.month,
            date: h.params.date,
          }
        }
      }),
      water: result.historical.filter(h => h.params.rtype === 'W').map(h => {
        return {
          data: h.data.map((data, idx) => {
            let day = idx + 1;
            let dateString = `${day}/${h.params.month}/${h.params.year}`;
            return {
              timestamp: dateDMYToEpochTimestampInSeconds(dateString),
              value: data || 0
            }
          }),
          labels: {
            year: h.params.year,
            month: h.params.month,
            date: h.params.date,
          }
        }
      }),
    };

    return res.json(result);
  })
});

server.listen(port, '0.0.0.0', () => {
  console.log(`App listening at http://localhost:${port}`)
});
