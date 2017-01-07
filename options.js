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

		const rename = this.rename;
		const linkDir = path.resolve(directory, this.parents ? path.dirname(target) : '');
		const linkName = path.basename(target);
		const pathOfLink = path.join(linkDir, linkName);

		if (rename === undefined) {
			return pathOfLink;
		}

		const renamed = typeof rename === 'function' ? rename(path.parse(pathOfLink)) : rename;

		if (typeof renamed === 'object') {
			return path.resolve(path.format(renamed));
		}

		return path.isAbsolute(renamed) ? renamed : path.join(linkDir, renamed);
	}
}

module.exports = Options;
