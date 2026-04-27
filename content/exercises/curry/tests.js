import { curry } from './starter';

const sum3 = (a, b, c) => a + b + c;

test('all-args call works directly', () => {
  expect(curry(sum3)(1, 2, 3)).toBe(6);
});

test('one arg at a time', () => {
  expect(curry(sum3)(1)(2)(3)).toBe(6);
});

test('mixed partial-application shapes', () => {
  const c = curry(sum3);
  expect(c(1, 2)(3)).toBe(6);
  expect(c(1)(2, 3)).toBe(6);
});

test('extra args beyond arity are forwarded to fn', () => {
  const fn = (a, b, ...rest) => a + b + rest.reduce((s, x) => s + x, 0);
  expect(curry(fn)(1)(2, 3, 4)).toBe(10);
});

test('arity comes from fn.length', () => {
  const id = (x) => x;
  expect(curry(id)(42)).toBe(42);
});
