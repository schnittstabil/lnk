import fs from 'fs';
import path from 'path';
import test from 'ava';

import mkdirp from 'mkdirp';
import rewire from 'rewire';

import lnk from '../';
import {assertIdenticalFile, assertEqualFilePath} from './helpers/assert';
import {before, beforeEach, after} from './helpers/hooks';

const isWin = process.platform === 'win32';
const noop = () => {};

test.before(before(__filename));
test.beforeEach(beforeEach(__filename));
test.after(after(__filename));

test.serial('should throw an Error on missing TARGET', t => {
	t.throws(() => lnk(undefined, undefined, noop));
});

test.serial('should throw an Error on missing DIRECTORY', t => {
	t.throws(() => lnk('TARGET', undefined, noop));
});

test.serial.cb('should not throw an Error on empty TARGETs', t => {
	lnk([], 'DEST', t.end);
});

test.serial('should throw an Error for an unknown link type', t => {
	t.throws(() => {
		lnk('a', 'DEST/', {type: 'UNKNOWN_TYPE'}, noop);
	}, /UNKNOWN_TYPE/);
});

test.serial.cb('should link a file', t => {
	mkdirp.sync('DEST/');
	fs.writeFileSync('a', '');
	lnk('a', 'DEST/', err => {
		t.ifError(err);
		assertIdenticalFile('DEST/a', 'a');
		t.end();
	});
});

test.serial.cb('should create DEST', t => {
	fs.writeFileSync('a', '');
	lnk('a', 'DEST/', err => {
		t.ifError(err);
		assertIdenticalFile('DEST/a', 'a');
		t.end();
	});
});

test.serial.cb('should symlink a file', t => {
	fs.writeFileSync('a', '');
	lnk('a', 'DEST', {type: 'symbolic'}, err => {
		t.ifError(err);
		assertEqualFilePath('DEST/a', 'a');
		t.end();
	});
});

test.serial.cb('should directory link a directory', t => {
	mkdirp.sync('SRC');
	lnk('SRC', 'DEST', {type: 'directory'}, err => {
		t.ifError(err);
		assertEqualFilePath('DEST/SRC', 'SRC');
		t.end();
	});
});

test.serial.cb('should junction link a directory', t => {
	mkdirp.sync('SRC');

	lnk('SRC', 'DEST', {type: 'junction'}, err => {
		t.ifError(err);
		t.is(
			fs.readlinkSync('DEST/SRC'),
			isWin ? path.resolve('SRC') + path.sep : path.join('..', 'SRC')
		);
		assertEqualFilePath('DEST/SRC', 'SRC');
		t.end();
	});
});

test.serial.cb('should respect cwd', t => {
	mkdirp.sync('SRC/DEEP');
	fs.writeFileSync('SRC/DEEP/a', '');
	lnk('DEEP/a', '../DEST', {cwd: 'SRC'}, err => {
		t.ifError(err);
		assertIdenticalFile('DEST/a', 'SRC/DEEP/a');
		t.end();
	});
});

test.serial.cb('should respect parents option', t => {
	mkdirp.sync('SRC/DEEP');
	fs.writeFileSync('SRC/DEEP/a', '');
	lnk('DEEP/a', '../DEST', {cwd: 'SRC', parents: true}, err => {
		t.ifError(err);
		assertIdenticalFile('DEST/DEEP/a', 'SRC/DEEP/a');
		t.end();
	});
});

test.serial.cb('should hard link files in default mode', t => {
	mkdirp.sync('SRC');
	fs.writeFileSync('SRC/a', '');
	lnk('SRC/a', 'DEST', {type: 'default'}, err => {
		t.ifError(err);
		assertIdenticalFile('DEST/a', 'SRC/a');
		t.end();
	});
});

test.serial.cb('should junction directories in default mode', t => {
	mkdirp.sync('SRC/DIR');
	lnk('SRC/DIR', 'DEST', {type: 'default'}, err => {
		t.ifError(err);
		assertEqualFilePath('DEST/DIR', 'SRC/DIR');
		t.end();
	});
});

test.serial.cb('should overwrite if desired', t => {
	mkdirp.sync('SRC/DIR');
	mkdirp.sync('DEST');
	fs.writeFileSync('DEST/DIR', '');
	lnk('SRC/DIR', 'DEST', {force: true}, err => {
		t.ifError(err);
		assertEqualFilePath('DEST/DIR', 'SRC/DIR');
		t.end();
	});
});

test.serial.cb('should not overwrite if not desired', t => {
	mkdirp.sync('SRC/DIR');
	mkdirp.sync('DEST');
	fs.writeFileSync('DEST/DIR', '');
	lnk('SRC/DIR', 'DEST', err => {
		if (err.code === 'EEXIST') {
			t.end();
			return;
		}
		t.fail();
	});
});

test.serial.cb('should fail on impossible TARGET', t => {
	lnk('TARGET', 'DIRECTORY', err => {
		t.throws(fs.statSync.bind(fs, 'DIRECTORY/TARGET'), /ENOENT/);
		if (/TARGET/.test(err)) {
			t.end();
			return;
		}
		t.fail();
	});
});

test.serial.cb('should fail on impossible DEST', t => {
	fs.writeFileSync('a', '');
	fs.writeFileSync('DEST', '');
	lnk('a', 'DEST', err => {
		if (/DEST/.test(err)) {
			t.end();
			return;
		}
		t.fail();
	});
});

test.serial.cb('should not overwrite if TARGET and DEST are the same', t => {
	fs.writeFileSync('a', '');
	fs.symlinkSync('.', 'b');
	lnk('a', 'b', {force: true}, err => {
		if (/same/.test(err)) {
			t.end();
			return;
		}
		t.fail();
	});
});

test.serial.cb('should create ELOOP', t => {
	lnk('a', '.', {type: 'symbolic'}, err => {
		t.ifError(err);
		t.is(fs.readlinkSync('a'), 'a');
		t.end();
	});
});

test.serial.cb('should be able to overwrite ELOOP', t => {
	fs.symlinkSync('a', 'a');
	lnk(
		'a', '.',
		{type: 'symbolic', force: true},
		err => {
			t.ifError(err);
			t.is(fs.readlinkSync('a'), 'a');
			t.end();
		}
	);
});

test.serial.cb('should pass unhandled TARGET Errors', t => {
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
				return t.end();
			}
			t.ifError(err);
		}
		t.fail();
	});
});

test.serial.cb('should pass unhandled DIRECTORY Errors', t => {
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
				return t.end();
			}
			t.ifError(err);
		}
		t.fail();
	});
});

test.serial.cb('should handle DIRECTORY Errors caused by race condition', t => {
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
		t.ifError(err);
		t.end();
	});
});
