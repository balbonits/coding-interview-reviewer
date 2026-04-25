import { LRUCache } from './starter';

test('get on a missing key returns undefined', () => {
  const cache = new LRUCache<string, number>(2);
  expect(cache.get('a')).toBeUndefined();
});

test('put then get returns the value', () => {
  const cache = new LRUCache<string, number>(2);
  cache.put('a', 1);
  expect(cache.get('a')).toBe(1);
});

test('put updates an existing key without growing size', () => {
  const cache = new LRUCache<string, number>(2);
  cache.put('a', 1);
  cache.put('a', 2);
  expect(cache.get('a')).toBe(2);
  expect(cache.size).toBe(1);
});

test('evicts least-recently-used when at capacity', () => {
  const cache = new LRUCache<string, number>(2);
  cache.put('a', 1);
  cache.put('b', 2);
  cache.put('c', 3); // evicts 'a'
  expect(cache.get('a')).toBeUndefined();
  expect(cache.get('b')).toBe(2);
  expect(cache.get('c')).toBe(3);
});

test('get marks the key as most-recently-used', () => {
  const cache = new LRUCache<string, number>(2);
  cache.put('a', 1);
  cache.put('b', 2);
  cache.get('a');     // 'a' is now MRU, 'b' is LRU
  cache.put('c', 3);  // evicts 'b'
  expect(cache.get('a')).toBe(1);
  expect(cache.get('b')).toBeUndefined();
  expect(cache.get('c')).toBe(3);
});

test('updating an existing key does not evict another', () => {
  const cache = new LRUCache<string, number>(2);
  cache.put('a', 1);
  cache.put('b', 2);
  cache.put('a', 99); // update, not insert
  expect(cache.size).toBe(2);
  expect(cache.get('a')).toBe(99);
  expect(cache.get('b')).toBe(2);
});

test('capacity 0 stores nothing', () => {
  const cache = new LRUCache<string, number>(0);
  cache.put('a', 1);
  expect(cache.get('a')).toBeUndefined();
  expect(cache.size).toBe(0);
});

test('size never exceeds capacity', () => {
  const cache = new LRUCache<string, number>(3);
  for (let i = 0; i < 10; i++) {
    cache.put(`k${i}`, i);
    expect(cache.size).toBeLessThanOrEqual(3);
  }
  expect(cache.size).toBe(3);
});

test('LeetCode 146 trace', () => {
  const cache = new LRUCache<number, number>(2);
  cache.put(1, 1);
  cache.put(2, 2);
  expect(cache.get(1)).toBe(1);   // returns 1, 1 is now MRU
  cache.put(3, 3);                 // evicts key 2
  expect(cache.get(2)).toBeUndefined();
  cache.put(4, 4);                 // evicts key 1
  expect(cache.get(1)).toBeUndefined();
  expect(cache.get(3)).toBe(3);
  expect(cache.get(4)).toBe(4);
});

test('updating then accessing keeps the key alive against eviction', () => {
  const cache = new LRUCache<string, number>(2);
  cache.put('a', 1);
  cache.put('b', 2);
  cache.put('a', 99);  // update bumps 'a' to MRU
  cache.put('c', 3);   // evicts 'b' (now LRU)
  expect(cache.get('a')).toBe(99);
  expect(cache.get('b')).toBeUndefined();
});
