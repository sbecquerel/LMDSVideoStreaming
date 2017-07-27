const app = require('express')();
const server = require('http').createServer(app);
const fs = require('fs');
const path = require('path');
const config = require('config');
const mysql = require('mysql');
const bodyParser = require('body-parser');

const databaseService = require('./services/databaseService.js');

app
  .use(bodyParser.json())
  .use(bodyParser.urlencoded({
    extended: true
  }))
  .post('/auth', (req, res) => {
    const db = new databaseService(config.get('dbConfig'));

    if (req.body.user === undefined || req.body.password === undefined) {
      return res.status(500).end();
    }

    db.authentify(req.body.user, req.body.password);

    res.setHeader('Content-Type', 'application/json');
    res.send(JSON.stringify({
      token: 143094309 
    }));
  })
  .get('/video/:videoId', (req, res) => {
    //const file = path.resolve(__dirname, 'videos', req.params.videoId);
    const file = path.resolve(__dirname, 'videos/intro.mp4');

    fs.stat(file, (err, stats) => {
      if (err) {
        if (err.code === 'ENOENT') {
          return res.status(404).end();
        }
        console.log(err);
        return res.status(500).end();
      }

      const range = req.headers.range;
      if (!range) {
        return res.status(416).end();
      }

      const positions = range.replace(/bytes=/, "").split("-");
      const start = parseInt(positions[0], 10);
      const total = stats.size;
      const end = positions[1] ? parseInt(positions[1], 10) : total - 1;
      const chunksize = (end - start) + 1;

      res.writeHead(206, {
        "Content-Range": "bytes " + start + "-" + end + "/" + total,
        "Accept-Ranges": "bytes",
        "Content-Length": chunksize,
        "Content-Type": "video/mp4"
      });
      const stream = fs.createReadStream(file, { start: start, end: end })
        .on("open", () => {
          stream.pipe(res)
        })
        .on("error", err => {
          console.log(err);
          res.status(500).end();
        });
    });
  })
  .use((req, res, next) => {
    res.status(404).end();
  })
  .listen(config.get('server.port'));