'use strict';
const path = require('path');
const arrify = require('arrify');
const rimraf = require('rimraf');
const mkdirp = require('mkdirp');
const pify = require('pify');

const link = require('./link');
var assertSaveOverwrite = require('./assert-save-overwrite');
const Options = require('./options');

const rimrafP = pify(rimraf);
const mkdirpP = pify(mkdirp);

const assertArgument = (arg, argName) => {
	if (!arg) {
		throw new Error(argName + ' required');
	}
};

const linkTarget = (directory, opts) => target => {
	const linkFn = link.get(opts.type);
	const targetPath = opts.preprocessTarget(target);
	const pathOfLink = opts.generatePathOfLink(target, directory);

	return mkdirpP(path.dirname(pathOfLink))
		.then(() => opts.log('verbose', 'lnk', '%j => %j', pathOfLink, targetPath))
		.then(() => linkFn(targetPath, pathOfLink))
		.catch(err => {
			if (err.code !== 'EEXIST' || !opts.force) {
				throw err;
			}

			return Promise.resolve()
				.then(() => opts.log('silly', 'lnk', 'try to rm -rf %s', pathOfLink))
				.then(() => assertSaveOverwrite(targetPath, pathOfLink))
				.then(() => rimrafP(pathOfLink))
				.then(() => opts.log('silly', 'lnk', '%j => %j', pathOfLink, targetPath))
				.then(() => linkFn(targetPath, pathOfLink));
		});
};

const linkTargetSync = (directory, opts) => target => {
	const linkFn = link.getSync(opts.type);
	const targetPath = opts.preprocessTarget(target);
	const pathOfLink = opts.generatePathOfLink(target, directory);

	mkdirp.sync(path.dirname(pathOfLink));

	try {
		opts.log('verbose', 'lnk', '%j => %j', pathOfLink, targetPath);

		return linkFn(targetPath, pathOfLink);
	} catch (err) {
		if (err.code !== 'EEXIST' || !opts.force) {
			throw err;
		}

		opts.log('silly', 'lnk', 'try to rm -rf %s', pathOfLink);
		assertSaveOverwrite.sync(targetPath, pathOfLink);
		rimraf.sync(pathOfLink);
		opts.log('silly', 'lnk', '%j => %j', pathOfLink, targetPath);

		return linkFn(targetPath, pathOfLink);
	}
};

const lnk = (targets, directory, opts) => Promise.all([targets, directory]).then(results => {
	const targets = results[0];
	const directory = results[1];

	opts = new Options(opts);
	assertArgument(targets, 'targets');
	assertArgument(directory, 'directory');
	opts.log('silly', 'lnk', '%j => %j', targets, directory);

	return Promise.all(arrify(targets).map(linkTarget(directory, opts)));
});

const lnkSync = (targets, directory, opts) => {
	opts = new Options(opts);
	assertArgument(targets, 'targets');
	assertArgument(directory, 'directory');
	opts.log('silly', 'lnk', '%j => %j', targets, directory);

	arrify(targets).forEach(linkTargetSync(directory, opts));
};

module.exports = lnk;
module.exports.sync = lnkSync;
module.exports.getTypes = link.getTypes;
