/* eslint-env mocha */
/* eslint no-underscore-dangle: 0 */
'use strict';
const assert = require('assert');
const join = require('path').join;
const uuid = require('uuid');
const rewire = require('rewire');

const lnk = require('../');
const link = require('../link');
const hooks = require('./utils/hooks');

describe('link', () => {
	beforeEach(new hooks.tempCwd.BeforeEach(__filename));
	afterEach(new hooks.tempCwd.AfterEach(__filename));
	after(new hooks.tempCwd.After(__filename));

	it('getTypes should include `default`', () => {
		assert(link.getTypes().indexOf('default') > -1);
	});

	[
		'get',
		'getSync',
		'getTypes'
	].forEach(key => {
		it('.' + key + ' should be a function', () => {
			assert.strictEqual(typeof link[key], 'function');
		});

		it('getTypes should not include `' + key + '`', () => {
			assert(link.getTypes().indexOf(key) === -1);
		});
	});

	it('should be extensible', done => {
		const type = uuid.v1();

		link[type] = (target, linkPath, cb) => {
			assert.strictEqual(target, 'TARGET');
			assert.strictEqual(linkPath, join('DIRECTORY', 'TARGET'));
			cb();
		};

		lnk('TARGET', 'DIRECTORY', {type: type}, done);
	});

	describe('.junction', () => {
		it('should symlink relative on modern OSs', done => {
			let symLinked = false;
			const sut = rewire('../link');

			sut.__set__('isWin', false);
			sut.__set__('fs', {
				symlink: (target, path, type, cb) => {
					symLinked = true;
					assert.strictEqual(target, join('..', 'TARGET', 'a'));
					cb();
				}
			});
			sut.junction('TARGET/a', 'DIRECTORY/a', err => {
				assert.ifError(err);
				assert.ok(symLinked);
				done();
			});
		});

		it('should create directory junction on Windows', done => {
			let linked = false;
			const sut = rewire('../link');

			sut.__set__('isWin', true);
			sut.__set__('fs', {
				symlink: (target, path, type, cb) => {
					linked = true;
					assert.strictEqual(type, 'junction');
					cb();
				}
			});
			sut.junction('TARGET/a', 'DIRECTORY/a', err => {
				assert.ifError(err);
				assert.ok(linked);
				done();
			});
		});
	});

	describe('sync', () => {
		it('should be extensible (globally)', () => {
			const type = uuid.v1();

			link[type + 'Sync'] = (target, linkPath) => {
				assert.strictEqual(target, 'TARGET');
				assert.strictEqual(linkPath, join('DIRECTORY', 'TARGET'));
			};

			lnk.sync('TARGET', 'DIRECTORY', {type: type});
		});

		describe('.junction', () => {
			it('should symlink relative on modern OSs', () => {
				let symLinked = false;
				const sut = rewire('../link');

				sut.__set__('isWin', false);
				sut.__set__('fs', {
					symlinkSync: (target, path, type) => {
						symLinked = true;
						assert.strictEqual(type, 'junction');
						assert.strictEqual(target, join('..', 'TARGET', 'a'));
					}
				});
				sut.junctionSync('TARGET/a', 'DIRECTORY/a');
				assert.ok(symLinked);
			});

			it('should create directory junction on Windows', () => {
				let linked = false;
				const sut = rewire('../link');

				sut.__set__('isWin', true);
				sut.__set__('fs', {
					symlinkSync: (target, path, type) => {
						linked = true;
						assert.strictEqual(type, 'junction');
					}
				});
				sut.junctionSync('TARGET/a', 'DIRECTORY/a');
				assert.ok(linked);
			});
		});
	});
});
