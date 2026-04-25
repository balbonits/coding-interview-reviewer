import { twoSum } from './starter';

test('basic case: returns indices in ascending order', () => {
  expect(twoSum([2, 7, 11, 15], 9)).toEqual([0, 1]);
});

test('handles answer not at the start', () => {
  expect(twoSum([3, 2, 4], 6)).toEqual([1, 2]);
});

test('handles same number used twice (different indices)', () => {
  expect(twoSum([3, 3], 6)).toEqual([0, 1]);
});

test('handles negative numbers', () => {
  expect(twoSum([-3, 4, 3, 90], 0)).toEqual([0, 2]);
});
