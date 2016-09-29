# lnk [![Build Status](https://travis-ci.org/schnittstabil/lnk.svg?branch=master)](https://travis-ci.org/schnittstabil/lnk) [![Coverage Status](https://coveralls.io/repos/schnittstabil/lnk/badge.svg?branch=master)](https://coveralls.io/r/schnittstabil/lnk?branch=master) [![XO code style](https://img.shields.io/badge/code_style-XO-5ed9c7.svg)](https://github.com/sindresorhus/xo)

> Create links between files cross-platform

## Why

* Promise interface
* Create _hard links_, _directory junctions_ and _symbolic links_ depending on the platform

## Install

```sh
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

```js
var lnk = require('lnk');

Promise.all([
	lnk('assets/favicon.ico', 'dist'),
	lnk('assets/style', 'dist')
])
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
    └── style -> ../assets/style // symlink; directory junction on windows

4 directories, 4 files
```

## API

`lnk` provides a cross-platform convenience wrapper for the fs link and symlink functions.

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

By `'default'`, `lnk` tries to create hard links, if this fails for a target because
it is a directory `lnk` tries to create a directory junction (symbolic link on
modern OSs) for this target.

##### parents
Type: `boolean`

Default: `false`

Use full source file name under `directory`.

```js
// w/o parents:
lnk('assets/style/foo.css', 'dist/assets/style', ...);

// w/ parents:
lnk('assets/style/foo.css', 'dist', {parents: true}, ...);
```

##### log
Type: `function`

Default: `(level, prefix, message) => {}`

A logger function, you may want to use `console.log` or `npmlog.log`, see [npmlog documentation](https://github.com/npm/npmlog) for details.

## Glob support

`lnk` don't support globbing by itself, however `lnk` supports arrays of targets:

```js
const lnk = require('lnk');
const globby = require('globby');  // npm install globby
 
globby('assets/*')
	.then(assets => lnk(assets, 'dist'));
```


## Related

* [lnk-cli](https://github.com/schnittstabil/lnk-cli) – CLI version of this project
* [globby](https://github.com/sindresorhus/globby) – if you need `glob` support for multiple patterns
* [cpy](https://github.com/sindresorhus/cpy) – if you need to copy multiple files
* [del](https://github.com/sindresorhus/del) – if you need to delete files and folders


## License

MIT © [Michael Mayer](http://schnittstabil.de)
