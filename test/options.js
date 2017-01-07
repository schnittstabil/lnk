import {join, parse, resolve} from 'path';
import test from 'ava';

import Options from '../options';

test('should support {cwd}', t => {
	const sut = new Options({cwd: 'SRC'});

	t.is(sut.preprocessTarget('DEEP/a'), join('SRC', 'DEEP', 'a'));
	t.is(sut.generatePathOfLink('DEEP/a', '../DEST'), resolve('DEST/a'));
});

test('should support {parents}', t => {
	const sut = new Options({cwd: 'SRC', parents: true});

	t.is(sut.preprocessTarget('DEEP/a'), join('SRC', 'DEEP', 'a'));
	t.is(sut.generatePathOfLink('DEEP/a', '../DEST'), resolve('DEST/DEEP/a'));
});

test('should support absolute {rename: string}', t => {
	const sut = new Options({cwd: 'SRC', rename: resolve('b')});

	t.is(sut.generatePathOfLink('a', '.'), resolve('b'));
	t.is(sut.generatePathOfLink('DEEP/a', '..'), resolve('b'));
	t.is(sut.generatePathOfLink('DEEP/a', '../DEST'), resolve('b'));
});

test('should support basename {rename: string}', t => {
	const sut = new Options({cwd: 'SRC', rename: 'b'});

	t.is(sut.generatePathOfLink('a', '.'), resolve('SRC/b'));
	t.is(sut.generatePathOfLink('DEEP/a', '..'), resolve('b'));
	t.is(sut.generatePathOfLink('DEEP/a', '../DEST'), resolve('DEST/b'));
});

test('should support absolute {rename: function():string}', t => {
	const sut = new Options({cwd: 'SRC', rename: () => resolve('b')});

	t.is(sut.generatePathOfLink('a', '.'), resolve('b'));
	t.is(sut.generatePathOfLink('DEEP/a', '..'), resolve('b'));
	t.is(sut.generatePathOfLink('DEEP/a', '../DEST'), resolve('b'));
});

test('should support basename {rename: function():string}', t => {
	const sut = new Options({cwd: 'SRC', rename: () => 'b'});

	t.is(sut.generatePathOfLink('a', '.'), resolve('SRC/b'));
	t.is(sut.generatePathOfLink('DEEP/a', '..'), resolve('b'));
	t.is(sut.generatePathOfLink('DEEP/a', '../DEST'), resolve('DEST/b'));
});

test('should support {rename: object}', t => {
	const sut = new Options({cwd: 'SRC', rename: parse(resolve('SRC/b'))});

	t.is(sut.generatePathOfLink('a', '.'), resolve('SRC/b'));
	t.is(sut.generatePathOfLink('DEEP/a', '..'), resolve('SRC/b'));
	t.is(sut.generatePathOfLink('DEEP/a', '../DEST'), resolve('SRC/b'));
});

test('should support {rename: function():object}', t => {
	const sut = new Options({cwd: 'SRC', rename: () => parse(resolve('SRC/b'))});

	t.is(sut.generatePathOfLink('a', '.'), resolve('SRC/b'));
	t.is(sut.generatePathOfLink('DEEP/a', '..'), resolve('SRC/b'));
	t.is(sut.generatePathOfLink('DEEP/a', '../DEST'), resolve('SRC/b'));
});

test('should support sophisticated {rename: function():object}', t => {
	const sut = new Options({
		cwd: 'SRC',
		rename: pathOfLink => Object.assign(pathOfLink, {
			dir: join(pathOfLink.dir, '42'),
			base: `prefix-${pathOfLink.name}${pathOfLink.ext.toLowerCase()}`
		})
	});

	t.is(sut.generatePathOfLink('a.UNICORNS', '.'), resolve('SRC/42/prefix-a.unicorns'));
	t.is(sut.generatePathOfLink('DEEP/a.UNICORNS', '..'), resolve('42/prefix-a.unicorns'));
	t.is(sut.generatePathOfLink('DEEP/a.UNICORNS', '../DEST'), resolve('DEST/42/prefix-a.unicorns'));
});
