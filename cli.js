#!/usr/bin/env node
'use strict';

var lnk = require('./');
var link = require('./link');
var path = require('path');
var EOL = require('os').EOL;
var packageJson = require('./package.json');
var npmlog = require('npmlog');
var objectAssign = require('object-assign');
var yargs = require('yargs')
  .usage([
    'Create links between files.',
    '',
    'Usage: $0 [OPTION]... TARGET... DIRECTORY',
    '',
    'By default, $0 tries to create hard links, if this fails for a ' +
    'TARGET because it is a directory $0 tries to create a directory ' +
    'junction (symbolic link on modern OSs) for this TARGET.',
  ].join(EOL))
  // force
  .boolean('f')
  .alias({'f': ['force']})
  .describe('f', 'Overwrite existing files')
  // hard
  .boolean('h')
  .alias({'h': ['hard']})
  .describe('h', 'Create hard links instead of default behavior')
  // symbolic
  .boolean('s')
  .alias({'s': ['symbolic']})
  .describe('s', 'Create symbolic links instead of default behavior')
  // junction
  .boolean('j')
  .alias({'j': ['junction']})
  .describe('j', 'Create directory junctions ' +
    '(symbolic links on modern OSs) instead of default behavior')
  // dir
  .boolean('d')
  .alias({'d': ['directory']})
  .describe('d', 'Create directory symbolic links ' +
    '(symbolic links on modern OSs) instead of default behavior')
  // parents
  .boolean('p')
  .alias({'p': ['parents']})
  .describe('p', 'Use full source file name under DIRECTORY')
  //verbose
  .count('v')
  .alias('v', 'verbose')
  .describe('v', 'Explain what is being done')
  // version
  .version(packageJson.version, 'version', 'Display version information')
  // help
  .help('help')
  // epilog
  .epilog([
    'Report lnk bugs to <' + packageJson.bugs.url + '>',
    'lnk home page: <' + packageJson.homepage + '>',
  ].join(EOL))
  .strict();

function parseArgv(argv) {
  var err = null;
  var args = yargs.fail(function yargsFail(message) {
    err = new Error(message);
    err.name = 'ArgsError';
  }).parse(argv);
  var result;
  var type;

  // set defaults
  args = objectAssign({
    _: [],
    $0: path.relative(process.cwd(), __filename),
    verbose: 0,
  }, args);

  // link type
  link.getTypes().forEach(function(key) {
    if (args[key]) {
      if (type && !err) {
        err = new Error('cannot combine --' + type + ' and --' + key);
        err.name = 'ArgsError';
      }
      type = key;
    }
    delete args[key];
  });

  // result
  result = err || {};
  result.$0 = args.$0;
  result.opts = args;

  // verbose
  args.verbose = 2 - Math.max(2 - args.verbose, 0); // 0 <= verbose <= 2
  npmlog.level = ['info', 'verbose', 'silly'][args.verbose];
  result.opts.log = npmlog.log.bind(npmlog);

  if (args._.length > 0) {
    result.targets = args._.slice(0, -1);
  }

  if (args._.length > 1) {
    result.directory = args._.slice(-1)[0];
  }

  result.opts.type = type ? type : 'default';

  // remove non-opts
  Object.keys(result.opts).filter(function nonOpts(opt) {
    switch (opt) {
      case '$0':
      case 'verbose':
        return true;
      default:
        return opt.length === 1;
    }
  }).forEach(function deleteFlag(flag) {
    delete result.opts[flag];
  });

  return result;
}

function main(argv, exit) {

  function errorHandler(err) {
    if (err) {
      if (npmlog.level === 'silly') {
        npmlog.log('error', 'lnk', err);
      } else {
        npmlog.log('error', 'lnk', err.message);
      }
      // override log level
      npmlog.level = 'info';
      npmlog.log('info', 'lnk', 'Try `' + argv.$0 + ' --help` for ' +
        'more information');
      npmlog.log('verbose', 'lnk@' + packageJson.version, __filename);
      exit(1);
      return;
    }
    exit(0);
  }

  argv = parseArgv(argv);
  if (argv instanceof Error) {
    errorHandler(argv);
    return;
  }

  npmlog.log('silly', 'lnk', 'argv: %j', argv);

  try {
    lnk(argv.targets, argv.directory, argv.opts, errorHandler);
  } catch (err) {
    errorHandler(err);
  }
}

module.exports = main;

/* istanbul ignore if: coverd by test/cli.js (spawn) */
if (require.main === module) {
  main(process.argv.slice(2), process.exit.bind(process));
}
