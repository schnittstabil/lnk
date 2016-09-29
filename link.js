'use strict';
var fs = require('fs');
const pathLib = require('path');

const pify = require('pify');

const relative = (from, to) => pathLib.relative(pathLib.dirname(from), pathLib.resolve(to));

exports.hard = pify(fs.link);

exports.hardSync = fs.linkSync;

exports.symbolic = pify((target, path, cb) => {
	target = relative(path, target);
	fs.symlink(target, path, cb);
});

exports.symbolicSync = (target, path) => {
	target = relative(path, target);

	return fs.symlinkSync(target, path);
};

exports.directory = pify((target, path, cb) => {
	target = relative(path, target);
	fs.symlink(target, path, 'dir', cb);
});

exports.directorySync = (target, path) => {
	target = relative(path, target);

	return fs.symlinkSync(target, path, 'dir');
};

exports.junction = pify((target, path, cb) => {
	target = relative(path, target);
	fs.symlink(target, path, 'junction', cb);
});

exports.junctionSync = (target, path) => {
	target = relative(path, target);

	return fs.symlinkSync(target, path, 'junction');
};

exports.default = (target, path) => {
	return exports.hard(target, path).catch(err => {
		if (err.code === 'EPERM') {
			return exports.junction(target, path);
		}

		throw err;
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
