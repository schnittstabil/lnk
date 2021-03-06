'use strict';

const path = require('path');
const pify = require('pify');
const mkdirp = require('mkdirp');
const rimraf = require('rimraf');

const mkdirpP = pify(mkdirp);
const BASE = process.cwd();

const tempDir = testFileName => path.join(BASE, 'temp', path.basename(testFileName, '.js'));
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

const mkdir = dir => mkdirpP(dir).catch(err => {
	if (err.code !== 'EPERM') {
		throw err;
	}

	// M$ issue; just try again
	return sleep(5000).then(() => mkdirpP(dir));
});

const before = testFileName => () => {
	const dir = tempDir(testFileName);
	process.chdir(BASE);

	rimraf.sync(dir);

	return mkdir(dir);
};

const beforeEach = testFileName => () => {
	const dir = tempDir(testFileName);
	process.chdir(BASE);

	rimraf.sync(dir);

	return mkdir(dir).then(() => process.chdir(dir));
};

const after = testFileName => () => {
	process.chdir(BASE);

	rimraf.sync(tempDir(testFileName));
};

exports.before = before;
exports.beforeEach = beforeEach;
exports.after = after;
