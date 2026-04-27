import { memoize } from './starter';

test('caches by stringified arguments', () => {
  let calls = 0;
  const fn = (a, b) => { calls++; return a + b; };
  const memo = memoize(fn);

  expect(memo(1, 2)).toBe(3);
  expect(memo(1, 2)).toBe(3);
  expect(calls).toBe(1);

  expect(memo(2, 3)).toBe(5);
  expect(calls).toBe(2);
});

test('different argument shapes produce different cache entries', () => {
  let calls = 0;
  const fn = (...args) => { calls++; return args.length; };
  const memo = memoize(fn);
  memo(1);
  memo(1, 2);
  memo(1, 2, 3);
  expect(calls).toBe(3);
});

test('respects a custom resolver', () => {
  let calls = 0;
  const fn = (user) => { calls++; return user.name.toUpperCase(); };
  const memo = memoize(fn, (user) => user.id);
  expect(memo({ id: 1, name: 'a' })).toBe('A');
  expect(memo({ id: 1, name: 'b' })).toBe('A'); // resolver maps both to id=1
  expect(calls).toBe(1);
});

test('separate memoize calls have separate caches', () => {
  let calls = 0;
  const fn = (x) => { calls++; return x; };
  const m1 = memoize(fn);
  const m2 = memoize(fn);
  m1(1);
  m2(1);
  expect(calls).toBe(2);
});
