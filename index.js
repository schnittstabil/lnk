'use strict';
var fs = require('fs');
const path = require('path');
const rimraf = require('rimraf');
const mkdirp = require('mkdirp');
const forEach = require('each-async');
const series = require('array-series');
const pathIsAbsolute = require('path-is-absolute');

const link = require('./link');

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

const assertSaveOverwrite = (target, linkPath, cb) => {
	fs.stat(target, function targetStatCb(targetErr, targetStat) {
		if (targetErr) {
			if (targetErr.code === 'ENOENT' || targetErr.code === 'ELOOP') {
				// target and linkPath cannot be same file
				return cb();
			}
			return cb(targetErr);
		}
		fs.stat(linkPath, function linkPathStatCb(linkErr, linkStat) {
			if (linkErr) {
				if (linkErr.code === 'ENOENT' || linkErr.code === 'ELOOP') {
					return cb();
				}
				return cb(linkErr);
			}
			if (targetStat.ino === linkStat.ino && targetStat.dev === linkStat.dev) {
				cb(new Error('`' + target + '` and `' + linkPath + '` are the same'));
			} else {
				cb();
			}
		});
	});
};

const assertSaveOverwriteSync = (target, linkPath) => {
	let targetStat;
	let linkStat;

	try {
		targetStat = fs.statSync(target);
	} catch (err) {
		if (err.code === 'ENOENT' || err.code === 'ELOOP') {
			// target and linkPath cannot be same file
			return;
		}
		throw err;
	}

	try {
		linkStat = fs.statSync(linkPath);
	} catch (err) {
		if (err.code === 'ENOENT' || err.code === 'ELOOP') {
			return;
		}
		throw err;
	}

	if (targetStat.ino === linkStat.ino && targetStat.dev === linkStat.dev) {
		throw new Error('`' + target + '` and `' + linkPath + '` are the same');
	}
};

const assertArgument = (arg, argName) => {
	if (!arg) {
		throw new Error(argName + ' required');
	}
};

const lnk = (targets, directory, opts, cb) => {
	if (typeof opts === 'function') {
		cb = opts;
		opts = {};
	}

	assertArgument(targets, 'targets');
	assertArgument(directory, 'directory');
	assertArgument(cb, 'cb');

	targets = Array.isArray(targets) ? targets : [targets];
	opts = Object.assign({}, defaults, opts);

	const linkFn = link.get(opts.type);
	const logLnk = (level, linkPath, targetPath, done) => {
		opts.log(level, 'lnk', '%j => %j', linkPath, targetPath);
		done();
	};

	const linkTarget = (target, i, done) => {
		const targetPath = preprocessTarget(target, opts);
		const linkPath = generateLinkPath(target, directory, opts);

		series([
			mkdirp.bind(mkdirp, path.dirname(linkPath)),
			logLnk.bind(null, 'verbose', linkPath, targetPath),	next => {
				linkFn(targetPath, linkPath, err => {
					if (err && err.code === 'EEXIST' && opts.force) {
						opts.log('silly', 'lnk', 'try to rm -rf %s', linkPath);
						series([
							assertSaveOverwrite.bind(null, targetPath, linkPath),
							rimraf.bind(rimraf, linkPath),
							logLnk.bind(null, 'silly', linkPath, targetPath),
							linkFn.bind(linkFn, targetPath, linkPath)
						], next);
					} else {
						next(err);
					}
				});
			}
		], done);
	};

	logLnk('silly', targets, directory, () => {});
	forEach(targets, linkTarget, cb);
};

const lnkSync = (targets, directory, opts) => {
	assertArgument(targets, 'targets');
	assertArgument(directory, 'directory');

	targets = Array.isArray(targets) ? targets : [targets];
	opts = Object.assign({}, defaults, opts);

	const linkFn = link.getSync(opts.type);
	const linkTarget = target => {
		const targetPath = preprocessTarget(target, opts);
		const linkPath = generateLinkPath(target, directory, opts);

		mkdirp.sync(path.dirname(linkPath));
		try {
			opts.log('verbose', 'lnk', '%j => %j', linkPath, targetPath);
			linkFn(targetPath, linkPath);
		} catch (err) {
			if (err.code === 'EEXIST' && opts.force) {
				opts.log('silly', 'lnk', 'try to rm -rf %s', linkPath);
				assertSaveOverwriteSync(targetPath, linkPath);
				rimraf.sync(linkPath);
				opts.log('silly', 'lnk', '%j => %j', linkPath, targetPath);
				linkFn(targetPath, linkPath);
			} else {
				throw err;
			}
		}
	};

	opts.log('silly', 'lnk', '%j => %j', targets, directory);
	targets.forEach(linkTarget);
};

module.exports = lnk;
module.exports.sync = lnkSync;
module.exports.getTypes = () => link.getTypes();
