import { deepClone } from './starter';

test('returns primitives as-is', () => {
  expect(deepClone(1)).toBe(1);
  expect(deepClone('a')).toBe('a');
  expect(deepClone(null)).toBe(null);
  expect(deepClone(undefined)).toBe(undefined);
});

test('clones plain objects deeply', () => {
  const src = { a: 1, b: { c: 2 } };
  const out = deepClone(src);
  expect(out).toEqual(src);
  expect(out).not.toBe(src);
  expect(out.b).not.toBe(src.b);
});

test('clones arrays deeply', () => {
  const src = [1, [2, [3]]];
  const out = deepClone(src);
  expect(out).toEqual(src);
  out[1][1].push(99);
  expect(src[1][1]).toEqual([3]);
});

test('clones Date instances', () => {
  const src = new Date(123456);
  const out = deepClone(src);
  expect(out).toBeInstanceOf(Date);
  expect(out.getTime()).toBe(123456);
  expect(out).not.toBe(src);
});

test('clones Map and Set deeply', () => {
  const m = new Map([['k', { v: 1 }]]);
  const s = new Set([{ v: 2 }]);
  const cm = deepClone(m);
  const cs = deepClone(s);
  expect(cm).toBeInstanceOf(Map);
  expect(cs).toBeInstanceOf(Set);
  expect(cm.get('k')).not.toBe(m.get('k'));
  expect(cm.get('k').v).toBe(1);
});

test('preserves circular references', () => {
  const obj = { name: 'x' };
  obj.self = obj;
  const out = deepClone(obj);
  expect(out).not.toBe(obj);
  expect(out.self).toBe(out);
});
