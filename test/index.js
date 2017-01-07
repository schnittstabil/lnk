import fs from 'fs';
import path from 'path';
import test from 'ava';

import mkdirp from 'mkdirp';
import pify from 'pify';
import rewire from 'rewire';

import lnk from '../';
import {assertIdenticalFile, assertEqualFilePath} from './helpers/assert';
import {before, beforeEach, after} from './helpers/hooks';

const fsP = pify(fs);
const isWin = process.platform === 'win32';

test.before(before(__filename));
test.beforeEach(beforeEach(__filename));
test.after(after(__filename));

test.serial('should throw an Error on missing TARGET', async t => {
	await t.throws(lnk(undefined, undefined));
});

test.serial('should throw an Error on missing DIRECTORY', async t => {
	await t.throws(lnk('TARGET', undefined));
});

test.serial('should not throw an Error on empty TARGETs', async t => {
	await t.notThrows(lnk([], 'DEST'));
});

test.serial('should throw an Error for an unknown link type', async t => {
	await t.throws(lnk('a', 'DEST/', {type: 'UNKNOWN_TYPE'}, /UNKNOWN_TYPE/));
});

test.serial('should link a file', async () => {
	mkdirp.sync('DEST/');
	fs.writeFileSync('a', '');

	await lnk('a', 'DEST/');
	assertIdenticalFile('DEST/a', 'a');
});

test.serial('should create DEST', async () => {
	fs.writeFileSync('a', '');

	await lnk('a', 'DEST/');
	assertIdenticalFile('DEST/a', 'a');
});

test.serial('should symlink a file', async () => {
	fs.writeFileSync('a', '');

	await lnk('a', 'DEST', {type: 'symbolic'});
	assertEqualFilePath('DEST/a', 'a');
});

test.serial('should directory link a directory', async () => {
	mkdirp.sync('SRC');

	await lnk('SRC', 'DEST', {type: 'directory'});
	assertEqualFilePath('DEST/SRC', 'SRC');
});

test.serial('should junction link a directory', async t => {
	mkdirp.sync('SRC');

	await lnk('SRC', 'DEST', {type: 'junction'});

	// junction paths are always absolute on windows
	t.is(
		fs.readlinkSync('DEST/SRC'),
		isWin ? path.resolve('SRC') + path.sep : path.join('..', 'SRC')
	);
	assertEqualFilePath('DEST/SRC', 'SRC');
});

test.serial('should respect cwd', async () => {
	mkdirp.sync('SRC/DEEP');
	fs.writeFileSync('SRC/DEEP/a', '');

	await lnk('DEEP/a', '../DEST', {cwd: 'SRC'});
	assertIdenticalFile('DEST/a', 'SRC/DEEP/a');
});

test.serial('should respect parents option', async () => {
	mkdirp.sync('SRC/DEEP');
	fs.writeFileSync('SRC/DEEP/a', '');

	await lnk('DEEP/a', '../DEST', {cwd: 'SRC', parents: true});
	assertIdenticalFile('DEST/DEEP/a', 'SRC/DEEP/a');
});

test.serial('should hard link files in default mode', async () => {
	mkdirp.sync('SRC');
	fs.writeFileSync('SRC/a', '');

	await lnk('SRC/a', 'DEST', {type: 'default'});
	assertIdenticalFile('DEST/a', 'SRC/a');
});

test.serial('should junction directories in default mode', async () => {
	mkdirp.sync('SRC/DIR');

	await lnk('SRC/DIR', 'DEST', {type: 'default'});
	assertEqualFilePath('DEST/DIR', 'SRC/DIR');
});

test.serial('should overwrite if desired', async () => {
	mkdirp.sync('SRC/DIR');
	mkdirp.sync('DEST');
	fs.writeFileSync('DEST/DIR', '');

	await lnk('SRC/DIR', 'DEST', {force: true});
	assertEqualFilePath('DEST/DIR', 'SRC/DIR');
});

test.serial('should not overwrite if not desired', async t => {
	mkdirp.sync('SRC/DIR');
	mkdirp.sync('DEST');
	fs.writeFileSync('DEST/DIR', '');

	const err = await t.throws(lnk('SRC/DIR', 'DEST'));
	t.is(err.code, 'EEXIST');
});

test.serial('should fail on impossible TARGET', async t => {
	await t.throws(lnk('TARGET', 'DIRECTORY'), /TARGET/);
	await t.throws(() => fs.statSync('DIRECTORY/TARGET'), /ENOENT/);
});

test.serial('should fail on impossible DEST', async t => {
	fs.writeFileSync('a', '');
	fs.writeFileSync('DEST', '');

	await t.throws(lnk('a', 'DEST'), /DEST/);
});

test.serial('should not overwrite if TARGET and DEST are the same', async t => {
	fs.writeFileSync('a', '');
	fs.symlinkSync('.', 'b');

	await t.throws(lnk('a', 'b', {force: true}), /same/);
});

test.serial('should create ELOOP', async t => {
	await lnk('a', '.', {type: 'symbolic'});
	t.is(fs.readlinkSync('a'), 'a');
});

test.serial('should be able to overwrite ELOOP', async t => {
	fs.symlinkSync('a', 'a');

	await lnk('a', '.',	{type: 'symbolic', force: true});
	t.is(fs.readlinkSync('a'), 'a');
});

test.serial('should pass unhandled TARGET Errors', async t => {
	const assertSaveOverwrite = rewire('../assert-save-overwrite');
	const sut = rewire('../');

	assertSaveOverwrite.__set__('fsStatP', filepath => Promise.resolve().then(() => {
		if (fs.realpathSync(filepath) === fs.realpathSync('TARGET/a')) {
			throw new Error('BAD_THINGS_HAPPEND');
		}

		return fsP.stat(filepath);
	}));
	sut.__set__('assertSaveOverwrite', assertSaveOverwrite);

	mkdirp.sync('TARGET');
	fs.writeFileSync('TARGET/a', '');
	mkdirp.sync('DIRECTORY');
	fs.writeFileSync('DIRECTORY/a', '');

	const err = await t.throws(sut('TARGET/a', 'DIRECTORY', {force: true}));
	t.regex(err, /BAD_THINGS_HAPPEND/);
});

test.serial('should pass unhandled DIRECTORY Errors', async t => {
	const assertSaveOverwrite = rewire('../assert-save-overwrite');
	const sut = rewire('../');

	assertSaveOverwrite.__set__('fsStatP', filepath => Promise.resolve().then(() => {
		if (fs.realpathSync(filepath) === fs.realpathSync('DIRECTORY/a')) {
			throw new Error('BAD_THINGS_HAPPEND');
		}

		return fsP.stat(filepath);
	}));
	sut.__set__('assertSaveOverwrite', assertSaveOverwrite);

	mkdirp.sync('TARGET');
	fs.writeFileSync('TARGET/a', '');
	mkdirp.sync('DIRECTORY');
	fs.writeFileSync('DIRECTORY/a', '');

	const err = await t.throws(sut('TARGET/a', 'DIRECTORY', {force: true}));
	t.regex(err, /BAD_THINGS_HAPPEND/);
});

test.serial('should handle DIRECTORY Errors caused by race condition', async t => {
	t.plan(2);
	const assertSaveOverwrite = rewire('../assert-save-overwrite');
	const sut = rewire('../');

	assertSaveOverwrite.__set__('fsStatP', filepath => Promise.resolve().then(() => {
		if (fs.realpathSync(filepath) === fs.realpathSync('DIRECTORY/a')) {
			const err = new Error('BAD_THINGS_HAPPEND');
			err.code = 'ENOENT';
			t.pass();
			throw err;
		}

		return fsP.stat(filepath);
	}));
	sut.__set__('assertSaveOverwrite', assertSaveOverwrite);

	mkdirp.sync('TARGET');
	fs.writeFileSync('TARGET/a', '');
	mkdirp.sync('DIRECTORY');
	fs.writeFileSync('DIRECTORY/a', '');

	await t.notThrows(sut('TARGET/a', 'DIRECTORY', {force: true}));
});
