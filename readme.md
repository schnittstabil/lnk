# lnk [![Build Status](https://travis-ci.org/schnittstabil/lnk.svg?branch=master)](https://travis-ci.org/schnittstabil/lnk) [![Build status](https://ci.appveyor.com/api/projects/status/ga62hvxd522ul7bs?svg=true)](https://ci.appveyor.com/project/schnittstabil/lnk) [![Coverage Status](https://coveralls.io/repos/schnittstabil/lnk/badge.svg?branch=master)](https://coveralls.io/r/schnittstabil/lnk?branch=master) [![XO code style](https://img.shields.io/badge/code_style-XO-5ed9c7.svg)](https://github.com/sindresorhus/xo)

> Create links between files cross-platform

## Why

* Promise interface
* Create _hard links_, _directory junctions_ and _symbolic links_ depending on the platform

## Install

```sh
$ npm install lnk --save
```

## Usage

```
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
const lnk = require('lnk');

lnk(['assets/favicon.ico', 'assets/style'], 'dist')
	.then(() => console.log('done'));
```

```
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


## Glob support

`lnk` don't support globbing by itself, `lnk` supports arrays of targets and Promises which resolve to these though:

```js
const lnk = require('lnk');
const globby = require('globby');  // npm install globby

lnk(globby('assets/*'), 'dist')
	.then(() => console.log('done'));
```


## API

`lnk` provides a cross-platform convenience wrapper for the [`fs.link`](https://nodejs.org/api/fs.html#fs_fs_link_existingpath_newpath_callback) and [`fs.symlink`](https://nodejs.org/api/fs.html#fs_fs_symlink_target_path_type_callback) functions.

### lnk(targets, directory, [opts])

Returns a `Promise`.

### lnk.sync (targets, directory, [opts])

Synchronous version of `lnk`.

#### targets
Type: `string|string[]`

Targets of the links. `lnk()` additionally supports `Promise<string|string[]>`.

#### directory
Type: `string`

Destination directory.

#### opts
Type: `object`

##### cwd
Type: `string`<br>
Default: `process.cwd()`

The current working directory for `targets` and `directory`.

##### force
Type: `boolean`<br>
Default: `false`

Overwrite existing files.

##### type
Type: `string`<br>
Values: `'default'`, `'hard'`, `'symbolic'`, `'junction'` or `'directory'`<br>
Default: `'default'`

By `'default'`, `lnk` tries to create hard links, if this fails for a target because
it is a directory `lnk` tries to create a directory junction (symbolic link on
modern OSs) for this target.

##### parents
Type: `boolean`<br>
Default: `false`

Use full source file name under `directory`.

```js
// w/o parents:
lnk('assets/style/foo.css', 'dist/assets/style', ...);

// w/ parents:
lnk('assets/style/foo.css', 'dist', {parents: true}, ...);
```

##### rename
Type: `string|object|function(object):(string|object)`

Filepath or function mapping a [_path object_](https://nodejs.org/api/path.html#path_path_parse_path) to a filename or _path object_; used to modify the path of the link before creating.


###### Basic Example

```
$ tree
.
└── assets
    ├── favicon.ICO
    └── style
        ├── app.css
        └── vendor.css
```

```js
const path = require('path');

Promise.all([
	lnk('assets/style', 'dist', {rename: 'css'}),
	lnk('assets/favicon.ICO', 'dist', {rename: pathOfLink => pathOfLink.base.toLowerCase()})
]).then(() => console.log('done'));
```

```
$ tree
.
├── assets
│   ├── favicon.ICO
│   └── style
│       ├── app.css
│       └── vendor.css
└── dist
    ├── css -> ../assets/style // symlink; directory junction on windows
    └── favicon.ico            // hard link to assets/favicon.ICO
```

###### Sophisticated Example

```
$ tree
.
└── assets
    ├── favicon.ico
    └── style
        ├── app.css
        └── vendor.css
```

```js
const rename = pathOfLink => Object.assign(pathOfLink, {
	dir: path.join(pathOfLink.dir, '42'),
	base: `prefix-${pathOfLink.name}` + pathOfLink.ext.toLowerCase()
});

lnk(['assets/favicon.ico', 'assets/style'], 'dist', {rename})
	.then(() => console.log('done'));
```

```
$ tree
.
├── assets
│   ├── favicon.ico
│   └── style
│       ├── app.css
│       └── vendor.css
└── dist
    └── 42
        ├── prefix-favicon.ico                 // hard link to assets/favicon.ico
        └── prefix-style -> ../../assets/style // symlink; directory junction on windows
```

##### log
Type: `function`<br>
Default: `(level, prefix, message) => {}`

A logger function, you may want to use `console.log` or `npmlog.log`, see [npmlog documentation](https://github.com/npm/npmlog) for details.

## Related

* [lnk-cli](https://github.com/schnittstabil/lnk-cli) – CLI version of this project
* [globby](https://github.com/sindresorhus/globby) – if you need `glob` support for multiple patterns
* [cpy](https://github.com/sindresorhus/cpy) – if you need to copy multiple files
* [del](https://github.com/sindresorhus/del) – if you need to delete files and folders


## License

MIT © [Michael Mayer](http://schnittstabil.de)
