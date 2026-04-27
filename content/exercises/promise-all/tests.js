import { promiseAll } from './starter';

test('resolves to plain values when no promises', async () => {
  await expect(promiseAll([1, 2, 3])).resolves.toEqual([1, 2, 3]);
});

test('resolves promises in original order regardless of settle order', async () => {
  const slow = new Promise((r) => setTimeout(() => r('slow'), 30));
  const fast = new Promise((r) => setTimeout(() => r('fast'), 5));
  await expect(promiseAll([slow, fast])).resolves.toEqual(['slow', 'fast']);
});

test('mixed plain values and promises', async () => {
  await expect(
    promiseAll([1, Promise.resolve(2), 3, Promise.resolve(4)]),
  ).resolves.toEqual([1, 2, 3, 4]);
});

test('first rejection wins', async () => {
  const slowOk = new Promise((r) => setTimeout(() => r('ok'), 30));
  const fastErr = new Promise((_, rej) => setTimeout(() => rej('boom'), 5));
  await expect(promiseAll([slowOk, fastErr])).rejects.toBe('boom');
});

test('empty input resolves to empty array', async () => {
  await expect(promiseAll([])).resolves.toEqual([]);
});

test('subsequent rejections are ignored after the first', async () => {
  const a = Promise.reject('first');
  const b = Promise.reject('second');
  // Should reject with the first rejection only; the second one shouldn't crash
  await expect(promiseAll([a, b]).catch((e) => e)).resolves.toBe('first');
});
