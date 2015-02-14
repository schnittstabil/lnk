/* eslint-env mocha */
/* eslint no-underscore-dangle: 0 */
'use strict';
var assert = require('assert');
var join = require('path').join;
var uuid = require('uuid');
var rewire = require('rewire');

var hooks = require('./utils/hooks');

var lnk = require('../');
var link = require('../link');

describe('link', function() {

  beforeEach(new hooks.tempCwd.BeforeEach(__filename));
  afterEach(new hooks.tempCwd.AfterEach(__filename));
  after(new hooks.tempCwd.After(__filename));

  it('getTypes should include `default`', function() {
    assert(link.getTypes().indexOf('default') > -1);
  });

  [
    'get',
    'getSync',
    'getTypes',
  ].forEach(function(key) {
    it('.' + key + ' should be a function', function() {
      assert.strictEqual(typeof link[key], 'function');
    });

    it('getTypes should not include `' + key + '`', function() {
      assert(link.getTypes().indexOf(key) === -1);
    });
  });

  it('should be extensible', function(done) {
    var type = uuid.v1();

    link[type] = function(target, linkPath, cb) {
      assert.strictEqual(target, 'TARGET');
      assert.strictEqual(linkPath, join('DIRECTORY', 'TARGET'));
      cb();
    };

    lnk('TARGET', 'DIRECTORY', {type: type}, done);
  });

  describe('.junction', function() {
    it('should symlink relative on modern OSs', function(done) {
      var symLinked = false;
      var sut = rewire('../link');

      sut.__set__('isWin', false);
      sut.__set__('fs', {
        symlink: function(target, path, type, cb) {
          symLinked = true;
          assert.strictEqual(target, join('..', 'TARGET', 'a'));
          cb();
        }
      });
      sut.junction('TARGET/a', 'DIRECTORY/a', function(err) {
        assert.ifError(err);
        assert.ok(symLinked);
        done();
      });
    });

    it('should create directory junction on Windows', function(done) {
      var linked = false;
      var sut = rewire('../link');

      sut.__set__('isWin', true);
      sut.__set__('fs', {
        symlink: function(target, path, type, cb) {
          linked = true;
          assert.strictEqual(type, 'junction');
          cb();
        }
      });
      sut.junction('TARGET/a', 'DIRECTORY/a', function(err) {
        assert.ifError(err);
        assert.ok(linked);
        done();
      });
    });
  });

  describe('sync', function() {
    it('should be extensible (globally)', function() {
      var type = uuid.v1();

      link[type + 'Sync'] = function(target, linkPath) {
        assert.strictEqual(target, 'TARGET');
        assert.strictEqual(linkPath, join('DIRECTORY', 'TARGET'));
      };

      lnk.sync('TARGET', 'DIRECTORY', {type: type});
    });

    describe('.junction', function() {
      it('should symlink relative on modern OSs', function() {
        var symLinked = false;
        var sut = rewire('../link');

        sut.__set__('isWin', false);
        sut.__set__('fs', {
          symlinkSync: function(target, path, type) {
            symLinked = true;
            assert.strictEqual(type, 'junction');
            assert.strictEqual(target, join('..', 'TARGET', 'a'));
          }
        });
        sut.junctionSync('TARGET/a', 'DIRECTORY/a');
        assert.ok(symLinked);
      });

      it('should create directory junction on Windows', function() {
        var linked = false;
        var sut = rewire('../link');

        sut.__set__('isWin', true);
        sut.__set__('fs', {
          symlinkSync: function(target, path, type) {
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
