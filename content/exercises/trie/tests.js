import { Trie } from './starter';

test('search returns true only for inserted words', () => {
  const t = new Trie();
  t.insert('cat');
  expect(t.search('cat')).toBe(true);
  expect(t.search('ca')).toBe(false);
  expect(t.search('cats')).toBe(false);
});

test('startsWith returns true for any prefix of an inserted word', () => {
  const t = new Trie();
  t.insert('career');
  expect(t.startsWith('car')).toBe(true);
  expect(t.startsWith('care')).toBe(true);
  expect(t.startsWith('career')).toBe(true);
  expect(t.startsWith('cap')).toBe(false);
});

test('multiple words share prefix paths', () => {
  const t = new Trie();
  t.insert('cat');
  t.insert('car');
  t.insert('care');
  expect(t.search('cat')).toBe(true);
  expect(t.search('car')).toBe(true);
  expect(t.search('care')).toBe(true);
  expect(t.search('ca')).toBe(false);
});

test('suggest returns all words with the given prefix', () => {
  const t = new Trie();
  t.insert('cat');
  t.insert('car');
  t.insert('care');
  t.insert('dog');
  expect(t.suggest('ca').sort()).toEqual(['car', 'care', 'cat']);
  expect(t.suggest('do').sort()).toEqual(['dog']);
  expect(t.suggest('z')).toEqual([]);
});

test('suggest with empty prefix returns every word', () => {
  const t = new Trie();
  t.insert('a');
  t.insert('b');
  t.insert('ab');
  expect(t.suggest('').sort()).toEqual(['a', 'ab', 'b']);
});

test('inserting the same word twice does not duplicate suggestions', () => {
  const t = new Trie();
  t.insert('hi');
  t.insert('hi');
  expect(t.suggest('h')).toEqual(['hi']);
});

test('empty trie behavior', () => {
  const t = new Trie();
  expect(t.search('anything')).toBe(false);
  expect(t.startsWith('a')).toBe(false);
  expect(t.suggest('a')).toEqual([]);
});
