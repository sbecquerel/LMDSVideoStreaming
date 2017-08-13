const ffmpeg = require('fluent-ffmpeg');
const path = require('path');
const fs = require('fs');

function generateThumbnails(files, index = 0) {
  if (files[index] === undefined) {
    return;
  }

  const size = '320x180';
  const file = files[index];

  console.log(`Generate thumbnails for file ${file} (${index}/${files.length})`)

  // 0508594a3bae4624153ccada40bf2e8e-320x180-1.png
  const thumbnail1 = `${path.dirname(file)}/${path.basename(file, path.extname(file))}-${size}-1.png`;

  if (fs.existsSync(thumbnail1)) {
    console.log('Thumbnails allready exists!');
    generateThumbnails(files, index + 1);
    return;
  }

  ffmpeg(file)
    //.on('filenames', filenames => console.log('Will generate: ' + filenames.join(', ')))
    .on('end', () => {
      console.log('Generation done');
      generateThumbnails(files, index + 1)
    })
    .on('error', err => {
      console.log(`An error occurred: ${err.message}`);
      generateThumbnails(files, index + 1)
    })
    .screenshots({
      // Will take screens at 20%, 40%, 60% and 80% of the video
      count: 4,
      folder: path.dirname(file),
      size,
      filename: `${path.basename(file, path.extname(file))}-%r-%i.png`
    });
}

function listMp4Files(dir) {
  const files = fs.readdirSync(dir);
  let result = [];

  dir = dir.replace(/\/^/, '');

  for (let filename of files) {
    const file = `${dir}/${filename}`;

    if (fs.statSync(file).isDirectory()) {
      result = result.concat(listMp4Files(file));
    } else if (path.extname(file) !== '.png') {
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

console.log('Retrieve mp4 files...');
const files = listMp4Files(dir);
console.log(`Found ${files.length} files.`);
console.log('Generate thumbnails...');
generateThumbnails(files);
