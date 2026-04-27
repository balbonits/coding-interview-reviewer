import { flatten } from './starter';

test('default depth is 1', () => {
  expect(flatten([1, [2, [3]]])).toEqual([1, 2, [3]]);
});

test('depth=2 unwraps two levels', () => {
  expect(flatten([1, [2, [3, [4]]]], 2)).toEqual([1, 2, 3, [4]]);
});

test('Infinity fully flattens', () => {
  expect(flatten([1, [2, [3, [4, [5]]]]], Infinity)).toEqual([1, 2, 3, 4, 5]);
});

test('shallow array passes through', () => {
  expect(flatten([1, 2, 3])).toEqual([1, 2, 3]);
});

test('does not mutate input', () => {
  const input = [1, [2, [3]]];
  const snapshot = JSON.parse(JSON.stringify(input));
  flatten(input, Infinity);
  expect(input).toEqual(snapshot);
});

test('handles empty arrays', () => {
  expect(flatten([])).toEqual([]);
  expect(flatten([[], [[]]], Infinity)).toEqual([]);
});
