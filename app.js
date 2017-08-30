const app = require('express')();
const server = require('http').createServer(app);
const path = require('path');
const fs = require('fs');
const config = require('config');
const mysql = require('mysql');
const bodyParser = require('body-parser');

const db = require('./services/databaseService.js')(config.get('dbConfig'));
const auth = require('./services/authService.js')(db);
const videoService = require('./services/videoService.js');

function wrapAsync(fn) {
  return (req, res, next) => fn(req, res, next).catch(next);
}

app
  .use(bodyParser.json())
  .use(bodyParser.urlencoded({
    extended: true
  }))
  .post('/auth', async (req, res) => {
    if (req.body.username === undefined || req.body.password === undefined) {
      console.log('auth');
      
      return res.status(500).end();
    }
    const username = req.body.username;
    const password = req.body.password;

    try {
      const token = await auth.authentify(username, password);
      res.setHeader('Content-Type', 'application/json');
      res.send(JSON.stringify({username, token}));
    } catch (err) {
      console.log(err);
      res.status(403).end()
    }
  })
  .get('/video/:videoId/t/:token', wrapAsync(async (req, res) => {
    const token = req.params.token;

    if (req.params.videoId === undefined || req.params.token === undefined) {
      return res.status(500).end();
    }

    const groupId = await auth.validToken(token);
    const videoId = req.params.videoId;
    const video = new videoService(db);
        
    await video.setPlayed(videoId, groupId);

    const videoPath = await video.getVideoPath(videoId);

    await video.stream(req, res, videoPath);
  }))
  .get('/video/:videoId/thumbnail/:size/:index?', wrapAsync(async (req, res) => {
    const video = new videoService(db);
    const videoId = req.params.videoId;
    const thumbnailIndex = req.params.index;
    const thumbnailSize = req.params.size;

    const videoPath = await video.getVideoPath(videoId);
    let file;
    
    if ( thumbnailIndex !== undefined ) {
      file = `${videoPath}-${thumbnailSize}-${thumbnailIndex}.png`;
    } else {
      file = `${videoPath}-${thumbnailSize}.png`;
    }

    if ( ! fs.existsSync(file)) {
      return res.status(500).end();
    }
    res.setHeader('Content-Type', 'image/png');
    res.send(fs.readFileSync(file));
  }))    
  .use(async (req, res, next) => {
    const authorization = req.header('Authorization');
    if (authorization === undefined) {
      return res.status(403).end();
    }

    const matchRes = authorization.match(/^Bearer ([A-Z0-9]+)$/);
    if (matchRes.length != 2) {
      return res.status(403).end();
    }

    const token = matchRes[1];

    try {
      const groupId = await auth.validToken(token);
      res.locals.token = token;
      res.locals.groupId = groupId;        
      next();
    } catch(err) {
      console.log(err);
      res.status(403).end()
    }
  })
  .get('/logout', wrapAsync(async (req, res) => {
    await auth.rmToken(res.locals.token);
    res.status(200).end();
  }))
  // GET video list
  .get('/video', wrapAsync(async (req, res) => {
    const video = new videoService(db);
    const groupId = res.locals.groupId;

    const videoList = await video.list(groupId);
    res.setHeader('Content-Type', 'application/json');
    res.send(JSON.stringify(videoList));
  }))
  .post('/video/:videoId', wrapAsync(async (req, res) => {
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

    await video.setFavorite(videoId, groupId, favorite);
    res.status(200).end();
  })) 
  .use((err, req, res, next) => {
    console.log(err);
    res.status(500).end();
  }) 
  .use((req, res, next) => {
    res.status(404).end();
  })
  .listen(config.get('server.port'));