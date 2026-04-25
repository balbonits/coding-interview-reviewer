import { fizzbuzz } from './starter';

test('first 5 numbers', () => {
  expect(fizzbuzz(5)).toEqual(['1', '2', 'Fizz', '4', 'Buzz']);
});

test('handles 15 (FizzBuzz at the end)', () => {
  expect(fizzbuzz(15)).toEqual([
    '1', '2', 'Fizz', '4', 'Buzz', 'Fizz', '7', '8', 'Fizz', 'Buzz',
    '11', 'Fizz', '13', '14', 'FizzBuzz',
  ]);
});

test('returns empty array for n = 0', () => {
  expect(fizzbuzz(0)).toEqual([]);
});

test('returns single item for n = 1', () => {
  expect(fizzbuzz(1)).toEqual(['1']);
});
