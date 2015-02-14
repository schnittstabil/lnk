'use strict';

var path = require('path');
var series = require('array-series');
var mkdirp = require('mkdirp');
var rimraf = require('rimraf');
var CWD = process.cwd();

exports.tempCwd = {};

function clean(testDir, done) {
  series([
    rimraf.bind(rimraf, testDir),
    function(cb) {
      mkdirp(testDir, function(err) {
        if (err && err.code === 'EPERM') {
          // M$ issue; just try again
          setTimeout(function() {
            mkdirp(testDir, cb);
          }, 5000);
        } else {
          cb(err);
        }
      });
    },
    function(cb) {
      process.chdir(testDir);
      cb();
    },
  ], done);
}

exports.tempCwd.BeforeEach = function(testFileName) {
  var testDir = path.join('temp', path.basename(testFileName, '.js'));

  return function(done) {
    // preserve temp/ to avoid most gazer ENOENTs
    process.chdir(CWD);
    clean(testDir, done);
  };
};

exports.tempCwd.AfterEach = function(testFileName) {
  var testDir = path.join('temp', path.basename(testFileName, '.js'));
  return function(done) {
    process.chdir(CWD);
    if (this.currentTest.state === 'passed' || !this.test.parent.bail()) {
      clean(testDir, done);
    } else {
      done();
    }
  };
};

exports.tempCwd.After = function() {
  return function() {
    process.chdir(CWD);
  };
};
