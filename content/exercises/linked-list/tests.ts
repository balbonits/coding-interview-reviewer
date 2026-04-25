import { LinkedList } from './starter';

test('starts empty', () => {
  const list = new LinkedList<number>();
  expect(list.size).toBe(0);
  expect(list.toArray()).toEqual([]);
  expect(list.pop()).toBeUndefined();
  expect(list.shift()).toBeUndefined();
});

test('push appends to tail', () => {
  const list = new LinkedList<number>();
  list.push(1);
  list.push(2);
  list.push(3);
  expect(list.toArray()).toEqual([1, 2, 3]);
  expect(list.size).toBe(3);
});

test('pop removes from tail', () => {
  const list = new LinkedList<number>();
  list.push(1);
  list.push(2);
  list.push(3);
  expect(list.pop()).toBe(3);
  expect(list.pop()).toBe(2);
  expect(list.toArray()).toEqual([1]);
  expect(list.size).toBe(1);
});

test('unshift prepends to head', () => {
  const list = new LinkedList<number>();
  list.unshift(1);
  list.unshift(2);
  list.unshift(3);
  expect(list.toArray()).toEqual([3, 2, 1]);
});

test('shift removes from head', () => {
  const list = new LinkedList<number>();
  list.push(1);
  list.push(2);
  list.push(3);
  expect(list.shift()).toBe(1);
  expect(list.shift()).toBe(2);
  expect(list.toArray()).toEqual([3]);
  expect(list.size).toBe(1);
});

test('emptying via pop yields a clean state for reuse', () => {
  const list = new LinkedList<number>();
  list.push(1);
  list.pop();
  expect(list.size).toBe(0);
  expect(list.pop()).toBeUndefined();
  list.push(99);
  expect(list.toArray()).toEqual([99]);
});

test('emptying via shift yields a clean state for reuse', () => {
  const list = new LinkedList<number>();
  list.push(1);
  list.shift();
  expect(list.size).toBe(0);
  expect(list.shift()).toBeUndefined();
  list.unshift(99);
  expect(list.toArray()).toEqual([99]);
});

test('reverse on an empty list is a no-op', () => {
  const list = new LinkedList<number>();
  list.reverse();
  expect(list.toArray()).toEqual([]);
});

test('reverse on a single-element list is a no-op', () => {
  const list = new LinkedList<number>();
  list.push(42);
  list.reverse();
  expect(list.toArray()).toEqual([42]);
});

test('reverse flips order', () => {
  const list = new LinkedList<number>();
  for (const v of [1, 2, 3, 4, 5]) list.push(v);
  list.reverse();
  expect(list.toArray()).toEqual([5, 4, 3, 2, 1]);
});

test('after reverse, push still appends to the new tail', () => {
  const list = new LinkedList<number>();
  list.push(1);
  list.push(2);
  list.reverse();         // [2, 1]
  list.push(0);           // [2, 1, 0]
  expect(list.toArray()).toEqual([2, 1, 0]);
  expect(list.size).toBe(3);
});

test('mixed mutations maintain correct size and order', () => {
  const list = new LinkedList<number>();
  list.push(1);    // [1]
  list.push(2);    // [1, 2]
  list.unshift(0); // [0, 1, 2]
  list.push(3);    // [0, 1, 2, 3]
  list.shift();    // [1, 2, 3]
  list.pop();      // [1, 2]
  expect(list.toArray()).toEqual([1, 2]);
  expect(list.size).toBe(2);
});
