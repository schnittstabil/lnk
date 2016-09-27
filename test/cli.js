/* eslint-env mocha */
/* eslint no-underscore-dangle: 0 */
'use strict';
const spawn = require('child_process').spawn;
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const mkdirp = require('mkdirp');
const rewire = require('rewire');

const assertUtils = require('./utils/assert');
const hooks = require('./utils/hooks');

const CLI = path.join(__dirname, '..', 'cli.js');
const assertIdenticalFile = assertUtils.assertIdenticalFile;
const assertEqualFilePath = assertUtils.assertEqualFilePath;

describe('cli', function () {
	let logs;
	let cli;

	this.timeout(5000);

	beforeEach(done => {
		logs = [];

		cli = rewire('../cli');
		cli.__set__('npmlog', {
			log: (...args) => {
				logs.push(args);
			}
		});

		(new hooks.tempCwd.BeforeEach(__filename)).call(this, done);
	});

	afterEach(new hooks.tempCwd.AfterEach(__filename));

	after(new hooks.tempCwd.After(__filename));

	it('should error a message on missing TARGETS', done => {
		cli([], status => {
			let found = false;
			logs.forEach(entry => {
				const level = entry[0];
				const msg = entry[2];
				if (/targets/i.test(msg)) {
					assert.strictEqual(level, 'error');
					found = true;
				}
			});
			assert.ok(found);
			assert.ok(status);
			done();
		});
	});

	it('should error a message on missing DIRECTORY', done => {
		cli(['target'], status => {
			let found = false;
			logs.forEach(entry => {
				const level = entry[0];
				const msg = entry[2];
				if (/directory/i.test(msg)) {
					assert.strictEqual(level, 'error');
					found = true;
				}
			});
			assert.ok(found);
			assert.ok(status);
			done();
		});
	});

	it('should error a message on unknown option', done => {
		cli(['--symbolix', 'TARGET', 'DEST'], status => {
			let found = false;
			logs.forEach(entry => {
				const level = entry[0];
				const msg = entry[2];
				if (/symbolix/.test(msg)) {
					assert.strictEqual(level, 'error');
					found = true;
				}
			});
			assert.ok(found);
			assert.ok(status);
			done();
		});
	});

	it('should error a message and return a non-zero exit status on errors',
		done => {
			let err = '';
			const sut = spawn('node', [CLI]); // missing TARGET Error
			sut.stderr.setEncoding('utf8');
			sut.stderr.on('data', data => {
				err += data;
			});
			sut.on('close', status => {
				assert.ok(status !== 0, 'unexpected exit status: ' + status);
				assert.notStrictEqual(err, '', err);
				done();
			});
		}
	);

	it('should error a message on --symbolic with --hard', done => {
		cli(['--symbolic', '--hard', 'TARGET', 'DEST'], status => {
			let found = false;
			logs.forEach(entry => {
				const level = entry[0];
				const msg = entry[2];
				if (/(symbolic.+hard)|(hard.+symbolic)/.test(msg)) {
					assert.strictEqual(level, 'error');
					found = true;
				}
			});
			assert.ok(found);
			assert.ok(status);
			done();
		});
	});

	it('should link a file', done => {
		mkdirp.sync('DEST/');
		fs.writeFileSync('a', '');
		cli(['a', 'DEST'], status => {
			assert.ifError(status);
			assertIdenticalFile('DEST/a', 'a');
			done();
		});
	});

	it('should symlink a file', done => {
		mkdirp.sync('DEST');
		fs.writeFileSync('a', '');
		cli(['--symbolic', 'a', 'DEST'], status => {
			assert.ifError(status);
			assertEqualFilePath('DEST/a', 'a');
			done();
		});
	});
});
