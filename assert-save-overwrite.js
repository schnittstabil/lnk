'use strict';
var fs = require('fs');
const pify = require('pify');

var fsStatP = pify(fs.stat);

const assertSaveOverwrite = (target, linkPath) => Promise
	.all([fsStatP(target), fsStatP(linkPath)])
	.then(stats => {
		const targetStat = stats[0];
		const linkStat = stats[1];

		if (targetStat.ino === linkStat.ino && targetStat.dev === linkStat.dev) {
			throw new Error(`${target} and ${linkPath} are the same`);
		}
	})
	.catch(err => {
		if (err.code === 'ENOENT' || err.code === 'ELOOP') {
			// target and linkPath cannot be same file
			return;
		}

		throw err;
	});

const assertSaveOverwriteSync = (target, linkPath) => {
	try {
		const targetStat = fs.statSync(target);
		const linkStat = fs.statSync(linkPath);

		if (targetStat.ino === linkStat.ino && targetStat.dev === linkStat.dev) {
			throw new Error(`${target} and ${linkPath} are the same`);
		}
	} catch (err) {
		if (err.code === 'ENOENT' || err.code === 'ELOOP') {
			// target and linkPath cannot be same file
			return;
		}

		throw err;
	}
};

module.exports = assertSaveOverwrite;
module.exports.sync = assertSaveOverwriteSync;
