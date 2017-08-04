'use strict';

const mysql = require('mysql');

class databaseService 
{
  constructor(dbConfig) {
    this.conn = mysql.createConnection(dbConfig);
  }

  query(sql) {
    const promise = new Promise((resolve, reject) => {
      this.conn.query(sql, (err, res) => {
        if (err) {
          return reject(err);
        }
        resolve(res);
      });
    });

    return promise;
  }

  escape(value) {
    return this.conn.escape(value);
  }
}

module.exports = (dbConfig) => {
  return new databaseService(dbConfig);
}