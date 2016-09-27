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

describe('index.sync()', () => {
	beforeEach(new hooks.tempCwd.BeforeEach(__filename));
	afterEach(new hooks.tempCwd.AfterEach(__filename));
	after(new hooks.tempCwd.After(__filename));

	it('should throw an Error on missing TARGET', () => {
		assert.throws(lnk.sync.bind(lnk));
	});

	it('should not throw an Error on empty TARGETs', () => {
		lnk.sync([], 'DEST');
	});

	it('should throw an Error on missing DIRECTORY', () => {
		assert.throws(lnk.sync.bind(lnk, 'TARGET'));
	});

	it('should throw an Error for an unknown link type', () => {
		const opts = {type: 'UNKNOWN_TYPE'};
		assert.throws(lnk.sync.bind(lnk, 'a', 'DEST/', opts), /UNKNOWN_TYPE/);
	});

	it('should link a file', () => {
		mkdirp.sync('DEST/');
		fs.writeFileSync('a', '');
		lnk.sync('a', 'DEST/');
		assertIdenticalFile('DEST/a', 'a');
	});

	it('should create DEST', () => {
		fs.writeFileSync('a', '');
		lnk.sync('a', 'DEST/');
		assertIdenticalFile('DEST/a', 'a');
	});

	it('should symlink a file', () => {
		fs.writeFileSync('a', '');
		lnk.sync('a', 'DEST', {type: 'symbolic'});
		assertEqualFilePath('DEST/a', 'a');
	});

	it('should directory link a directory', () => {
		mkdirp.sync('SRC');
		lnk.sync('SRC', 'DEST', {type: 'directory'});
		assertEqualFilePath('DEST/SRC', 'SRC');
	});

	it('should junction link a directory', () => {
		mkdirp.sync('SRC');

		lnk.sync('SRC', 'DEST', {type: 'junction'});

		assert.strictEqual(
			fs.readlinkSync('DEST/SRC'),
			isWin ? path.resolve('SRC') + path.sep : path.join('..', 'SRC')
		);
		assertEqualFilePath('DEST/SRC', 'SRC');
	});

	it('should respect cwd', () => {
		mkdirp.sync('SRC/DEEP');
		fs.writeFileSync('SRC/DEEP/a', '');
		lnk.sync('DEEP/a', '../DEST', {cwd: 'SRC'});
		assertIdenticalFile('DEST/a', 'SRC/DEEP/a');
	});

	it('should respect parents option', () => {
		mkdirp.sync('SRC/DEEP');
		fs.writeFileSync('SRC/DEEP/a', '');
		lnk.sync('DEEP/a', '../DEST', {cwd: 'SRC', parents: true});
		assertIdenticalFile('DEST/DEEP/a', 'SRC/DEEP/a');
	});

	it('should hard link files in default mode', () => {
		mkdirp.sync('SRC');
		fs.writeFileSync('SRC/a', '');
		lnk.sync('SRC/a', 'DEST', {type: 'default'});
		assertIdenticalFile('DEST/a', 'SRC/a');
	});

	it('should junction directories in default mode', () => {
		mkdirp.sync('SRC/DIR');
		lnk.sync('SRC/DIR', 'DEST', {type: 'default'});
		assertEqualFilePath('DEST/DIR', 'SRC/DIR');
	});

	it('should overwrite if desired', () => {
		mkdirp.sync('SRC/DIR');
		mkdirp.sync('DEST');
		fs.writeFileSync('DEST/DIR', '');
		lnk.sync('SRC/DIR', 'DEST', {force: true});
		assertEqualFilePath('DEST/DIR', 'SRC/DIR');
	});

	it('should not overwrite if not desired', () => {
		mkdirp.sync('SRC/DIR');
		mkdirp.sync('DEST');
		fs.writeFileSync('DEST/DIR', '');
		try {
			lnk.sync('SRC/DIR', 'DEST');
		} catch (err) {
			if (err.code === 'EEXIST') {
				return;
			}
			assert.ifError(err);
		}
		assert.fail(undefined, undefined, 'missing Error');
	});

	it('should fail on impossible TARGET', () => {
		try {
			lnk.sync('TARGET', 'DIRECTORY');
		} catch (err) {
			if (/TARGET/.test(err)) {
				return;
			}
			assert.ifError(err);
		} finally {
			assert.throws(fs.statSync.bind(fs, 'DIRECTORY/TARGET'), /ENOENT/);
		}
		assert.fail(undefined, undefined, 'missing Error');
	});

	it('should fail on impossible DEST', () => {
		fs.writeFileSync('a', '');
		fs.writeFileSync('DEST', '');
		try {
			lnk.sync('a', 'DEST');
		} catch (err) {
			if (/DEST/.test(err)) {
				return;
			}
			assert.ifError(err);
		}
		assert.fail(undefined, undefined, 'missing Error');
	});

	it('should not overwrite if TARGET and DEST are the same', () => {
		fs.writeFileSync('a', '');
		fs.symlinkSync('.', 'b');
		try {
			lnk.sync('a', 'b', {force: true});
		} catch (err) {
			if (/same/.test(err)) {
				return;
			}
			assert.ifError(err);
		}
		assert.fail(undefined, undefined, 'missing Error');
	});

	it('should create ELOOP', () => {
		lnk.sync('a', '.', {type: 'symbolic'});
		assert.strictEqual(fs.readlinkSync('a'), 'a');
	});

	it('should be able to overwrite ELOOP', () => {
		fs.symlinkSync('a', 'a');
		lnk.sync(
			'a', '.',
			{type: 'symbolic', force: true}
		);
		assert.strictEqual(fs.readlinkSync('a'), 'a');
	});

	it('should pass unhandled TARGET Errors', () => {
		const sut = rewire('../');

		sut.__set__('fs', {
			statSync: filepath => {
				if (path.normalize(filepath) === path.normalize('TARGET/a')) {
					throw new Error('BAD_THINGS_HAPPEND');
				}
				return fs.statSync(filepath);
			}
		});

		mkdirp.sync('TARGET');
		fs.writeFileSync('TARGET/a', '');
		mkdirp.sync('DIRECTORY');
		fs.writeFileSync('DIRECTORY/a', '');

		assert.throws(sut.sync.bind(sut, 'TARGET/a', 'DIRECTORY', {force: true}),
			/BAD_THINGS_HAPPEND/);
	});

	it('should pass unhandled DIRECTORY Errors', () => {
		const sut = rewire('../');

		sut.__set__('fs', {
			statSync: filepath => {
				if (path.normalize(filepath) === path.normalize('DIRECTORY/a')) {
					throw new Error('BAD_THINGS_HAPPEND');
				}
				return fs.statSync(filepath);
			}
		});

		mkdirp.sync('TARGET');
		fs.writeFileSync('TARGET/a', '');
		mkdirp.sync('DIRECTORY');
		fs.writeFileSync('DIRECTORY/a', '');

		assert.throws(sut.sync.bind(sut, 'TARGET/a', 'DIRECTORY', {force: true}),
			/BAD_THINGS_HAPPEND/);
	});

	it('should handle DIRECTORY Errors caused by race condition', () => {
		const sut = rewire('../');

		sut.__set__('fs', {
			statSync: filepath => {
				if (path.normalize(filepath) === path.normalize('DIRECTORY/a')) {
					const err = new Error('BAD_THINGS_HAPPEND');
					err.code = 'ENOENT';
					throw err;
				}

				return fs.statSync(filepath);
			}
		});

		mkdirp.sync('TARGET');
		fs.writeFileSync('TARGET/a', '');
		mkdirp.sync('DIRECTORY');
		fs.writeFileSync('DIRECTORY/a', '');

		sut.sync('TARGET/a', 'DIRECTORY', {force: true});
	});
});
