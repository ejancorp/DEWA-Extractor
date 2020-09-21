const CronJob = require('cron').CronJob;
const Extractor = require('./extractor');
const winston = require('winston');

require('dotenv').config()

process.on('SIGINT', function () {
  process.exit();
});

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

const job = new CronJob('0 */6 * * *', () => {

  logger.info('STARTING CRON');

  const app = new Extractor({
    username: process.env.DEWA_USERNAME,
    password: process.env.DEWA_PASSWORD,
    database_url: process.env.FIREBASE_DB_URL,
    database_credential_file: process.env.FIREBASE_CREDENTIAL_FILE
  }, logger);

  app.run().then(() => logger.info('ENDING CRON'))
});

job.start();