/* eslint-env mocha */
/* eslint no-underscore-dangle: 0 */
'use strict';
var spawn = require('child_process').spawn;
var assert = require('assert');
var fs = require('fs');
var path = require('path');
var mkdirp = require('mkdirp');
var rewire = require('rewire');

var CLI = path.join(__dirname, '..', 'cli.js');

var assertUtils = require('./utils/assert');
var assertIdenticalFile = assertUtils.assertIdenticalFile;
var assertEqualFilePath = assertUtils.assertEqualFilePath;
var hooks = require('./utils/hooks');

describe('cli', function() {
  var logs;
  var cli;

  this.timeout(5000);

  beforeEach(function(done) {
    logs = [];

    cli = rewire('../cli');
    cli.__set__('npmlog', {
      log: function() {
        logs.push(arguments);
      },
    });

    (new hooks.tempCwd.BeforeEach(__filename)).call(this, done);
  });

  afterEach(new hooks.tempCwd.AfterEach(__filename));

  after(new hooks.tempCwd.After(__filename));

  it('should error a message on missing TARGETS', function(done) {
    cli([], function(status) {
      var found = false;
      logs.forEach(function(entry) {
        var level = entry[0];
        var msg = entry[2];
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

  it('should error a message on missing DIRECTORY', function(done) {
    cli(['target'], function(status) {
      var found = false;
      logs.forEach(function(entry) {
        var level = entry[0];
        var msg = entry[2];
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

  it('should error a message on unknown option', function(done) {
    cli(['--symbolix', 'TARGET', 'DEST'], function(status) {
      var found = false;
      logs.forEach(function(entry) {
        var level = entry[0];
        var msg = entry[2];
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
    function(done) {
      var err = '';
      var sut = spawn('node', [CLI]); // missing TARGET Error
      sut.stderr.setEncoding('utf8');
      sut.stderr.on('data', function(data) {
        err += data;
      });
      sut.on('close', function(status) {
        assert.ok(status !== 0, 'unexpected exit status: ' + status);
        assert.notStrictEqual(err, '', err);
        done();
      });
    }
  );

  it('should error a message on --symbolic with --hard', function(done) {
    cli(['--symbolic', '--hard', 'TARGET', 'DEST'], function(status) {
      var found = false;
      logs.forEach(function(entry) {
        var level = entry[0];
        var msg = entry[2];
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

  it('should link a file', function(done) {
    mkdirp.sync('DEST/');
    fs.writeFileSync('a', '');
    cli(['a', 'DEST'], function(status) {
      assert.ifError(status);
      assertIdenticalFile('DEST/a', 'a');
      done();
    });
  });

  it('should symlink a file', function(done) {
    mkdirp.sync('DEST');
    fs.writeFileSync('a', '');
    cli(['--symbolic', 'a', 'DEST'], function(status) {
      assert.ifError(status);
      assertEqualFilePath('DEST/a', 'a');
      done();
    });
  });
});
