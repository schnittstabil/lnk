# lnk [![Build Status](https://travis-ci.org/schnittstabil/lnk.svg?branch=master)](https://travis-ci.org/schnittstabil/lnk) [![Coverage Status](https://coveralls.io/repos/schnittstabil/lnk/badge.svg?branch=master)](https://coveralls.io/r/schnittstabil/lnk?branch=master) [![XO code style](https://img.shields.io/badge/code_style-XO-5ed9c7.svg)](https://github.com/sindresorhus/xo)

> Create links between files.

## Install

```sh
# CLI
$ [sudo] npm install lnk --global

# API
$ npm install lnk --save
```

## Usage

```sh
$ tree
.
└── assets
    ├── favicon.ico
    └── style
        ├── app.css
        └── vendor.css

2 directories, 3 files
```

```sh
$ lnk assets/* dist
```
or:
```js
var lnk = require('lnk');
var globby = require('globby'); // npm install globby --save

globby('assets/*')
  .then(assets => lnk(assets, 'dist'))
  .then(() => console.log('done'));
```

```sh
$ tree
.
├── assets
│   ├── favicon.ico
│   └── style
│       ├── app.css
│       └── vendor.css
└── dist
    ├── favicon.ico              // hard link to assets/favicon.ico
    └── style -> ../assets/style // soft link; directory junction on windows

4 directories, 4 files
```

## CLI

```
$ lnk --help

  Create links between files

  Usage: lnk [OPTION]... TARGET... DIRECTORY

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

  Report lnk bugs to https://github.com/schnittstabil/lnk/issues
  lnk home page: https://github.com/schnittstabil/lnk
```

## Npm Scripts

For platform independent glob support use [globstar](https://github.com/schnittstabil/globstar):

```sh
$ npm install globstar --save-dev
```

Please note that Windows needs double quotes:

```json
  "scripts": {
    "link-assets": "globstar --node -- lnk \"assets/*\" dist",
  },
```

Link your `assets/*` files:

```sh
$ npm run link-assets
```

## API

`lnk` provides a convenience wrapper for the fs link and symlink functions.

### lnk(targets, directory, [opts])

Returns a `Promise`.

### lnk.sync (targets, directory, [opts])

Synchronous version of `lnk`.

#### targets
Type: `string` or `array` of `string`s

Targets of the links.

#### directory
Type: `string`

Destination directory.

#### opts
Type: `object`

##### cwd
Type: `string`

Default: `process.cwd()`

The current working directory for `targets` and `directory`.

##### force
Type: `boolean`

Default: `false`

Overwrite existing files.

##### type
Type: `string`

Values: `'default'`, `'hard'`, `'symbolic'`, `'junction'` or `'directory'`

Default: `'default'`

By default, `lnk` tries to create hard links, if this fails for a target because
it is a directory `lnk` tries to create a directory junction (symbolic link on
modern OSs) for this target.

##### parents
Type: `boolean`

Default: `false`

Use full source file name under `directory`.

```js
// w/o parents:
lnk('assets/style/*.css', 'dist/assets/style', ...);

// w/ parents:
lnk('assets/style/*.css', 'dist', {parents: true}, ...);
```

##### log
Type: `function`

Default: `(level, prefix, message) => {}`

A logger function, you may want to use `console.log` or `npmlog.log`, see [npmlog documentation](https://github.com/npm/npmlog) for details.


## Related

* [cpy](https://github.com/sindresorhus/cpy) if you need to copy multiple files
* [del](https://github.com/sindresorhus/del) if you need to delete files and folders

## License

MIT © [Michael Mayer](http://schnittstabil.de)
