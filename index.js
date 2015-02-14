'use strict';
var path = require('path');
var fs = require('fs');
var rimraf = require('rimraf');
var mkdirp = require('mkdirp');
var assign = require('object-assign');
var forEach = require('each-async');
var series = require('array-series');
var pathIsAbsolute = require('path-is-absolute');

var link = require('./link');

var defaults = {
  cwd: undefined,
  type: 'default', // 'hard', 'symbolic', 'dir', 'junction' or 'default'
  parents: false,
  force: false,
  log: function noop() {},
};

function preprocessTarget(target, opts) {
  // NB symlinks: do not use path.resolve here
  if (!pathIsAbsolute(target) && opts.cwd) {
    target = path.join(opts.cwd, target);
  }
  return target;
}

function generateLinkPath(target, directory, opts) {
  var basename = path.basename(target);
  var dirname = path.dirname(target);

  if (opts.cwd) {
    directory = path.resolve(opts.cwd, directory);
  }

  if (opts.parents) {
    return path.join(directory, dirname, basename);
  } else {
    return path.join(directory, basename);
  }
}

function assertSaveOverwrite(target, directory, cb) {
  fs.stat(target, function targetStatCb(targetErr, targetStat) {
    if (targetErr) {
      if (targetErr.code === 'ENOENT' || targetErr.code === 'ELOOP') {
        // target and directory cannot be same file
        return cb();
      }
      return cb(targetErr);
    }
    fs.stat(directory, function directoryStatCb(dirErr, linkStat) {
      if (dirErr) {
        if (dirErr.code === 'ENOENT' || dirErr.code === 'ELOOP') {
          return cb();
        }
        return cb(dirErr);
      }
      if (targetStat.ino === linkStat.ino &&
        targetStat.dev === linkStat.dev) {
        cb(new Error('`' + target + '` and `' + directory + '` are the same'));
      } else {
        cb();
      }
    });
  });
}

function assertSaveOverwriteSync(target, directory) {
  var targetStat;
  var linkStat;
  try {
    targetStat = fs.statSync(target);
  } catch (err) {
    if (err.code === 'ENOENT' || err.code === 'ELOOP') {
      // target and directory cannot be same file
      return;
    }
    throw err;
  }
  try {
    linkStat = fs.statSync(directory);
  } catch (err) {
    if (err.code === 'ENOENT' || err.code === 'ELOOP') {
      return;
    }
    throw err;
  }
  if (targetStat.ino === linkStat.ino &&
    targetStat.dev === linkStat.dev) {
    throw new Error('`' + target + '` and `' + directory + '` are the same');
  }
}

function assertArgument(arg, argName) {
  if (!arg) {
    throw new Error(argName + ' required');
  }
}

module.exports = function lnk(targets, directory, opts, cb) {
  var linkFn;
  if (typeof opts === 'function') {
    cb = opts;
    opts = {};
  }

  assertArgument(targets, 'targets');
  assertArgument(directory, 'directory');
  assertArgument(cb, 'cb');

  targets = Array.isArray(targets) ? targets : [targets];
  opts = assign({}, defaults, opts);
  linkFn = link.get(opts.type);

  function logLnk(level, linkPath, targetPath, done) {
    opts.log(level, 'lnk', '%j => %j', linkPath, targetPath);
    done();
  }

  function linkTarget(target, i, done) {
    var targetPath = preprocessTarget(target, opts);
    var linkPath = generateLinkPath(target, directory, opts);

    series([
      mkdirp.bind(mkdirp, path.dirname(linkPath)),
      logLnk.bind(null, 'verbose', linkPath, targetPath),
      function(next) {
        linkFn(targetPath, linkPath, function(err) {
          if (err && err.code === 'EEXIST' && opts.force) {
            opts.log('silly', 'lnk', 'try to rm -rf %s', linkPath);
            series([
              assertSaveOverwrite.bind(null, targetPath, linkPath),
              rimraf.bind(rimraf, linkPath),
              logLnk.bind(null, 'silly', linkPath, targetPath),
              linkFn.bind(linkFn, targetPath, linkPath),
            ], next);
          } else {
            next(err);
          }
        });
      },
    ], done);
  }

  logLnk('silly', targets, directory, function() {});
  forEach(targets, linkTarget, cb);
};

module.exports.sync = function lnkSync(targets, directory, opts) {
  var linkFn;

  assertArgument(targets, 'targets');
  assertArgument(directory, 'directory');

  targets = Array.isArray(targets) ? targets : [targets];
  opts = assign({}, defaults, opts);
  linkFn = link.getSync(opts.type);

  function linkTarget(target) {
    var targetPath = preprocessTarget(target, opts);
    var linkPath = generateLinkPath(target, directory, opts);

    mkdirp.sync(path.dirname(linkPath));
    try {
      opts.log('verbose', 'lnk', '%j => %j', linkPath, targetPath);
      linkFn(targetPath, linkPath);
    } catch (err) {
      if (err.code === 'EEXIST' && opts.force) {
        opts.log('silly', 'lnk', 'try to rm -rf %s', linkPath);
        assertSaveOverwriteSync(targetPath, linkPath);
        rimraf.sync(linkPath);
        opts.log('silly', 'lnk', '%j => %j', linkPath, targetPath);
        linkFn(targetPath, linkPath);
      } else {
        throw err;
      }
    }
  }

  opts.log('silly', 'lnk', '%j => %j', targets, directory);
  targets.forEach(linkTarget);
};
