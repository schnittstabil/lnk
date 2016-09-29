/* eslint ava/no-identical-title: off */
import {join} from 'path';
import test from 'ava';

import rewire from 'rewire';
import uuid from 'uuid';

import lnk from '../';
import link from '../link';
import {before, beforeEach, after} from './helpers/hooks';

test.before(before(__filename));
test.beforeEach(beforeEach(__filename));
test.after(after(__filename));

const isFunction = (t, value) => {
	t.is(typeof value, 'function');
};
isFunction.title = (_, value) => `.${value} should be a function`;

const includes = (t, array, searchElement) => {
	t.not(array.indexOf(searchElement), -1);
};
includes.title = (providedTitle, _, searchElement) => `${providedTitle} should include ${searchElement}`;

const notIncludes = (t, array, searchElement) => {
	t.is(array.indexOf(searchElement), -1);
};
notIncludes.title = (providedTitle, _, searchElement) => `${providedTitle} should include ${searchElement}`;

test.serial(isFunction, link.get);
test.serial(isFunction, link.getSync);
test.serial(isFunction, link.getTypes);

test.serial('getTypes()', includes, link.getTypes(), 'default');

test.serial('getTypes()', notIncludes, link.getTypes(), 'get');
test.serial('getTypes()', notIncludes, link.getTypes(), 'getSync');
test.serial('getTypes()', notIncludes, link.getTypes(), 'getTypes');

test.serial('should be extensible', async t => {
	const type = uuid.v1();

	link[type] = (target, linkPath) => new Promise(resolve => {
		t.is(target, 'TARGET');
		t.is(linkPath, join('DIRECTORY', 'TARGET'));
		resolve();
	});

	await lnk('TARGET', 'DIRECTORY', {type: type});
});

test.serial('.junction should symlink relative on modern OSs', async t => {
	let symLinked = false;
	const sut = rewire('../link');

	sut.__set__('fs', {
		symlink: (target, path, type, cb) => {
			symLinked = true;
			t.is(target, join('..', 'TARGET', 'a'));
			cb();
		}
	});

	await sut
		.junction('TARGET/a', 'DIRECTORY/a')
		.then(() => t.true(symLinked));
});

test.serial('.junction should create directory junction on Windows', async t => {
	let linked = false;
	const sut = rewire('../link');

	sut.__set__('fs', {
		symlink: (target, path, type, cb) => {
			linked = true;
			t.is(type, 'junction');
			cb();
		}
	});

	await sut
		.junction('TARGET/a', 'DIRECTORY/a')
		.then(() => t.true(linked));
});

test.serial('sync should be extensible (globally)', t => {
	const type = uuid.v1();

	link[type + 'Sync'] = (target, linkPath) => {
		t.is(target, 'TARGET');
		t.is(linkPath, join('DIRECTORY', 'TARGET'));
	};

	lnk.sync('TARGET', 'DIRECTORY', {type: type});
});

test.serial('sync.junction should symlink relative on modern OSs', t => {
	let symLinked = false;
	const sut = rewire('../link');

	sut.__set__('fs', {
		symlinkSync: (target, path, type) => {
			symLinked = true;
			t.is(type, 'junction');
			t.is(target, join('..', 'TARGET', 'a'));
		}
	});
	sut.junctionSync('TARGET/a', 'DIRECTORY/a');
	t.true(symLinked);
});

test.serial('sync.junction should create directory junction on Windows', t => {
	let linked = false;
	const sut = rewire('../link');

	sut.__set__('fs', {
		symlinkSync: (target, path, type) => {
			linked = true;
			t.is(type, 'junction');
		}
	});
	sut.junctionSync('TARGET/a', 'DIRECTORY/a');
	t.true(linked);
});
