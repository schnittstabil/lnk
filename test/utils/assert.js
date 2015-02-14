'use strict';
var assert = require('assert');
var fs = require('fs');

exports.assertIdenticalFile = function(actual, expected, msg) {
  var actualStats = fs.lstatSync(actual);
  var expectedStats = fs.lstatSync(expected);
  assert.strictEqual(actualStats.dev, expectedStats.dev, msg);
  assert.strictEqual(actualStats.ino, expectedStats.ino, msg);
};

exports.assertEqualFilePath = function(actual, expected, msg) {
  assert.strictEqual(fs.realpathSync(actual), fs.realpathSync(expected), msg);
};
