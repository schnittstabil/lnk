import fs from 'fs';
import path from 'path';
import test from 'ava';

import execa from 'execa';
import mkdirp from 'mkdirp';
import rewire from 'rewire';

import {assertIdenticalFile, assertEqualFilePath} from './helpers/assert';
import {before, beforeEach, after} from './helpers/hooks';

const CLI = path.join(__dirname, '..', 'cli.js');

test.before(before(__filename));
test.after(after(__filename));

test.beforeEach(t => {
	const logs = [];
	const cli = rewire('../cli');

	cli.__set__('npmlog', {
		log: (...args) => {
			logs.push(args);
		}
	});

	t.context.logs = logs;
	t.context.cli = cli;

	return beforeEach(__filename)();
});

test.serial.cb('should error a message on missing TARGETS', t => {
	t.context.cli([], status => {
		let found = false;
		t.context.logs.forEach(entry => {
			const level = entry[0];
			const msg = entry[2];
			if (/targets/i.test(msg)) {
				t.is(level, 'error');
				found = true;
			}
		});
		t.true(found);
		t.truthy(status);
		t.end();
	});
});

test.serial.cb('should error a message on missing DIRECTORY', t => {
	t.context.cli(['target'], status => {
		let found = false;
		t.context.logs.forEach(entry => {
			const level = entry[0];
			const msg = entry[2];
			if (/directory/i.test(msg)) {
				t.is(level, 'error');
				found = true;
			}
		});
		t.true(found);
		t.truthy(status);
		t.end();
	});
});

test.serial.cb('should error a message on unknown option', t => {
	t.context.cli(['--symbolix', 'TARGET', 'DEST'], status => {
		let found = false;
		t.context.logs.forEach(entry => {
			const level = entry[0];
			const msg = entry[2];
			if (/symbolix/.test(msg)) {
				t.is(level, 'error');
				found = true;
			}
		});
		t.true(found);
		t.truthy(status);
		t.end();
	});
});

test.serial('should error a message and return a non-zero exit status on errors', t => {
	const err = t.throws(execa('node', [CLI])); // missing TARGET Error
	t.not(err.message, '');
	t.not(err.code, 0);
});

test.serial.cb('should error a message on --symbolic with --hard', t => {
	t.context.cli(['--symbolic', '--hard', 'TARGET', 'DEST'], status => {
		let found = false;
		t.context.logs.forEach(entry => {
			const level = entry[0];
			const msg = entry[2];
			if (/(symbolic.+hard)|(hard.+symbolic)/.test(msg)) {
				t.is(level, 'error');
				found = true;
			}
		});
		t.true(found);
		t.truthy(status);
		t.end();
	});
});

test.serial.cb('should link a file', t => {
	mkdirp.sync('DEST/');
	fs.writeFileSync('a', '');
	t.context.cli(['a', 'DEST'], status => {
		t.ifError(status);
		assertIdenticalFile('DEST/a', 'a');
		t.end();
	});
});

test.serial.cb('should symlink a file', t => {
	mkdirp.sync('DEST');
	fs.writeFileSync('a', '');
	t.context.cli(['--symbolic', 'a', 'DEST'], status => {
		t.ifError(status);
		assertEqualFilePath('DEST/a', 'a');
		t.end();
	});
});
