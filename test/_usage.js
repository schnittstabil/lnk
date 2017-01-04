#!/usr/bin/env node
'use strict';

const spawnSync = require('child_process').spawnSync;
const fs = require('fs');
const rimraf = require('rimraf');
const mkdirp = require('mkdirp');

const lnk = require('../');

process.chdir(__dirname);
rimraf.sync('temp/_usage');
mkdirp.sync('temp/_usage/assets/style');
process.chdir('temp/_usage');

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

lnk(['assets/favicon.ico', 'assets/style'], 'dist')
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
//     ├── favicon.ico
//     └── style -> ../assets/style
