import { isValid } from './starter';

test('empty string is valid', () => {
  expect(isValid('')).toBe(true);
});

test('matched simple pairs', () => {
  expect(isValid('()')).toBe(true);
  expect(isValid('()[]{}')).toBe(true);
});

test('nested pairs', () => {
  expect(isValid('{[()()]}')).toBe(true);
});

test('mismatched closer', () => {
  expect(isValid('(]')).toBe(false);
});

test('interleaved pairs are invalid', () => {
  expect(isValid('([)]')).toBe(false);
});

test('unclosed opener is invalid', () => {
  expect(isValid('(')).toBe(false);
  expect(isValid('([{')).toBe(false);
});

test('unexpected closer is invalid', () => {
  expect(isValid(')')).toBe(false);
  expect(isValid('()){')).toBe(false);
});
