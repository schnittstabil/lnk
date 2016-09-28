#!/usr/bin/env node
'use strict';
const meow = require('meow');
var npmlog = require('npmlog');

const packageJson = require('./package.json');
const lnk = require('./');

const help = `Usage: lnk [OPTION]... TARGET... DIRECTORY

By default, lnk tries to create hard links, if this fails for a TARGET
because it is a directory lnk tries to create a directory junction
(symbolic link on modern OSs) for this TARGET.

Options:
    -f, --force      Overwrite existing files
    -h, --hard       Create hard links instead of default behavior
    -s, --symbolic   Create symbolic links instead of default behavior
    -j, --junction   Create directory junctions (symbolic links on
                     modern OSs) instead of default behavior
    -d, --directory  Create directory symbolic links (symbolic links on
                     modern OSs) instead of default behavior
    -p, --parents    Use full source file name under DIRECTORY
    --debug          Turn on debug output
    -v, --verbose    Explain what is being done
    --version        Display version information
    --help           Show help

Report lnk bugs to ${packageJson.bugs.url}
lnk home page: ${packageJson.homepage}
`;

const options = ['f', 'force', 'h', 'hard', 's', 'symbolic', 'j', 'junction', 'd', 'directory', 'p', 'parents', 'debug', 'v', 'verbose', 'version', 'help'];

const scanArgv = argv => meow({
	argv,
	help
}, {
	alias: {
		f: 'force',
		h: 'hard',
		s: 'symbolic',
		j: 'junction',
		d: 'directory',
		p: 'parents',
		v: 'verbose'
	},
	boolean: [
		'force',
		'hard',
		'symbolic',
		'junction',
		'directory',
		'parents',
		'debug',
		'verbose'
	]
});

const parseLinkType = flags => {
	const types = lnk.getTypes().filter(t => flags[t]);

	switch (types.length) {
		case 0:
			return 'default';
		case 1:
			return types[0];
		default:
			throw new Error('cannot combine --' + types[0] + ' and --' + types[1]);
	}
};

const parseLogger = flags => {
	npmlog.level = 'info';
	if (flags.debug) {
		npmlog.level = 'silly';
	}	else if (flags.verbose) {
		npmlog.level = 'verbose';
	}

	return npmlog.log.bind(npmlog);
};

const parseFlags = flags => {
	Object.keys(flags).forEach(flag => {
		if (options.indexOf(flag) === -1) {
			throw new Error(`Unknown argument: --${flag}`);
		}
	});

	const opts = flags;
	opts.type = parseLinkType(flags);
	opts.log = parseLogger(flags);

	return {opts};
};

const parseInput = input => {
	const inputLen = input.length;

	return {
		directory: inputLen > 1 ? input.slice(-1)[0] : undefined,
		targets: inputLen > 0 ? input.slice(0, -1) : undefined
	};
};

const parseArgv = argv => {
	const cli = scanArgv(argv);

	return Object.assign(parseFlags(cli.flags), parseInput(cli.input));
};

const main = argv => Promise.resolve(argv)
	.then(argv => {
		npmlog.log('silly', 'lnk', 'argv: %j', argv);
		const cmd = parseArgv(argv);
		npmlog.log('silly', 'lnk', 'cmd: %j', cmd);

		return lnk(cmd.targets, cmd.directory, cmd.opts);
	})
	.catch(err => {
		if (npmlog.level === 'silly') {
			npmlog.log('error', 'lnk', err);
		} else {
			npmlog.log('error', 'lnk', err.message);
		}

		// force info
		const logLevel = npmlog.level;
		npmlog.level = 'info';
		npmlog.log('info', 'lnk', 'Try `lnk --help` for more information');
		npmlog.level = logLevel;

		npmlog.log('verbose', 'lnk', `lnk@${packageJson.version}`, __filename);

		throw err;
	})
	.then(() => 0, () => 1);

module.exports = main;

if (require.main === module) {
	main(process.argv.slice(2)).then(status => process.exit(status));
}
