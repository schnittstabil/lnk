#!/usr/bin/env node
'use strict';

const spawnSync = require('child_process').spawnSync;
const fs = require('fs');
const chalk = require('chalk');
const rimraf = require('rimraf');
const mkdirp = require('mkdirp');

const lnk = require('../');

console.log(chalk.bgBlue(__filename));
process.chdir(__dirname);
rimraf.sync('temp/_rename-basic-usage');
mkdirp.sync('temp/_rename-basic-usage/assets/style');
process.chdir('temp/_rename-basic-usage');

fs.writeFileSync('assets/favicon.ICO', 'favicon.ICO');
fs.writeFileSync('assets/style/app.css', 'app.css');
fs.writeFileSync('assets/style/vendor.css', 'vendor.css');

spawnSync('tree', {stdio: 'inherit'});
// $ tree
// .
// └── assets
//     ├── favicon.ICO
//     └── style
//         ├── app.css
//         └── vendor.css

Promise.all([
	lnk('assets/style', 'dist', {rename: 'css'}),
	lnk('assets/favicon.ICO', 'dist', {rename: pathOfLink => pathOfLink.base.toLowerCase()})
]).then(() => console.log('done'))
.catch(err => console.error(err))
.then(() => spawnSync('tree', {stdio: 'inherit'}));

// $ tree
// .
// ├── assets
// │   ├── favicon.ICO
// │   └── style
// │       ├── app.css
// │       └── vendor.css
// └── dist
//     ├── css -> ../assets/style
//     └── favicon.ico
