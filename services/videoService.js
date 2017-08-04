const fs = require('fs');
const path = require('path');

module.exports = class videoService 
{
  constructor(db) {
    this.db = db;
  }

  _userVideo(groupId) {
    const promise = new Promise((resolve, reject) => {
      this.db.query(
        `SELECT 
          v.id_data as videoId, v.label as title, v.sub_label as subTitle, v.description, v.level, 
          v.tags, v.movie_type as movieType, v.difficulty, v.position,
          (SELECT IF( id_data IS NOT NULL, 1, 0) FROM lmds_played_movie_data 
            WHERE id_movie=v.id_data AND id_owner=${groupId}) AS played,
          (SELECT favorite FROM lmds_played_movie_data WHERE id_movie=v.id_data AND id_owner=${groupId}) AS favorite,
          concat_ws(' ', t.firstname, t.lastname) as teacher,
          f.id_file as fileId
        FROM lmds_pj_group_link as l
          LEFT JOIN lmds_grp_movie_data_group as j on l.id_group_parent=j.id_group
          LEFT JOIN lmds_grp_movie_data as g on j.id_data=g.id_data
          LEFT JOIN lmds_movie_data as v on g.id_movie=v.id_data
          LEFT JOIN lmds_user_data as t on v.teacher=t.id_data
          LEFT JOIN lmds_movie_pdf_file_data as f on v.id_data=f.id_movie
        WHERE
          l.id_group=${groupId} AND l.id_role=3
        GROUP BY v.id_data
        ORDER BY v.level, v.teacher, v.position`)
        .then(res => resolve(res))
        .catch(err => reject(err));
    });

    return promise;
  }

  _freeVideo(groupId) {
    const promise = new Promise((resolve, reject) => {
      this.db.query(
        `SELECT v.id_data as videoId, v.label as title, v.sub_label as subTitle, v.description, 
        v.sub_label, v.description, v.movie_type, v.level, v.tags, v.difficulty,
          SUM(if(p.id_data IS NOT NULL AND p.id_owner=${groupId}, 1, 0)) as played, p.favorite
        FROM lmds_movie_data as v
          LEFT JOIN lmds_played_movie_data as p on v.id_data=p.id_data
        WHERE v.movie_type=13 or v.movie_type=45
        GROUP BY v.id_data
        ORDER BY v.position`)
        .then(res => resolve(res))
        .catch(err => reject(err));
    });

    return promise;
  }

  list(groupId) {
    const promise = new Promise((resolve, reject) => {
      this._userVideo(groupId)
        .then(userVideo => {
          this._freeVideo(groupId)
            .then(freeVideo => {
              resolve(userVideo.concat(freeVideo));
            })
            .catch(err => reject(err));
        })
        .catch(err => reject(err));
    });

    return promise;    
  }

  getVideoPath(videoId) {
    const promise = new Promise((resolve, reject) => {
      this.db.query(
        `SELECT s.path as storagePath, f.path as filePath, f.generated_name
        FROM lmds_movie_file_data as v
          LEFT JOIN lmds_file_data as f on v.id_file=f.id_data
          LEFT JOIN lmds_storage_data as s on f.id_storage=s.id_data
        WHERE v.id_movie=${videoId}`)
        .then(res => {
          if (!res.length) {
            return reject(`Video ${videoId} not found`);
          }
          resolve(path.resolve(
            res[0].storagePath, 
            'lmds',
            res[0].filePath,
            res[0].generated_name
          ));          
        })
        .catch(err => reject(err));
    });

    return promise;
  }

  stream(req, res, file) {
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
  }

  _checkPermission(videoId, groupId) {
    const promise = new Promise((resolve, reject) => {
      this.db.query(`SELECT 1 FROM lmds_movie_data WHERE id_data=${videoId} AND movie_type IN (13, 45)`)
        .then(res => {
          if (res.lenght >= 1) {
            return resolve(true);
          }
          this.db.query(
            `SELECT 1 
              FROM lmds_grp_movie_data AS g
                LEFT JOIN lmds_grp_movie_data_group AS j ON g.id_data=j.id_data
                LEFT JOIN lmds_pj_group_link AS l ON j.id_group=l.id_group_parent
              WHERE g.id_movie=${videoId} AND l.id_group=${groupId} AND l.id_role=3`)
            .then(res => resolve(res.length >= 1))
            .catch(err => reject(err));
        })
        .catch(err => reject(err));
    });

    return promise;
  }

  _getPlayedId(videoId, groupId) {
    const promise = new Promise((resolve, reject) => {
      this.db.query(`SELECT id_data FROM lmds_played_movie_data WHERE id_movie=${videoId} AND id_owner=${groupId}`)
        .then(res => resolve(res.length ? res[0].id_data : undefined))
        .catch(err => reject(err));
    });

    return promise;
  }

  _setPlayed(videoId, groupId) {
    const promise = new Promise((resolve, reject) => {
      this.db.query(`INSERT INTO lmds_played_movie_data SET id_owner=${groupId}, id_movie=${videoId}, marked_date=CURDATE()`)
        .then(() => resolve())
        .catch(err => reject(err));
    });

    return promise;
  }

  setPlayed(videoId, groupId) {
    const promise = new Promise((resolve, reject) => {
      this._checkPermission(videoId, groupId)
        .then(permission => (permission ? this._getPlayedId(videoId, groupId) : reject('Permission denied')))
        .then(playedId => (playedId === undefined ? this._setPlayed(videoId, groupId) : resolve()))
        .then(() => resolve())
        .catch(err => reject(err));
    });

    return promise;
  }

  _setFavorite(videoId, groupId, value) {
    const promise = new Promise((resolve, reject) => {
      this.db.query(`UPDATE lmds_played_movie_data SET favorite=${value} WHERE id_owner=${groupId}`)
        .then(() => resolve())
        .catch(err => reject(err));
    });

    return promise;
  }

  setFavorite(videoId, groupId, value) {
    const promise = new Promise((resolve, reject) => {
      this._checkPermission(videoId, groupId)
        .then(permission => (permission ? this._getPlayedId(videoId, groupId) : reject('Permission denied')))
        .then(playedId => (playedId !== undefined ? this._setFavorite(videoId, groupId, value) : reject('Video has to be played one time')))
        .then(() => resolve())
        .catch(err => reject(err));
    });

    return promise;
  }  
}