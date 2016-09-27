/* eslint-env mocha */
/* eslint no-underscore-dangle: 0 */
'use strict';
const isWin = process.platform === 'win32';
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const mkdirp = require('mkdirp');
const rewire = require('rewire');

const lnk = require('../');
const assertUtils = require('./utils/assert');
const hooks = require('./utils/hooks');

const assertIdenticalFile = assertUtils.assertIdenticalFile;
const assertEqualFilePath = assertUtils.assertEqualFilePath;
const noop = () => {};

describe('index()', () => {
	beforeEach(new hooks.tempCwd.BeforeEach(__filename));
	afterEach(new hooks.tempCwd.AfterEach(__filename));
	after(new hooks.tempCwd.After(__filename));

	it('should throw an Error on missing TARGET', () => {
		assert.throws(lnk.bind(lnk, undefined, undefined, noop));
	});

	it('should throw an Error on missing DIRECTORY', () => {
		assert.throws(lnk.bind(lnk, 'TARGET', undefined, noop));
	});

	it('should not throw an Error on empty TARGETs', done => {
		lnk([], 'DEST', err => {
			assert.ifError(err);
			done();
		});
	});

	it('should throw an Error for an unknown link type', () => {
		assert.throws(() => {
			lnk('a', 'DEST/', {type: 'UNKNOWN_TYPE'}, () => {});
		}, /UNKNOWN_TYPE/);
	});

	it('should link a file', done => {
		mkdirp.sync('DEST/');
		fs.writeFileSync('a', '');
		lnk('a', 'DEST/', err => {
			assert.ifError(err);
			assertIdenticalFile('DEST/a', 'a');
			done();
		});
	});

	it('should create DEST', done => {
		fs.writeFileSync('a', '');
		lnk('a', 'DEST/', err => {
			assert.ifError(err);
			assertIdenticalFile('DEST/a', 'a');
			done();
		});
	});

	it('should symlink a file', done => {
		fs.writeFileSync('a', '');
		lnk('a', 'DEST', {type: 'symbolic'}, err => {
			assert.ifError(err);
			assertEqualFilePath('DEST/a', 'a');
			done();
		});
	});

	it('should directory link a directory', done => {
		mkdirp.sync('SRC');
		lnk('SRC', 'DEST', {type: 'directory'}, err => {
			assert.ifError(err);
			assertEqualFilePath('DEST/SRC', 'SRC');
			done();
		});
	});

	it('should junction link a directory', done => {
		mkdirp.sync('SRC');

		lnk('SRC', 'DEST', {type: 'junction'}, err => {
			assert.ifError(err);
			assert.strictEqual(
				fs.readlinkSync('DEST/SRC'),
				isWin ? path.resolve('SRC') + path.sep : path.join('..', 'SRC')
			);
			assertEqualFilePath('DEST/SRC', 'SRC');
			done();
		});
	});

	it('should respect cwd', done => {
		mkdirp.sync('SRC/DEEP');
		fs.writeFileSync('SRC/DEEP/a', '');
		lnk('DEEP/a', '../DEST', {cwd: 'SRC'}, err => {
			assert.ifError(err);
			assertIdenticalFile('DEST/a', 'SRC/DEEP/a');
			done();
		});
	});

	it('should respect parents option', done => {
		mkdirp.sync('SRC/DEEP');
		fs.writeFileSync('SRC/DEEP/a', '');
		lnk('DEEP/a', '../DEST', {cwd: 'SRC', parents: true}, err => {
			assert.ifError(err);
			assertIdenticalFile('DEST/DEEP/a', 'SRC/DEEP/a');
			done();
		});
	});

	it('should hard link files in default mode', done => {
		mkdirp.sync('SRC');
		fs.writeFileSync('SRC/a', '');
		lnk('SRC/a', 'DEST', {type: 'default'}, err => {
			assert.ifError(err);
			assertIdenticalFile('DEST/a', 'SRC/a');
			done();
		});
	});

	it('should junction directories in default mode', done => {
		mkdirp.sync('SRC/DIR');
		lnk('SRC/DIR', 'DEST', {type: 'default'}, err => {
			assert.ifError(err);
			assertEqualFilePath('DEST/DIR', 'SRC/DIR');
			done();
		});
	});

	it('should overwrite if desired', done => {
		mkdirp.sync('SRC/DIR');
		mkdirp.sync('DEST');
		fs.writeFileSync('DEST/DIR', '');
		lnk('SRC/DIR', 'DEST', {force: true}, err => {
			assert.ifError(err);
			assertEqualFilePath('DEST/DIR', 'SRC/DIR');
			done();
		});
	});

	it('should not overwrite if not desired', done => {
		mkdirp.sync('SRC/DIR');
		mkdirp.sync('DEST');
		fs.writeFileSync('DEST/DIR', '');
		lnk('SRC/DIR', 'DEST', err => {
			if (err.code === 'EEXIST') {
				done();
				return;
			}
			assert.fail(err, err, 'missing Error');
		});
	});

	it('should fail on impossible TARGET', done => {
		lnk('TARGET', 'DIRECTORY', err => {
			assert.throws(fs.statSync.bind(fs, 'DIRECTORY/TARGET'), /ENOENT/);
			if (/TARGET/.test(err)) {
				done();
				return;
			}
			assert.fail(err, err, 'missing Error');
		});
	});

	it('should fail on impossible DEST', done => {
		fs.writeFileSync('a', '');
		fs.writeFileSync('DEST', '');
		lnk('a', 'DEST', err => {
			if (/DEST/.test(err)) {
				done();
				return;
			}
			assert.fail(err, err, 'missing Error');
		});
	});

	it('should not overwrite if TARGET and DEST are the same', done => {
		fs.writeFileSync('a', '');
		fs.symlinkSync('.', 'b');
		lnk('a', 'b', {force: true}, err => {
			if (/same/.test(err)) {
				done();
				return;
			}
			assert.fail(err, err, 'missing Error');
		});
	});

	it('should create ELOOP', done => {
		lnk('a', '.', {type: 'symbolic'}, err => {
			assert.ifError(err);
			assert.strictEqual(fs.readlinkSync('a'), 'a');
			done();
		});
	});

	it('should be able to overwrite ELOOP', done => {
		fs.symlinkSync('a', 'a');
		lnk(
			'a', '.',
			{type: 'symbolic', force: true},
			err => {
				assert.ifError(err);
				assert.strictEqual(fs.readlinkSync('a'), 'a');
				done();
			}
		);
	});

	it('should pass unhandled TARGET Errors', done => {
		const sut = rewire('../');

		sut.__set__('fs', {
			stat: (filepath, cb) => {
				if (path.normalize(filepath) === path.normalize('TARGET/a')) {
					cb(new Error('BAD_THINGS_HAPPEND'));
				} else {
					fs.stat(filepath, cb);
				}
			}
		});

		mkdirp.sync('TARGET');
		fs.writeFileSync('TARGET/a', '');
		mkdirp.sync('DIRECTORY');
		fs.writeFileSync('DIRECTORY/a', '');

		sut('TARGET/a', 'DIRECTORY', {force: true}, err => {
			if (err) {
				if (/BAD_THINGS_HAPPEND/.test(err)) {
					return done();
				}
				assert.ifError(err);
			}
			assert.fail(err, err, 'missing Error');
		});
	});

	it('should pass unhandled DIRECTORY Errors', done => {
		const sut = rewire('../');

		sut.__set__('fs', {
			stat: (filepath, cb) => {
				if (path.normalize(filepath) === path.normalize('DIRECTORY/a')) {
					cb(new Error('BAD_THINGS_HAPPEND'));
				} else {
					fs.stat(filepath, cb);
				}
			}
		});

		mkdirp.sync('TARGET');
		fs.writeFileSync('TARGET/a', '');
		mkdirp.sync('DIRECTORY');
		fs.writeFileSync('DIRECTORY/a', '');

		sut('TARGET/a', 'DIRECTORY', {force: true}, err => {
			if (err) {
				if (/BAD_THINGS_HAPPEND/.test(err)) {
					return done();
				}
				assert.ifError(err);
			}
			assert.fail(err, err, 'missing Error');
		});
	});

	it('should handle DIRECTORY Errors caused by race condition', done => {
		const sut = rewire('../');

		sut.__set__('fs', {
			stat: (filepath, cb) => {
				if (path.normalize(filepath) === path.normalize('DIRECTORY/a')) {
					const err = new Error('BAD_THINGS_HAPPEND');
					err.code = 'ENOENT';
					cb(err);
				} else {
					fs.stat(filepath, cb);
				}
			}
		});

		mkdirp.sync('TARGET');
		fs.writeFileSync('TARGET/a', '');
		mkdirp.sync('DIRECTORY');
		fs.writeFileSync('DIRECTORY/a', '');

		sut('TARGET/a', 'DIRECTORY', {force: true}, err => {
			assert.ifError(err);
			done();
		});
	});
});
