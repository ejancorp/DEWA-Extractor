const phantom = require('phantom');
const cheerio = require('cheerio');
const dateTime = require('node-datetime');
const Promise = require('bluebird');
const _ = require('lodash');

require('dotenv').config()

process.on('SIGINT', function () {
  process.exit();
});

class DEWAExtractor {

  constructor() {
    this.login_page = 'https://www.dewa.gov.ae/en/consumer/my-account/login';
  }

  init() {
    phantom.create().then((ph) => {
      ph.createPage().then((page) => {

        page.on("onResourceRequested", (request) => {
          if (request.url.indexOf('ConsumptionDetailsStats') > 0) {
            console.info(new Date().toISOString() + ': Request', request)
          }
        });

        page.on("onResourceReceived", (response) => {
          if (response.url.indexOf('ConsumptionDetailsStats') > 0 && response.stage === 'end') {
            console.info(new Date().toISOString() + ': Received', response)
          }
        });

        page.open(this.login_page).then(() => {

          const username = process.env.DEWA_USERNAME;
          const password = process.env.DEWA_PASSWORD;

          page.evaluate(function (username, password) {
            document.querySelector('#form-field-login-main-username').value = username;
            document.querySelector('#form-field-login-main-password').value = password;
            document.querySelector('#loginButton').click();
          }, username, password).then(() => {

            this.wait(10000).then(() => {

              const d = new Date();
              const n = d.toTimeString();

              page.render('screenshots/' + n + '.png');
              page.close().then(() => {
                ph.exit();
              })

            });

          });
        });

      });
    });
  }

  wait(timeout) {
    return new Promise((resolve) => {
      return setTimeout(() => {
        return resolve(true);
      }, timeout);
    });
  }

  setup() {

  }

}

const app = new DEWAExtractor();
app.init();