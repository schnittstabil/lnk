'use strict';

const path = require('path');
const series = require('array-series');
const mkdirp = require('mkdirp');
const rimraf = require('rimraf');

const CWD = process.cwd();

const clean = (testDir, done) => {
	series([
		rimraf.bind(rimraf, testDir),
		cb => {
			mkdirp(testDir, err => {
				if (err && err.code === 'EPERM') {
					// M$ issue; just try again
					setTimeout(() => {
						mkdirp(testDir, cb);
					}, 5000);
				} else {
					cb(err);
				}
			});
		},
		cb => {
			process.chdir(testDir);
			cb();
		}
	], done);
};

exports.tempCwd = {
	BeforeEach: function (testFileName) {
		return done => {
			const testDir = path.join('temp', path.basename(testFileName, '.js'));

			// preserve temp/ to avoid most gazer ENOENTs
			process.chdir(CWD);
			clean(testDir, done);
		};
	},

	AfterEach: function (testFileName) {
		return function (done) {
			const testDir = path.join('temp', path.basename(testFileName, '.js'));
			process.chdir(CWD);

			if (this.currentTest.state === 'passed' || !this.test.parent.bail()) {
				clean(testDir, done);
			} else {
				done();
			}
		};
	},

	After: function () {
		return () => {
			process.chdir(CWD);
		};
	}
};
