'use strict';

const mysql = require('mysql');
const sha1 = require('sha1');
const md5 = require('md5');

module.exports = class databaseService 
{
  constructor(dbConfig) {
    this.conn = mysql.createConnection(dbConfig);
  }

  _getSalt(user) {
    const promise = new Promise((resolve, reject) => {
      this.conn.query(
      `SELECT password FROM lmds_user_data WHERE username=${this.conn.escape(user)}`,
      (err, res) => {
        if (err) {
          return reject(err);
        }
        if (!res.length) {
          return reject('User not found');
        } 
        const password = res[0].password;
        if (password.indexOf(':') === -1 ) {
          return resolve('');
        }
        resolve(password.split(':')[1]);
      });
    });

    return promise;
  }

  _hashPassword(password, salt) {
    const promise = new Promise((resolve, reject) => {
      const saltLen = salt.length;

      if (!saltLen) {
        resolve(sha1(md5(password)));
      } else {
        const saltedPassword = password + salt.substr(saltLen - 1, 40 - saltLen);

        resolve(`${sha1(md5(saltedPassword))}:${salt}`);
      }
    });
    
    return promise;
  }

  authentify(user, password) {
      this
        ._getSalt(user)
        .then(salt => this._hashPassword(password, salt))
        .then(hash => console.log(hash));
  }
}