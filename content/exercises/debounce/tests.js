import { debounce } from './starter';

test('invokes fn once after delay', async () => {
  let count = 0;
  const debounced = debounce(() => count++, 50);
  debounced();
  expect(count).toBe(0);
  await new Promise((r) => setTimeout(r, 100));
  expect(count).toBe(1);
});

test('resets the timer on rapid successive calls', async () => {
  let count = 0;
  const debounced = debounce(() => count++, 50);
  debounced();
  await new Promise((r) => setTimeout(r, 25));
  debounced();
  await new Promise((r) => setTimeout(r, 25));
  expect(count).toBe(0);
  await new Promise((r) => setTimeout(r, 60));
  expect(count).toBe(1);
});

test('forwards arguments from the most recent call', async () => {
  let received;
  const debounced = debounce((x, y) => {
    received = [x, y];
  }, 30);
  debounced(1, 2);
  debounced(3, 4);
  await new Promise((r) => setTimeout(r, 60));
  expect(received).toEqual([3, 4]);
});
