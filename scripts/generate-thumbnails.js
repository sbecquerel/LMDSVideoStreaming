const ffmpeg = require('fluent-ffmpeg');
const path = require('path');
const fs = require('fs');

function listMp4Files(dir) {
  const files = fs.readdirSync(dir);
  let result = [];

  dir = dir.replace(/\/^/, '');

  for (let filename of files) {
    const file = `${dir}/${filename}`;

    if (fs.statSync(file).isDirectory()) {
      result = result.concat(listMp4Files(file));
    } else /*if (path.extname(file) === '.mp4')*/ {
      result.push(file);
    }
  }
  return result;
}

if (process.argv[2] === undefined) {
  console.error('Invalid argument, expected video directory as first arg');
  exit(1);
}

const dir = process.argv[2].trim();
//const videosDir = path.resolve(__dirname, '../videos');
if ( ! fs.existsSync(dir)) {
  console.error(`Directory "${dir}" doesn't exists`);
  exit(1);
}

const files = listMp4Files(dir);

files.forEach(file => ffmpeg(file)
  .on('filenames', filenames => console.log('Will generate ' + filenames.join(', ')))
  .on('end', () => console.log('Screenshots taken'))
  .screenshots({
    // Will take screens at 20%, 40%, 60% and 80% of the video
    count: 4,
    folder: path.dirname(file),
    size: '320x180',
    filename: `${path.basename(file, path.extname(file))}-%r-%i.png`
  }));