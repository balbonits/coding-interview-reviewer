import { stringify } from './starter';

test('null and booleans', () => {
  expect(stringify(null)).toBe('null');
  expect(stringify(true)).toBe('true');
  expect(stringify(false)).toBe('false');
});

test('finite numbers', () => {
  expect(stringify(42)).toBe('42');
  expect(stringify(-3.14)).toBe('-3.14');
  expect(stringify(0)).toBe('0');
});

test('NaN and Infinity become "null"', () => {
  expect(stringify(NaN)).toBe('null');
  expect(stringify(Infinity)).toBe('null');
  expect(stringify(-Infinity)).toBe('null');
});

test('string escaping', () => {
  expect(stringify('hi')).toBe('"hi"');
  expect(stringify('a"b')).toBe('"a\\"b"');
  expect(stringify('a\nb')).toBe('"a\\nb"');
  expect(stringify('a\\b')).toBe('"a\\\\b"');
});

test('arrays serialize recursively', () => {
  expect(stringify([1, 'two', null])).toBe('[1,"two",null]');
  expect(stringify([[1, 2], [3]])).toBe('[[1,2],[3]]');
});

test('plain objects serialize recursively', () => {
  expect(stringify({ a: 1, b: 'two' })).toBe('{"a":1,"b":"two"}');
  expect(stringify({ nested: { ok: true } })).toBe('{"nested":{"ok":true}}');
});

test('undefined / function / symbol at top level returns undefined', () => {
  expect(stringify(undefined)).toBeUndefined();
  expect(stringify(() => {})).toBeUndefined();
  expect(stringify(Symbol('s'))).toBeUndefined();
});

test('undefined / function / symbol inside arrays become "null"', () => {
  expect(stringify([1, undefined, () => {}, 'a'])).toBe('[1,null,null,"a"]');
});

test('undefined / function / symbol inside objects are omitted', () => {
  expect(stringify({ a: 1, b: undefined, c: () => {}, d: 2 })).toBe('{"a":1,"d":2}');
});

test('toJSON is honored', () => {
  expect(stringify({ toJSON: () => 99 })).toBe('99');
  expect(stringify({ toJSON: () => ({ wrapped: true }) })).toBe('{"wrapped":true}');
});

test('matches native JSON.stringify on a complex object', () => {
  const obj = {
    name: 'Ada',
    age: 36,
    skills: ['math', 'code', null],
    extra: undefined,
  };
  expect(stringify(obj)).toBe(JSON.stringify(obj));
});
