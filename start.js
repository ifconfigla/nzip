#!/usr/bin/env node
const { Command, InvalidArgumentError } = require('commander');
const fs = require('fs');
const createZip = require('./index');
const program = new Command();
const { name, version, description } = require('./package.json');

const checkString = (value, dummyPrevious, param, stringLength = 0) => {
  if (!value || typeof value !== 'string' || value.length <= stringLength) {
    const errMsg = (value.length <= stringLength && param)
      ? `\n\nInvalid ${param} length: ${value} does not have a required ${stringLength} ${param.toLowerCase()} length`
      : param
        ? `\n\nInvalid ${param} : ${value} is not a valid ${param.toLowerCase()} value`
        : `\n\nInvalid argument: ${value} is not a valid string`;
    throw new InvalidArgumentError(errMsg);
  }
  return value;
};

program
  .name(name)
  .description(
    description
      + `\n\nExample: ${name} nzip.zip "file1, file2, folder1, folder2" "excludeFile1, excludeFile2"`
  )
  .version(version)
  .argument('[zipName]', 'Name for archive name (nzip.zip)')
  .argument('[files]', 'List of files or folders to include')
  .argument('[filteredFiles]', 'List of files not to include')
  .option(
    '-p, --package-json',
    'Read the files list from package.json'
  )
  .option(
    '-f, --files-json <FILES_JSON>',
    'Read the files list from files.json',
    checkString
  )
  .action((zipName, files, filteredFiles, options) => {
    if (options.packageJson && fs.existsSync('package.json')) {
      const pkgJson = JSON.parse(fs.readFileSync('package.json', { encoding: 'utf8' }));
      zipName = zipName || pkgJson.name + '.zip';
      files = pkgJson.files.join(', ');

      if (!files.includes('package.json')) {
        files = files + ', package.json';
      }
    }

    if (options.filesJson && fs.existsSync(options.filesJson)) {
      const filesJson = JSON.parse(fs.readFileSync(options.filesJson, { encoding: 'utf8' }));
      files = filesJson.join(', ');
    }

    if (!files) {
      throw new Error('Undefined files to archive, please check the --help command for usage');
    }

    zipName = zipName ?? `nzip_${parseInt(new Date().getTime() / 1000)}.zip`;

    console.log(`[NZIP] Will create an archive ${zipName} with files ${files}`);
    files = files.replaceAll(/\s/g, '').split(',');

    if (filteredFiles) {
      console.log(`[NZIP] Will exclude files ${filteredFiles}`);
      filteredFiles = filteredFiles.replaceAll(/\s/g, '').split(',');
    }

    createZip({files, zipName, filteredFiles});
  });

program.parse();