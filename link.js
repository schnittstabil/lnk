'use strict';
var isWin = process.platform === 'win32';
var fs = require('fs');
var pathLib = require('path');

function relative(from, to) {
  return pathLib.relative(pathLib.dirname(from), pathLib.resolve(to));
}

exports.hard = function(target, path, cb) {
  fs.link(target, path, cb);
};

exports.hardSync = function(target, path) {
  return fs.linkSync(target, path);
};

exports.symbolic = function(target, path, cb) {
  target = relative(path, target);
  fs.symlink(target, path, cb);
};

exports.symbolicSync = function(target, path) {
  target = relative(path, target);
  return fs.symlinkSync(target, path);
};

exports.directory = function(target, path, cb) {
  target = relative(path, target);
  fs.symlink(target, path, 'dir', cb);
};

exports.directorySync = function(target, path) {
  target = relative(path, target);
  return fs.symlinkSync(target, path, 'dir');
};

exports.junction = function(target, path, cb) {
  // junction paths are always absolute
  if (!isWin) {
    target = relative(path, target);
  }
  fs.symlink(target, path, 'junction', cb);
};

exports.junctionSync = function(target, path) {
  // junction paths are always absolute
  if (!isWin) {
    target = relative(path, target);
  }
  return fs.symlinkSync(target, path, 'junction');
};

exports.default = function(target, path, cb) {
  exports.hard(target, path, function(err) {
    if (!err || err.code !== 'EPERM') {
      return cb(err);
    }
    exports.junction(target, path, cb);
  });
};

exports.defaultSync = function(target, path) {
  try {
    return exports.hardSync(target, path);
  } catch (err) {
    if (err.code === 'EPERM') {
      return exports.junctionSync(target, path);
    }
    throw err;
  }
};

Object.defineProperty(exports, 'get', {
  value: function(type) {
    var linkFn = exports[type];

    if (linkFn) {
      return linkFn.bind(exports);
    }

    throw new Error('unknown link type: `' + type + '`');
  },
});

Object.defineProperty(exports, 'getSync', {
  value: function(type) {
    return exports.get(type + 'Sync');
  },
});

Object.defineProperty(exports, 'getTypes', {
  value: function() {
    var suffix = 'Sync';
    var types = [];
    var name;

    for (name in exports) {
      if (typeof exports[name] === 'function' &&
          name.slice(-suffix.length) !== suffix) {

        types.push(name);
      }
    }
    return types;
  },
});
