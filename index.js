const { Zip, AsyncZipDeflate } = require('fflate');
const fs = require('fs');
const path = require('path');

/**
 * Getting files recursively
 * https://stackoverflow.com/questions/5827612/node-js-fs-readdir-recursive-directory-search
 * @param {string} dir
 * @returns {String[]} list of files
 */
const getFiles = (dir) => {
  const dirents = fs.readdirSync(dir, { withFileTypes: true });

  const files = dirents.map((dirent) => {
    const res = path.join(dir, dirent.name);
    return dirent.isDirectory() ? getFiles(res) : res;
  });

  // Return posix path
  return files.flat().map(f => f.split(path.sep).join(path.posix.sep));
};

const resolveFiles = (dirOrFile) => {
  const stat = fs.statSync(dirOrFile);
  if (stat && stat.isDirectory()) {
    return getFiles(dirOrFile);
  }
  return [dirOrFile];
};

/**
 * Read recursive list of files and archive them into single zip file.
 * https://github.com/101arrowz/fflate/issues/48#issuecomment-804430295
 * @param {Object} inputParams
 * @param {String[]} inputParams.files
 * @param {string} inputParams.zipName
 */
const createZip = async ({
  files,
  filteredFiles = [],
  zipName = `nzip_${parseInt(new Date().getTime() / 1000)}.zip`
}) => {
  // Scan files
  const filesRes = files.map(f => resolveFiles(f)).flat().filter(f => !filteredFiles.includes(f));

  // Initialize writeStream to dir.zip
  const writeStream = fs.createWriteStream(zipName);

  // Initialize zip stream and define chunk output to writeStream
  const zip = new Zip((err, dat, final) => {
    writeStream.write(dat);
    if (final) {
      writeStream.end();
    }
  });

  for await (const file of filesRes) {
    const fileZip = new AsyncZipDeflate(file);
    zip.add(fileZip);

    await new Promise((res, rej) => {
      const readStream = fs.createReadStream(file);

      readStream.on('data', chunk => fileZip.push(chunk));
      readStream.on('end', () => {
        fileZip.push(new Uint8Array(0), true);
        res();
      });
      readStream.on('error', rej);
    });

    console.log(`[NZIP] Processing ${file}`);
  }

  zip.end();
  console.log(`[NZIP] Completed writing ${zipName}`);
};

module.exports = createZip;