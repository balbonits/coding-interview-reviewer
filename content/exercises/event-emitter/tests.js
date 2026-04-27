import { EventEmitter } from './starter';

test('on/emit invokes the listener with args', () => {
  const ee = new EventEmitter();
  const seen = [];
  ee.on('x', (a, b) => seen.push([a, b]));
  ee.emit('x', 1, 2);
  expect(seen).toEqual([[1, 2]]);
});

test('multiple listeners fire in subscription order', () => {
  const ee = new EventEmitter();
  const order = [];
  ee.on('x', () => order.push('a'));
  ee.on('x', () => order.push('b'));
  ee.emit('x');
  expect(order).toEqual(['a', 'b']);
});

test('on returns an unsubscribe function', () => {
  const ee = new EventEmitter();
  let count = 0;
  const off = ee.on('x', () => count++);
  off();
  ee.emit('x');
  expect(count).toBe(0);
});

test('off removes the exact listener', () => {
  const ee = new EventEmitter();
  let aCount = 0;
  let bCount = 0;
  const a = () => aCount++;
  const b = () => bCount++;
  ee.on('x', a);
  ee.on('x', b);
  ee.off('x', a);
  ee.emit('x');
  expect(aCount).toBe(0);
  expect(bCount).toBe(1);
});

test('once fires exactly once', () => {
  const ee = new EventEmitter();
  let count = 0;
  ee.once('x', () => count++);
  ee.emit('x');
  ee.emit('x');
  expect(count).toBe(1);
});

test('emit with no listeners is a no-op', () => {
  const ee = new EventEmitter();
  expect(() => ee.emit('nobody')).not.toThrow();
});

test('listener removed during emit does not fire on that emit', () => {
  const ee = new EventEmitter();
  let bCalled = false;
  const b = () => { bCalled = true; };
  ee.on('x', () => ee.off('x', b));
  ee.on('x', b);
  ee.emit('x');
  expect(bCalled).toBe(false);
});
