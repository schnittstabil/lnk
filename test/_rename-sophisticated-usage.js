#!/usr/bin/env node
'use strict';

const spawnSync = require('child_process').spawnSync;
const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const rimraf = require('rimraf');
const mkdirp = require('mkdirp');

const lnk = require('../');

console.log(chalk.bgBlue(__filename));
process.chdir(__dirname);
rimraf.sync('temp/_rename-sophisticated-usage');
mkdirp.sync('temp/_rename-sophisticated-usage/assets/style');
process.chdir('temp/_rename-sophisticated-usage');

fs.writeFileSync('assets/favicon.ico', 'favicon.ico');
fs.writeFileSync('assets/style/app.css', 'app.css');
fs.writeFileSync('assets/style/vendor.css', 'vendor.css');

spawnSync('tree', {stdio: 'inherit'});
// $ tree
// .
// └── assets
//     ├── favicon.ico
//     └── style
//         ├── app.css
//         └── vendor.css

const rename = pathOfLink => Object.assign(pathOfLink, {
	dir: path.join(pathOfLink.dir, '42'),
	base: `prefix-${pathOfLink.name}` + pathOfLink.ext.toLowerCase()
});

lnk(['assets/favicon.ico', 'assets/style'], 'dist', {rename})
	.then(() => console.log('done'))
	.catch(err => console.error(err))
	.then(() => spawnSync('tree', {stdio: 'inherit'}));

// $ tree
// .
// ├── assets
// │   ├── favicon.ico
// │   └── style
// │       ├── app.css
// │       └── vendor.css
// └── dist
//     └── 42
//         ├── prefix-favicon.ico
//         └── prefix-style -> ../../assets/style
