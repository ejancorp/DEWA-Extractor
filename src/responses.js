const sqlite3 = require('sqlite3');

const DB_PATH = `${process.cwd()}/database.sqlite`;
const db = new sqlite3.Database(DB_PATH);

/**
 * @returns {Promise}
 */
function get() {
  return new Promise((resolve, reject) => {
    return db.run("CREATE TABLE IF NOT EXISTS responses(response TEXT)", err => {

      if (err) {
        return reject(err);
      }

      return db.get("SELECT response FROM responses ORDER BY rowid DESC", (err, row) => {
        if (err) {
          return reject(err);
        }

        if (row?.response) {
          return resolve(row.response);
        }

        return resolve(null);
      });
    });
  });
};

/**
 * @param {String} data 
 * @returns {Promise}
 */
function save(data) {
  return new Promise((resolve, reject) => {
    return db.run("CREATE TABLE IF NOT EXISTS responses(response TEXT)", err => {

      if (err) {
        return reject(err);
      }

      return db.run("INSERT INTO responses(response) VALUES (?)", [data], err => {
        if (err) {
          return reject(err);
        }
        return resolve(true);
      });

    });
  });
}

module.exports = { get, save };