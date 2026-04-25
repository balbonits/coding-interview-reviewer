import { pick } from './starter';

test('picks only the listed keys', () => {
  const obj = { a: 1, b: 'two', c: true };
  expect(pick(obj, ['a', 'c'])).toEqual({ a: 1, c: true });
});

test('returns an empty object when no keys are requested', () => {
  expect(pick({ a: 1, b: 2 }, [])).toEqual({});
});

test('does not mutate the source', () => {
  const obj = { a: 1, b: 2 };
  pick(obj, ['a']);
  expect(obj).toEqual({ a: 1, b: 2 });
});

test('preserves nested object identity (shallow copy)', () => {
  const inner = { nested: true };
  const obj = { a: inner, b: 1 };
  const result = pick(obj, ['a']);
  expect(result.a).toBe(inner);
});

test('handles all keys', () => {
  const obj = { x: 1, y: 2, z: 3 };
  expect(pick(obj, ['x', 'y', 'z'])).toEqual({ x: 1, y: 2, z: 3 });
});

test('preserves key insertion order from the keys array', () => {
  const obj = { a: 1, b: 2, c: 3 };
  const result = pick(obj, ['c', 'a']);
  expect(Object.keys(result)).toEqual(['c', 'a']);
});

test('copies a key whose value is undefined', () => {
  const obj: { a: number; b: number | undefined } = { a: 1, b: undefined };
  const result = pick(obj, ['b']);
  expect('b' in result).toBe(true);
  expect(result.b).toBeUndefined();
});

// --- Type-level smoke checks (compile-time only) ---
// These don't run at runtime but will fail to compile if `pick`
// is typed incorrectly. Sandpack's TS template surfaces the errors inline.

const sample = { a: 1, b: 'two', c: true };

// Valid: 'a' and 'c' exist on `sample`.
const ok = pick(sample, ['a', 'c']);
const _okA: number = ok.a;
const _okC: boolean = ok.c;

// Invalid: 'd' is not a key of `sample`.
// @ts-expect-error — 'd' is not assignable to keyof typeof sample
pick(sample, ['d']);
