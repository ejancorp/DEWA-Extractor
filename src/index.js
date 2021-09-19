const CronJob = require('cron').CronJob;
const Extractor = require('./extractor');
const winston = require('winston');
const express = require('express');
const { Pool } = require('pg');

require('dotenv').config()

process.on('SIGINT', function () {
  process.exit();
});

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
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
  database_url: process.env.DATABASE_URL,
  devmode: (process.env.NODE_ENV === 'production' ? false : true)
}, logger);

app.run().then(() => logger.info('Initial Run... Done...'));

const job = new CronJob('0 */6 * * *', () => {
  logger.info('STARTING CRON');
  app.run().then(() => logger.info('ENDING CRON'));
});

job.start();

server.get('/', (req, res) => {
  return new Promise((resolve, reject) => {
    return pool.query(`SELECT response FROM responses ORDER BY created_at DESC`, (error, results) => {
      if (error) {
        return reject(false);
      }
      const [first] = results.rows;
      return resolve(first);
    })
  }).then(data => res.json(data.response))
});

server.listen(port, () => {
  console.log(`App listening at http://localhost:${port}`)
})