const sha1 = require('sha1');
const md5 = require('md5');
const randtoken = require('rand-token');

class authService 
{
  constructor(db) {
    this.db = db;
  }

  _getSalt(user) {
    const promise = new Promise((resolve, reject) => {
      this.db.query(`SELECT password FROM lmds_user_data WHERE username=${this.db.escape(user)}`)
        .then(res => {
          if (!res.length) {
            return reject('User not found');
          } 
          const password = res[0].password;
          if (password.indexOf(':') === -1 ) {
            return resolve('');
          }
          resolve(password.split(':')[1]);
        })
        .catch(err => reject(err));
    });

    return promise;
  }

  _hashPassword(password, salt) {
    const promise = new Promise((resolve, reject) => {
      if (salt.length) {
        const passwordLen = password.length;
        const saltedPassword = password + salt.substr(passwordLen - 1, 40 - passwordLen);

        resolve(`${sha1(md5(saltedPassword))}:${salt}`);
      } else {
        resolve(sha1(md5(password)));
      }
    });
    
    return promise;
  }

  _auth(username, hashedPassword) {
    const promise = new Promise((resolve, reject) => {
      this.db.query(
        `SELECT id_group FROM lmds_user_data 
          WHERE username=${this.db.escape(username)} AND password='${hashedPassword}'`
      ).then(res => {
        if (!res.length) {
          return resolve(false);
        }
        resolve(res[0].id_group);
      })
      .catch(err => reject(err));
    });

    return promise;
  }

  _rmUserTokens(userGroupId) {
    const promise = new Promise((resolve, reject) => {
      this.db.query(`DELETE FROM lmds_pj_token where id_group=${userGroupId}`)
        .then(() => resolve())
        .catch(err => reject(err));
    });

    return promise;
  } 

  _createToken(userGroupId) {
    const promise = new Promise((resolve, reject) => {
      this._rmUserTokens(userGroupId)
        .then(() => {
          const token = randtoken.generate(8).toUpperCase();

          this.db.query(
            `INSERT INTO lmds_pj_token SET 
              token='${token}', id_group=${userGroupId}, expire_date=NULL, classname='Core_Library_Token_Conn'`
          )
          .then(() => resolve(token))
          .catch(err => reject(err));
        })
        .catch(err => reject(err));
    });

    return promise;
  }

  authentify(user, password) {
    const promise = new Promise((resolve, reject) => {
      this
      ._getSalt(user)
      .then(salt => this._hashPassword(password, salt))
      .then(hashedPassword => this._auth(user, hashedPassword))
      .then(userIdGroup => {
        if (userIdGroup === false) {
          return reject('Authentication failed');
        }
        return this._createToken(userIdGroup);
      })
      .then(token => resolve(token))
      .catch(err => reject(err));
    });

    return promise;      
  }

  rmToken(token) {
    const promise = new Promise((resolve, reject) => {
      this.db.query(`DELETE FROM lmds_pj_token where token=${this.db.escape(token)}`)
        .then(() => resolve())
        .catch(err => reject(err));
    });

    return promise;
  }

  validToken(token) {
    const promise = new Promise((resolve, reject) => {
      this.db.query(`SELECT id_group FROM lmds_pj_token WHERE token=${this.db.escape(token)}`)
        .then(res => res.length === 1 ? resolve(res[0].id_group) : reject('Token not found'))
        .catch(err => reject(err));
    });

    return promise;
  }
}

module.exports = (db) => {
  return new authService(db);
}