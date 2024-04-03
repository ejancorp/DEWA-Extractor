const Promise = require('bluebird');
const _ = require('lodash');
const moment = require('moment');

const puppeteer = require('puppeteer-extra')

// Add stealth plugin and use defaults 
const pluginStealth = require('puppeteer-extra-plugin-stealth')
const { executablePath } = require('puppeteer');

puppeteer.use(pluginStealth())

const Responses = require('./responses');

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
      water_daily_button_xpath: '//*[@id="dvWater"]//ul//li[contains(.,"Daily")]',
      screenshot: false,
      chromepath: false,
      headless: false
    }, options);

    this.data = {
      readings: [],
      historical: [],
    };
    this.logger = logger;
  }

  run() {

    this.data = {
      readings: [],
      historical: [],
    };

    return this.fetch().then(() => {
      const dt = new Date().getTime();
      const result = _.extend(this.data, { datetime: dt });

      return Responses.save(JSON.stringify(result)).then(() => {
        return this.logger.info(JSON.stringify(result));
      }).catch(error => console.error(error));

    }).catch(error => console.error(error));
  }

  createBrowser() {
    return puppeteer.launch({
      headless: this.options.headless || false,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
      executablePath: this.options.chromepath || executablePath()
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

    const electricityButtons = await page.$x(this.options.electricity_daily_button_xpath);
    const electricityButton = _.first(electricityButtons);
    electricityButton.click();

    await this.wait(3000);

    const waterButtons = await page.$x(this.options.water_daily_button_xpath);
    const waterButton = _.first(waterButtons);
    waterButton.click();

    await this.wait(3000);

    await page.evaluate(async (data) => {
      let electricityParams = data.readings.find(r => r.params.rtype === 'E').params;
      if (electricityParams) {

        let currentMonthNumber = Number(electricityParams.month);
        let monthArray = this.buildArrayFromLastNumber(currentMonthNumber);

        for (const item of monthArray) {
          await fetch("/api/sitecore/graph/getreadings", Object.assign({}, this.getFetchDefaultParams(), {
            body: this.objectToQueryString(Object.assign({}, electricityParams, {
              month: String(item),
              date: `${this.getMonthName(item)} ${electricityParams.year}`,
              custom: true
            }))
          }));
        }
      }
    }, this.data);

    await this.wait(10000);

    if (this.options.screenshot) {
      await this.screenshot(page);
    }

    await browser.close();
  }

  getFetchDefaultParams() {
    return {
      "headers": {
        "accept": "*/*",
        "accept-language": "en-US,en;q=0.9,zh-CN;q=0.8,zh;q=0.7",
        "adrum": "isAjax:true",
        "cache-control": "no-cache",
        "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
        "pragma": "no-cache",
        "sec-ch-ua": "\"Google Chrome\";v=\"123\", \"Not:A-Brand\";v=\"8\", \"Chromium\";v=\"123\"",
        "sec-ch-ua-mobile": "?0",
        "sec-ch-ua-platform": "\"macOS\"",
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-origin",
        "x-requested-with": "XMLHttpRequest"
      },
      "body": this.objectToQueryString({}),
      "method": "POST",
      "referrer": "https://dewa.gov.ae/en/consumer/my-account/dashboard",
      "referrerPolicy": "strict-origin-when-cross-origin",
      "mode": "cors",
      "credentials": "include"
    }
  }

  buildArrayFromLastNumber(lastNumber) {
    if (lastNumber <= 0) {
      return [];
    }

    const result = [];
    for (let i = 1; i <= lastNumber; i++) {
      result.push(i);
    }
    return result;
  }

  objectToQueryString(obj) {
    const queryParams = [];
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        const encodedKey = encodeURIComponent(key);
        const encodedValue = encodeURIComponent(obj[key]);
        queryParams.push(`${encodedKey}=${encodedValue}`);
      }
    }
    return queryParams.join('&');
  }

  getMonthName(monthNumber) {
    const months = ["January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"];
    if (monthNumber < 1 || monthNumber > 12) {
      return "Invalid month number";
    } else {
      return months[monthNumber - 1];
    }
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
    if (entries?.custom) {
      this.data.historical.push(result);
    } else {
      this.data.readings.push(result);
    }
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
