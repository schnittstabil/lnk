/* eslint-env mocha */
/* eslint no-underscore-dangle: 0 */
'use strict';
var isWin = process.platform === 'win32';
var assert = require('assert');
var fs = require('fs');
var path = require('path');
var mkdirp = require('mkdirp');
var rewire = require('rewire');

var assertUtils = require('./utils/assert');
var assertIdenticalFile = assertUtils.assertIdenticalFile;
var assertEqualFilePath = assertUtils.assertEqualFilePath;
var hooks = require('./utils/hooks');

var lnk = require('../');

function noop() {}

describe('index()', function() {

  beforeEach(new hooks.tempCwd.BeforeEach(__filename));
  afterEach(new hooks.tempCwd.AfterEach(__filename));
  after(new hooks.tempCwd.After(__filename));

  it('should throw an Error on missing TARGET', function() {
    assert.throws(lnk.bind(lnk, undefined, undefined, noop));
  });

  it('should throw an Error on missing DIRECTORY', function() {
    assert.throws(lnk.bind(lnk, 'TARGET', undefined, noop));
  });

  it('should not throw an Error on empty TARGETs', function(done) {
    lnk([], 'DEST', function(err) {
      assert.ifError(err);
      done();
    });
  });

  it('should throw an Error for an unknown link type', function() {
    assert.throws(function() {
      lnk('a', 'DEST/', {type: 'UNKNOWN_TYPE'}, function() {});
    }, /UNKNOWN_TYPE/);
  });

  it('should link a file', function(done) {
    mkdirp.sync('DEST/');
    fs.writeFileSync('a', '');
    lnk('a', 'DEST/', function(err) {
      assert.ifError(err);
      assertIdenticalFile('DEST/a', 'a');
      done();
    });
  });

  it('should create DEST', function(done) {
    fs.writeFileSync('a', '');
    lnk('a', 'DEST/', function(err) {
      assert.ifError(err);
      assertIdenticalFile('DEST/a', 'a');
      done();
    });
  });

  it('should symlink a file', function(done) {
    fs.writeFileSync('a', '');
    lnk('a', 'DEST', {type: 'symbolic'}, function(err) {
      assert.ifError(err);
      assertEqualFilePath('DEST/a', 'a');
      done();
    });
  });

  it('should directory link a directory', function(done) {
    mkdirp.sync('SRC');
    lnk('SRC', 'DEST', {type: 'directory'}, function(err) {
        assert.ifError(err);
        assertEqualFilePath('DEST/SRC', 'SRC');
        done();
      }
    );
  });

  it('should junction link a directory', function(done) {
    mkdirp.sync('SRC');

    lnk('SRC', 'DEST', {type: 'junction'}, function(err) {
      assert.ifError(err);
      assert.strictEqual(
        fs.readlinkSync('DEST/SRC'),
        isWin ? path.resolve('SRC') + path.sep : path.join('..', 'SRC')
      );
      assertEqualFilePath('DEST/SRC', 'SRC');
      done();
    });
  });

  it('should respect cwd', function(done) {
    mkdirp.sync('SRC/DEEP');
    fs.writeFileSync('SRC/DEEP/a', '');
    lnk('DEEP/a', '../DEST', {cwd: 'SRC'}, function(err) {
      assert.ifError(err);
      assertIdenticalFile('DEST/a', 'SRC/DEEP/a');
      done();
    });
  });

  it('should respect parents option', function(done) {
    mkdirp.sync('SRC/DEEP');
    fs.writeFileSync('SRC/DEEP/a', '');
    lnk('DEEP/a', '../DEST', {cwd: 'SRC', parents: true}, function(err) {
      assert.ifError(err);
      assertIdenticalFile('DEST/DEEP/a', 'SRC/DEEP/a');
      done();
    });
  });

  it('should hard link files in default mode', function(done) {
    mkdirp.sync('SRC');
    fs.writeFileSync('SRC/a', '');
    lnk('SRC/a', 'DEST', {type: 'default'}, function(err) {
      assert.ifError(err);
      assertIdenticalFile('DEST/a', 'SRC/a');
      done();
    });
  });

  it('should junction directories in default mode', function(done) {
    mkdirp.sync('SRC/DIR');
    lnk('SRC/DIR', 'DEST', {type: 'default'}, function(err) {
      assert.ifError(err);
      assertEqualFilePath('DEST/DIR', 'SRC/DIR');
      done();
    });
  });

  it('should overwrite if desired', function(done) {
    mkdirp.sync('SRC/DIR');
    mkdirp.sync('DEST');
    fs.writeFileSync('DEST/DIR', '');
    lnk('SRC/DIR', 'DEST', {force: true}, function(err) {
      assert.ifError(err);
      assertEqualFilePath('DEST/DIR', 'SRC/DIR');
      done();
    });
  });

  it('should not overwrite if not desired', function(done) {
    mkdirp.sync('SRC/DIR');
    mkdirp.sync('DEST');
    fs.writeFileSync('DEST/DIR', '');
    lnk('SRC/DIR', 'DEST', function(err) {
      if (err.code === 'EEXIST') {
        done();
        return;
      }
      assert.fail(err, err, 'missing Error');
    });
  });

  it('should fail on impossible TARGET', function(done) {
    lnk('TARGET', 'DIRECTORY', function(err) {
      assert.throws(fs.statSync.bind(fs, 'DIRECTORY/TARGET'), /ENOENT/);
      if (/TARGET/.test(err)) {
        done();
        return;
      }
      assert.fail(err, err, 'missing Error');
    });
  });

  it('should fail on impossible DEST', function(done) {
    fs.writeFileSync('a', '');
    fs.writeFileSync('DEST', '');
    lnk('a', 'DEST', function(err) {
      if (/DEST/.test(err)) {
        done();
        return;
      }
      assert.fail(err, err, 'missing Error');
    });
  });

  it('should not overwrite if TARGET and DEST are the same',
    function(done) {
    fs.writeFileSync('a', '');
    fs.symlinkSync('.', 'b');
    lnk('a', 'b', {force: true}, function(err) {
      if (/same/.test(err)) {
        done();
        return;
      }
      assert.fail(err, err, 'missing Error');
    });
  });

  it('should create ELOOP', function(done) {
    lnk('a', '.', {type: 'symbolic'}, function(err) {
      assert.ifError(err);
      assert.strictEqual(fs.readlinkSync('a'), 'a');
      done();
    });
  });

  it('should be able to overwrite ELOOP', function(done) {
    fs.symlinkSync('a', 'a');
    lnk(
      'a', '.',
      {type: 'symbolic', force: true},
      function(err) {
        assert.ifError(err);
        assert.strictEqual(fs.readlinkSync('a'), 'a');
        done();
      }
    );
  });

  it('should pass unhandled TARGET Errors', function(done) {
    var sut = rewire('../');

    sut.__set__('fs', {
      stat: function(filepath, cb) {
        if (path.normalize(filepath) === path.normalize('TARGET/a')) {
          cb(new Error('BAD_THINGS_HAPPEND'));
        } else {
          fs.stat(filepath, cb);
        }
      },
    });

    mkdirp.sync('TARGET');
    fs.writeFileSync('TARGET/a', '');
    mkdirp.sync('DIRECTORY');
    fs.writeFileSync('DIRECTORY/a', '');

    sut('TARGET/a', 'DIRECTORY', {force: true}, function(err) {
      if (err) {
        if (/BAD_THINGS_HAPPEND/.test(err)) {
          return done();
        }
        assert.ifError(err);
      }
      assert.fail(err, err, 'missing Error');
    });
  });

  it('should pass unhandled DIRECTORY Errors', function(done) {
    var sut = rewire('../');

    sut.__set__('fs', {
      stat: function(filepath, cb) {
        if (path.normalize(filepath) === path.normalize('DIRECTORY/a')) {
          cb(new Error('BAD_THINGS_HAPPEND'));
        } else {
          fs.stat(filepath, cb);
        }
      },
    });

    mkdirp.sync('TARGET');
    fs.writeFileSync('TARGET/a', '');
    mkdirp.sync('DIRECTORY');
    fs.writeFileSync('DIRECTORY/a', '');

    sut('TARGET/a', 'DIRECTORY', {force: true}, function(err) {
      if (err) {
        if (/BAD_THINGS_HAPPEND/.test(err)) {
          return done();
        }
        assert.ifError(err);
      }
      assert.fail(err, err, 'missing Error');
    });
  });

  it('should handle DIRECTORY Errors caused by race condition', function(done) {
    var sut = rewire('../');

    sut.__set__('fs', {
      stat: function(filepath, cb) {
        var err;
        if (path.normalize(filepath) === path.normalize('DIRECTORY/a')) {
          err = new Error('BAD_THINGS_HAPPEND');
          err.code = 'ENOENT';
          cb(err);
        } else {
          fs.stat(filepath, cb);
        }
      },
    });

    mkdirp.sync('TARGET');
    fs.writeFileSync('TARGET/a', '');
    mkdirp.sync('DIRECTORY');
    fs.writeFileSync('DIRECTORY/a', '');

    sut('TARGET/a', 'DIRECTORY', {force: true}, function(err) {
      assert.ifError(err);
      done();
    });
  });
});
