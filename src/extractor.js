const puppeteer = require('puppeteer');
const Promise = require('bluebird');
const _ = require('lodash');
const moment = require('moment');

class DEWAExtractor {

  constructor(options, logger) {
    this.options = _.extend({
      username: '',
      password: '',
      login_page: 'https://www.dewa.gov.ae/en/consumer/my-account/login',
      username_input_selector: '#form-field-login-main-username',
      password_input_selector: '#form-field-login-main-password',
      login_button_selector: '#loginButton',
      electricity_daily_button_xpath: '//*[@id="dvElectricity"]//ul//li[contains(.,"Daily")]',
      screenshot: false,
      devmode: true,
    }, options);

    this.data = {};
    this.logger = logger;
  }

  run() {

    this.data = {};

    return this.fetch().then(() => {
      const dt = new Date().getTime();
      const result = _.extend(this.data, { datetime: dt });

      this.logger.info(JSON.stringify(result));
    });
  }

  createBrowser() {
    if (this.options.devmode) {

      return puppeteer.launch();
    }

    return puppeteer.launch({
      headless: true,
      executablePath: '/usr/bin/chromium-browser',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
  }

  async fetch() {
    const browser = await this.createBrowser();
    const page = await browser.newPage();

    await page.goto(this.options.login_page, { waitUntil: 'networkidle2', timeout: 0 });

    await page.evaluate((options) => {
      document.querySelector(options.username_input_selector).value = options.username;
      document.querySelector(options.password_input_selector).value = options.password;
      document.querySelector(options.login_button_selector).click();
    }, this.options);

    page.on('response', response => this.processResponse(response));

    await page.waitForNavigation({
      waitUntil: 'networkidle2',
      timeout: 0
    });

    const buttons = await page.$x(this.options.electricity_daily_button_xpath);
    const button = _.first(buttons);

    button.click();

    await this.wait(10000);

    if (this.options.screenshot) {
      await this.screenshot(page);
    }

    await browser.close();
  }

  processResponse(response) {
    if (response.url().indexOf('/api/ConsumptionDetailsStats') > 0) {
      response.json().then(json => this.processConsumption(json));
    }
    if (response.url().indexOf('/api/bills') > 0) {
      response.json().then(json => this.processBills(json));
    }
    if (response.url().indexOf('/api/ConsumptionStatistics/Consumption') > 0) {
      response.json().then(json => this.processStatistics(json));
    }
    if (response.url().indexOf('/api/sitecore/graph/getreadings') > 0) {
      response.json().then(json => this.processDailyReadings(json, response.request().postData()));
    }
  }

  processDailyReadings(jsonResponse, params) {
    const entries = this.paramsToObject(params);
    const result = { data: jsonResponse.data, params: entries };
    this.data.readings = result;
  }

  processStatistics(jsonResponse) {
    const series = jsonResponse.series.map((data) => {
      const utilityName = data.Utility === 0 ? 'Electicity' : 'Water';
      return _.extend(data, { name: utilityName });
    });
    const result = { series, meter: jsonResponse.meter };
    this.data.statistics = result;
  }

  processBills(jsonResponse) {
    this.data.bills = jsonResponse;
  }

  processConsumption(jsonResponse) {
    const series = jsonResponse.dataseries;
    const result = series.map((consumption) => {
      return {
        electricity: consumption.electricityconsumption,
        water: consumption.waterconsumption,
        carbon: consumption.carbonconsumption,
        period: moment(consumption.monthText, 'MMM YYYY').format('YYYY-MM'),
        period_formatted: moment(consumption.monthText, 'MMM YYYY').format('MMMM YYYY')
      }
    });
    this.data.consumption = result;
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
    return page.screenshot({ path: 'screenshots/' + n + '.png', fullPage: true });
  }

  paramsToObject(params) {
    const urlParams = new URLSearchParams(params);
    const entries = urlParams.entries();

    let result = {}
    for (let entry of entries) {
      const [key, value] = entry;
      result[key] = value;
    }
    return result;
  }
}

module.exports = DEWAExtractor;