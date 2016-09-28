import fs from 'fs';
import path from 'path';
import test from 'ava';

import execa from 'execa';
import mkdirp from 'mkdirp';
import rewire from 'rewire';

import {assertIdenticalFile, assertEqualFilePath} from './helpers/assert';
import {before, beforeEach, after} from './helpers/hooks';

const CLI = path.join(__dirname, '..', 'cli.js');

const logsContain = (logs, level, regex) => logs.reduce((found, entry) => {
	const lvl = entry[0];
	const msg = entry[2];

	return found || (level === lvl && regex.test(msg));
}, false);

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

test.serial('should error a message on missing TARGETS', async t => {
	const status = await t.context.cli([]);
	t.not(status, 0);
	t.true(logsContain(t.context.logs, 'error', /targets/i));
});

test.serial('should error a message on missing DIRECTORY', async t => {
	const status = await t.context.cli(['target']);
	t.not(status, 0);
	t.true(logsContain(t.context.logs, 'error', /directory/i));
});

test.serial('should error a message on unknown option', async t => {
	const status = await t.context.cli(['--symbolix', 'TARGET', 'DEST']);
	t.not(status, 0);
	t.true(logsContain(t.context.logs, 'error', /symbolix/));
});

test.serial('should error a message and return a non-zero exit status on errors', async t => {
	const err = await t.throws(execa('node', [CLI])); // missing TARGET Error
	t.not(err.message, '');
	t.not(err.code, 0);
});

test.serial('should error a message on --symbolic with --hard', async t => {
	const status = await t.context.cli(['--symbolic', '--hard', 'TARGET', 'DEST']);
	t.not(status, 0);
	t.true(logsContain(t.context.logs, 'error', /(symbolic.+hard)|(hard.+symbolic)/));
});

test.serial('should link a file', async t => {
	mkdirp.sync('DEST/');
	fs.writeFileSync('a', '');

	await t.context.cli(['a', 'DEST']);

	assertIdenticalFile('DEST/a', 'a');
});

test.serial('should symlink a file', async t => {
	mkdirp.sync('DEST');
	fs.writeFileSync('a', '');

	await t.context.cli(['--symbolic', 'a', 'DEST']);

	assertEqualFilePath('DEST/a', 'a');
});

test.serial('should info log a helpful message on error', async t => {
	const status = await t.context.cli([]);
	t.not(status, 0);
	t.true(logsContain(t.context.logs, 'info', /lnk --help/));
});

test.serial('should verbose log the version on error', async t => {
	const status = await t.context.cli(['--verbose']);
	t.not(status, 0);
	t.true(logsContain(t.context.logs, 'verbose', /lnk@[0-9]+\.[0-9]+\.[0-9]+/));
});

test.serial('should debug log sth', async t => {
	const status = await t.context.cli(['--debug']);
	t.true(logsContain(t.context.logs, 'silly', /./));
});
