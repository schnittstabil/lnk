import fs from 'fs';
import path from 'path';
import test from 'ava';

import mkdirp from 'mkdirp';
import rewire from 'rewire';

import lnk from '../';
import {assertIdenticalFile, assertEqualFilePath} from './helpers/assert';
import {before, beforeEach, after} from './helpers/hooks';

const isWin = process.platform === 'win32';

test.before(before(__filename));
test.beforeEach(beforeEach(__filename));
test.after(after(__filename));

test.serial('should throw an Error on missing TARGET', t => {
	t.throws(() => lnk.sync());
});

test.serial('should not throw an Error on empty TARGETs', t => {
	t.notThrows(() => lnk.sync([], 'DEST'));
});

test.serial('should throw an Error on missing DIRECTORY', t => {
	t.throws(() => lnk.sync('TARGET'));
});

test.serial('should throw an Error for an unknown link type', t => {
	t.throws(() => lnk.sync('a', 'DEST/', {type: 'UNKNOWN_TYPE'}), /UNKNOWN_TYPE/);
});

test.serial('should link a file', () => {
	mkdirp.sync('DEST/');
	fs.writeFileSync('a', '');
	lnk.sync('a', 'DEST/');
	assertIdenticalFile('DEST/a', 'a');
});

test.serial('should create DEST', () => {
	fs.writeFileSync('a', '');
	lnk.sync('a', 'DEST/');
	assertIdenticalFile('DEST/a', 'a');
});

test.serial('should symlink a file', () => {
	fs.writeFileSync('a', '');
	lnk.sync('a', 'DEST', {type: 'symbolic'});
	assertEqualFilePath('DEST/a', 'a');
});

test.serial('should directory link a directory', () => {
	mkdirp.sync('SRC');
	lnk.sync('SRC', 'DEST', {type: 'directory'});
	assertEqualFilePath('DEST/SRC', 'SRC');
});

test.serial('should junction link a directory', t => {
	mkdirp.sync('SRC');

	lnk.sync('SRC', 'DEST', {type: 'junction'});

	// junction paths are always absolute on windows
	t.is(
		fs.readlinkSync('DEST/SRC'),
		isWin ? path.resolve('SRC') + path.sep : path.join('..', 'SRC')
	);
	assertEqualFilePath('DEST/SRC', 'SRC');
});

test.serial('should respect cwd', () => {
	mkdirp.sync('SRC/DEEP');
	fs.writeFileSync('SRC/DEEP/a', '');
	lnk.sync('DEEP/a', '../DEST', {cwd: 'SRC'});
	assertIdenticalFile('DEST/a', 'SRC/DEEP/a');
});

test.serial('should respect parents option', () => {
	mkdirp.sync('SRC/DEEP');
	fs.writeFileSync('SRC/DEEP/a', '');
	lnk.sync('DEEP/a', '../DEST', {cwd: 'SRC', parents: true});
	assertIdenticalFile('DEST/DEEP/a', 'SRC/DEEP/a');
});

test.serial('should hard link files in default mode', () => {
	mkdirp.sync('SRC');
	fs.writeFileSync('SRC/a', '');
	lnk.sync('SRC/a', 'DEST', {type: 'default'});
	assertIdenticalFile('DEST/a', 'SRC/a');
});

test.serial('should junction directories in default mode', () => {
	mkdirp.sync('SRC/DIR');
	lnk.sync('SRC/DIR', 'DEST', {type: 'default'});
	assertEqualFilePath('DEST/DIR', 'SRC/DIR');
});

test.serial('should overwrite if desired', () => {
	mkdirp.sync('SRC/DIR');
	mkdirp.sync('DEST');
	fs.writeFileSync('DEST/DIR', '');
	lnk.sync('SRC/DIR', 'DEST', {force: true});
	assertEqualFilePath('DEST/DIR', 'SRC/DIR');
});

test.serial('should not overwrite if not desired', t => {
	mkdirp.sync('SRC/DIR');
	mkdirp.sync('DEST');
	fs.writeFileSync('DEST/DIR', '');

	const err = t.throws(() => lnk.sync('SRC/DIR', 'DEST'));
	t.is(err.code, 'EEXIST');
});

test.serial('should fail on impossible TARGET', t => {
	const err = t.throws(() => lnk.sync('TARGET', 'DIRECTORY'));
	t.regex(err, /TARGET/);

	t.throws(() => fs.statSync('DIRECTORY/TARGET'), /ENOENT/);
});

test.serial('should fail on impossible DEST', t => {
	fs.writeFileSync('a', '');
	fs.writeFileSync('DEST', '');

	const err = t.throws(() => lnk.sync('a', 'DEST'));
	t.regex(err, /DEST/);
});

test.serial('should not overwrite if TARGET and DEST are the same', t => {
	fs.writeFileSync('a', '');
	fs.symlinkSync('.', 'b');

	const err = t.throws(() => lnk.sync('a', 'b', {force: true}));
	t.regex(err, /same/);
});

test.serial('should create ELOOP', t => {
	lnk.sync('a', '.', {type: 'symbolic'});
	t.is(fs.readlinkSync('a'), 'a');
});

test.serial('should be able to overwrite ELOOP', t => {
	fs.symlinkSync('a', 'a');
	lnk.sync(
		'a', '.',
		{type: 'symbolic', force: true}
	);
	t.is(fs.readlinkSync('a'), 'a');
});

test.serial('should pass unhandled TARGET Errors', t => {
	const assertSaveOverwrite = rewire('../assert-save-overwrite');
	const sut = rewire('../');

	assertSaveOverwrite.__set__('fs', {
		statSync: filepath => {
			if (path.normalize(filepath) === path.normalize('TARGET/a')) {
				throw new Error('BAD_THINGS_HAPPEND');
			}
			return fs.statSync(filepath);
		}
	});
	sut.__set__('assertSaveOverwrite', assertSaveOverwrite);

	mkdirp.sync('TARGET');
	fs.writeFileSync('TARGET/a', '');
	mkdirp.sync('DIRECTORY');
	fs.writeFileSync('DIRECTORY/a', '');

	t.throws(() => sut.sync('TARGET/a', 'DIRECTORY', {force: true}), /BAD_THINGS_HAPPEND/);
});

test.serial('should pass unhandled DIRECTORY Errors', t => {
	const assertSaveOverwrite = rewire('../assert-save-overwrite');
	const sut = rewire('../');

	assertSaveOverwrite.__set__('fs', {
		statSync: filepath => {
			if (path.normalize(filepath) === path.normalize('DIRECTORY/a')) {
				throw new Error('BAD_THINGS_HAPPEND');
			}
			return fs.statSync(filepath);
		}
	});
	sut.__set__('assertSaveOverwrite', assertSaveOverwrite);

	mkdirp.sync('TARGET');
	fs.writeFileSync('TARGET/a', '');
	mkdirp.sync('DIRECTORY');
	fs.writeFileSync('DIRECTORY/a', '');

	t.throws(() => sut.sync('TARGET/a', 'DIRECTORY', {force: true}), /BAD_THINGS_HAPPEND/);
});

test.serial('should handle DIRECTORY Errors caused by race condition', () => {
	const assertSaveOverwrite = rewire('../assert-save-overwrite');
	const sut = rewire('../');

	assertSaveOverwrite.__set__('fs', {
		statSync: filepath => {
			if (path.normalize(filepath) === path.normalize('DIRECTORY/a')) {
				const err = new Error('BAD_THINGS_HAPPEND');
				err.code = 'ENOENT';
				throw err;
			}

			return fs.statSync(filepath);
		}
	});
	sut.__set__('assertSaveOverwrite', assertSaveOverwrite);

	mkdirp.sync('TARGET');
	fs.writeFileSync('TARGET/a', '');
	mkdirp.sync('DIRECTORY');
	fs.writeFileSync('DIRECTORY/a', '');

	sut.sync('TARGET/a', 'DIRECTORY', {force: true});
});
