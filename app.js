const app = require('express')();
const server = require('http').createServer(app);
const path = require('path');
const config = require('config');
const mysql = require('mysql');
const bodyParser = require('body-parser');

const db = require('./services/databaseService.js')(config.get('dbConfig'));
const auth = require('./services/authService.js')(db);
const videoService = require('./services/videoService.js');

app
  .use(bodyParser.json())
  .use(bodyParser.urlencoded({
    extended: true
  }))
  .post('/auth', (req, res) => {
    if (req.body.username === undefined || req.body.password === undefined) {
      return res.status(500).end();
    }
    const username = req.body.username;
    const password = req.body.password;

    auth.authentify(username, password)
      .then(token => {
        res.setHeader('Content-Type', 'application/json');
        res.send(JSON.stringify({username, token}));
      })
      .catch(err => {
        console.log(err);
        res.status(403).end()
      });
  })
  .get('/video/:videoId/t/:token', (req, res) => {
    const token = req.params.token;

    if (req.params.videoId === undefined || req.params.token === undefined) {
      return res.status(500).end();
    }

    auth.validToken(token)
      .then(groupId => {
        const videoId = req.params.videoId;
        const video = new videoService(db);
        
        video.setPlayed(videoId, groupId)
          .then(() => video.getVideoPath(videoId))
          //.then(videoPath => video.stream(req, res, videoPath))
          .then(videoPath => {
            res.setHeader('Content-Type', 'application/json');
            res.send({res: 'ok'});
          })
          .catch(err => {
            console.log('Error: ', err);
            res.status(500).end();
          });
      })
      .catch(err => {
        console.log(err);
        res.status(403).end()
      });
  })    
  .use((req, res, next) => {
    const authorization = req.header('Authorization');
    if (authorization === undefined) {
      return res.status(403).end();
    }

    const matchRes = authorization.match(/^Bearer ([A-Z0-9]+)$/);
    if (matchRes.length != 2) {
      return res.status(403).end();
    }

    const token = matchRes[1];

    auth.validToken(token)
      .then(groupId => {
        res.locals.token = token;
        res.locals.groupId = groupId;        
        next();
      })
      .catch(err => {
        console.log(err);
        res.status(403).end()
      });
  })
  .get('/logout', (req, res) => {
    auth.rmToken(res.locals.token)
      .then(() => res.status(200).end())
      .catch(err => {
        console.log(err);
        res.status(500).end();
      })
  })
  .get('/video', (req, res) => {
    const video = new videoService(db);
    const groupId = res.locals.groupId;

    video.list(groupId)
      .then(videoList => {
        res.setHeader('Content-Type', 'application/json');
        res.send(JSON.stringify(videoList));
      })
      .catch(err => {
        console.log(err);
        res.status(403).end();
      });
  })  
  .post('/video/:videoId', (req, res) => {
    if (req.body.favorite === undefined) {
      return res.status(500).end();
    }

    const favorite = Number(req.body.favorite);
    if (favorite !== 0 && favorite !== 1) {
      return res.status(500).end();
    }

    const video = new videoService(db);
    const groupId = res.locals.groupId;
    const videoId = req.params.videoId;    

    video.setFavorite(videoId, groupId, favorite)
      .then(() => res.status(200).end())
      .catch(err => {
        console.log(err);
        return res.status(500).end();
      });
  })
  .use((req, res, next) => {
    res.status(404).end();
  })
  .listen(config.get('server.port'));