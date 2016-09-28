'use strict';
var fs = require('fs');
const path = require('path');
const arrify = require('arrify');
const rimraf = require('rimraf');
const mkdirp = require('mkdirp');
const pathIsAbsolute = require('path-is-absolute');
const pify = require('pify');

const link = require('./link');

var fsStatP = pify(fs.stat);
const rimrafP = pify(rimraf);
const mkdirpP = pify(mkdirp);

const defaults = {
	cwd: undefined,
	type: 'default', // 'hard', 'symbolic', 'dir', 'junction' or 'default'
	parents: false,
	force: false,
	log: () => {}
};

const preprocessTarget = (target, opts) => {
	// NB symlinks: do not use path.resolve here
	if (opts.cwd && !pathIsAbsolute(target)) {
		target = path.join(opts.cwd, target);
	}
	return target;
};

const generateLinkPath = (target, directory, opts) => {
	const basename = path.basename(target);
	const dirname = path.dirname(target);

	if (opts.cwd) {
		directory = path.resolve(opts.cwd, directory);
	}

	if (opts.parents) {
		return path.join(directory, dirname, basename);
	}

	return path.join(directory, basename);
};

const assertSaveOverwrite = (target, linkPath) => Promise
	.all([fsStatP(target), fsStatP(linkPath)])
	.then(stats => {
		const targetStat = stats[0];
		const linkStat = stats[1];

		if (targetStat.ino === linkStat.ino && targetStat.dev === linkStat.dev) {
			throw new Error(`${target} and ${linkPath} are the same`);
		}
	})
	.catch(err => {
		if (err.code === 'ENOENT' || err.code === 'ELOOP') {
			// target and linkPath cannot be same file
			return;
		}

		throw err;
	});

const assertSaveOverwriteSync = (target, linkPath) => {
	try {
		const targetStat = fs.statSync(target);
		const linkStat = fs.statSync(linkPath);

		if (targetStat.ino === linkStat.ino && targetStat.dev === linkStat.dev) {
			throw new Error(`${target} and ${linkPath} are the same`);
		}
	} catch (err) {
		if (err.code === 'ENOENT' || err.code === 'ELOOP') {
			// target and linkPath cannot be same file
			return;
		}

		throw err;
	}
};

const assertArgument = (arg, argName) => {
	if (!arg) {
		throw new Error(argName + ' required');
	}
};

const lnk = (targets, directory, opts) => {
	opts = Object.assign({}, defaults, opts);

	const linkTarget = target => {
		const linkFn = link.get(opts.type);
		const targetPath = preprocessTarget(target, opts);
		const linkPath = generateLinkPath(target, directory, opts);

		return mkdirpP(path.dirname(linkPath))
			.then(() => opts.log('verbose', 'lnk', '%j => %j', linkPath, targetPath))
			.then(() => linkFn(targetPath, linkPath)
			.catch(err => {
				if (err.code !== 'EEXIST' || !opts.force) {
					throw err;
				}

				return Promise.resolve()
					.then(() => opts.log('silly', 'lnk', 'try to rm -rf %s', linkPath))
					.then(() => assertSaveOverwrite(targetPath, linkPath))
					.then(() => rimrafP(linkPath))
					.then(() => opts.log('silly', 'lnk', '%j => %j', linkPath, targetPath))
					.then(() => linkFn(targetPath, linkPath));
			}));
	};

	return Promise.resolve()
		.then(() => assertArgument(targets, 'targets'))
		.then(() => assertArgument(directory, 'directory'))
		.then(() => opts.log('silly', 'lnk', '%j => %j', targets, directory))
		.then(() => Promise.all(arrify(targets).map(linkTarget)));
};

const lnkSync = (targets, directory, opts) => {
	opts = Object.assign({}, defaults, opts);

	const linkTarget = target => {
		const linkFn = link.getSync(opts.type);
		const targetPath = preprocessTarget(target, opts);
		const linkPath = generateLinkPath(target, directory, opts);

		mkdirp.sync(path.dirname(linkPath));

		try {
			opts.log('verbose', 'lnk', '%j => %j', linkPath, targetPath);
			linkFn(targetPath, linkPath);
		} catch (err) {
			if (err.code !== 'EEXIST' || !opts.force) {
				throw err;
			}

			opts.log('silly', 'lnk', 'try to rm -rf %s', linkPath);
			assertSaveOverwriteSync(targetPath, linkPath);
			rimraf.sync(linkPath);
			opts.log('silly', 'lnk', '%j => %j', linkPath, targetPath);
			linkFn(targetPath, linkPath);
		}
	};

	assertArgument(targets, 'targets');
	assertArgument(directory, 'directory');
	opts.log('silly', 'lnk', '%j => %j', targets, directory);
	arrify(targets).forEach(linkTarget);
};

module.exports = lnk;
module.exports.sync = lnkSync;
module.exports.getTypes = () => link.getTypes();
