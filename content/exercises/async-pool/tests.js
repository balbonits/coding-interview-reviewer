import { asyncPool } from './starter';

const make = (value, ms, log, onStart) => () => {
  if (onStart) onStart();
  return new Promise((r) =>
    setTimeout(() => {
      log.push(value);
      r(value);
    }, ms),
  );
};

test('preserves order regardless of completion timing', async () => {
  const log = [];
  const result = await asyncPool(2, [
    make('a', 30, log),
    make('b', 5, log),
    make('c', 20, log),
    make('d', 1, log),
  ]);
  expect(result).toEqual(['a', 'b', 'c', 'd']);
});

test('respects the concurrency limit', async () => {
  let inFlight = 0;
  let peak = 0;
  const log = [];
  const tasks = Array.from({ length: 6 }, (_, i) =>
    make(i, 10, log, () => {
      inFlight++;
      peak = Math.max(peak, inFlight);
      setTimeout(() => inFlight--, 10);
    }),
  );
  await asyncPool(2, tasks);
  expect(peak).toBeLessThanOrEqual(2);
});

test('does not invoke tasks eagerly', async () => {
  let invoked = 0;
  const tasks = Array.from({ length: 5 }, () => () => {
    invoked++;
    return new Promise((r) => setTimeout(r, 10));
  });
  const promise = asyncPool(2, tasks);
  // Synchronously, only the first batch should have started.
  expect(invoked).toBeLessThanOrEqual(2);
  await promise;
  expect(invoked).toBe(5);
});

test('empty tasks resolves to empty array', async () => {
  await expect(asyncPool(3, [])).resolves.toEqual([]);
});

test('limit larger than tasks runs all in parallel', async () => {
  const log = [];
  const result = await asyncPool(10, [
    make('a', 5, log),
    make('b', 5, log),
  ]);
  expect(result).toEqual(['a', 'b']);
});

test('rejects on first failure', async () => {
  const tasks = [
    () => new Promise((r) => setTimeout(() => r(1), 30)),
    () => Promise.reject('boom'),
    () => new Promise((r) => setTimeout(() => r(3), 30)),
  ];
  await expect(asyncPool(2, tasks)).rejects.toBe('boom');
});
