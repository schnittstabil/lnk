'use strict';

const assert = require('assert');
const fs = require('fs');

exports.assertIdenticalFile = (actual, expected, msg) => {
	const actualStats = fs.lstatSync(actual);
	const expectedStats = fs.lstatSync(expected);
	assert.strictEqual(actualStats.dev, expectedStats.dev, msg);
	assert.strictEqual(actualStats.ino, expectedStats.ino, msg);
};

exports.assertEqualFilePath = (actual, expected, msg) => {
	assert.strictEqual(fs.realpathSync(actual), fs.realpathSync(expected), msg);
};
