'use strict';
const path = require('path');

const defaults = {
	cwd: undefined,
	type: 'default', // 'hard', 'symbolic', 'dir', 'junction' or 'default'
	parents: false,
	force: false,
	log: () => {}
};

class Options {
	constructor(opts) {
		Object.assign(this, defaults, opts);
	}

	preprocessTarget(target) {
		// NB symlinks: do not use path.resolve here
		if (this.cwd && !path.isAbsolute(target)) {
			target = path.join(this.cwd, target);
		}
		return target;
	}

	generatePathOfLink(target, directory) {
		if (this.cwd) {
			directory = path.resolve(this.cwd, directory);
		}

		const linkDir = path.join(directory, this.parents ? path.dirname(target) : '');
		const linkName = path.basename(target);

		return path.join(linkDir, linkName);
	}
}

module.exports = Options;
