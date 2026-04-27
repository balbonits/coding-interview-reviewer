import { throttle } from './starter';

test('fires immediately on the leading edge', () => {
  let count = 0;
  const t = throttle(() => count++, 50);
  t();
  expect(count).toBe(1);
});

test('ignores calls inside the wait window', () => {
  let count = 0;
  const t = throttle(() => count++, 50);
  t();
  t();
  t();
  expect(count).toBe(1);
});

test('fires again after the window elapses', async () => {
  let count = 0;
  const t = throttle(() => count++, 30);
  t();
  await new Promise((r) => setTimeout(r, 50));
  t();
  expect(count).toBe(2);
});

test('forwards arguments to the wrapped function', () => {
  const seen = [];
  const t = throttle((...args) => seen.push(args), 50);
  t(1, 2);
  expect(seen).toEqual([[1, 2]]);
});
