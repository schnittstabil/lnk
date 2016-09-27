'use strict';
var isWin = process.platform === 'win32';
var fs = require('fs');
const pathLib = require('path');

const relative = (from, to) => pathLib.relative(pathLib.dirname(from), pathLib.resolve(to));

exports.hard = (target, path, cb) => {
	fs.link(target, path, cb);
};

exports.hardSync = (target, path) => {
	return fs.linkSync(target, path);
};

exports.symbolic = (target, path, cb) => {
	target = relative(path, target);
	fs.symlink(target, path, cb);
};

exports.symbolicSync = (target, path) => {
	target = relative(path, target);

	return fs.symlinkSync(target, path);
};

exports.directory = (target, path, cb) => {
	target = relative(path, target);
	fs.symlink(target, path, 'dir', cb);
};

exports.directorySync = (target, path) => {
	target = relative(path, target);

	return fs.symlinkSync(target, path, 'dir');
};

exports.junction = (target, path, cb) => {
	// junction paths are always absolute
	if (!isWin) {
		target = relative(path, target);
	}

	fs.symlink(target, path, 'junction', cb);
};

exports.junctionSync = (target, path) => {
	// junction paths are always absolute
	if (!isWin) {
		target = relative(path, target);
	}

	return fs.symlinkSync(target, path, 'junction');
};

exports.default = (target, path, cb) => {
	exports.hard(target, path, err => {
		if (!err || err.code !== 'EPERM') {
			return cb(err);
		}

		exports.junction(target, path, cb);
	});
};

exports.defaultSync = (target, path) => {
	try {
		return exports.hardSync(target, path);
	} catch (err) {
		if (err.code === 'EPERM') {
			return exports.junctionSync(target, path);
		}

		throw err;
	}
};

Object.defineProperty(exports, 'get', {
	value: type => {
		var linkFn = exports[type];

		if (linkFn) {
			return linkFn.bind(exports);
		}

		throw new Error('unknown link type: `' + type + '`');
	}
});

Object.defineProperty(exports, 'getSync', {
	value: type => exports.get(type + 'Sync')
});

Object.defineProperty(exports, 'getTypes', {
	value: () => {
		const suffix = 'Sync';
		const types = [];

		for (let name in exports) {
			if (typeof exports[name] === 'function' && name.slice(-suffix.length) !== suffix) {
				types.push(name);
			}
		}

		return types;
	}
});
