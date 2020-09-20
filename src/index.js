const puppeteer = require('puppeteer');
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
    puppeteer.launch().then((browser) => {

      browser.newPage().then((page) => {

        page.goto(this.login_page).then(() => {

          page.on('response', (response) => {
            if (response.url().indexOf('/api/ConsumptionDetailsStats') > 0) {
              response.json().then((json) => {
                console.info(new Date().toISOString() + ': Received', json);
              });
            }
            if (response.url().indexOf('/api/bills') > 0) {
              response.json().then((json) => {
                console.info(new Date().toISOString() + ': Received', json);
              });
            }
            if (response.url().indexOf('/api/ConsumptionStatistics/Consumption') > 0) {
              response.json().then((json) => {
                console.info(new Date().toISOString() + ': Received', json);
              });
            }
            if (response.url().indexOf('/api/sitecore/graph/getreadings') > 0) {
              response.json().then((json) => {
                console.info(new Date().toISOString() + ': Received', json, response.request().postData());
              });
            }
          });

          page.evaluate((username, password) => {
            document.querySelector('#form-field-login-main-username').value = username;
            document.querySelector('#form-field-login-main-password').value = password;
            document.querySelector('#loginButton').click();
          }, process.env.DEWA_USERNAME, process.env.DEWA_PASSWORD).then(() => {

            this.wait(15000).then(() => {

              page.$x('//*[@id="dvElectricity"]//ul//li[contains(.,"Daily")]').then((element) => {
                _.first(element).click();
              });

              this.wait(10000).then(() => {
                page.close().then(() => {
                  browser.close();
                })
              });

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

  screenshot(page) {
    const d = new Date();
    const n = d.toTimeString();
    page.screenshot({ path: 'screenshots/' + n + '.png' });
  }
}

const app = new DEWAExtractor();
app.init();