import { traverse, type TreeNode } from './starter';

function leaf<T>(value: T): TreeNode<T> {
  return { value, left: null, right: null };
}

// Sample tree:
//        1
//       / \
//      2   3
//     / \   \
//    4   5   6
const sample: TreeNode<number> = {
  value: 1,
  left: {
    value: 2,
    left: leaf(4),
    right: leaf(5),
  },
  right: {
    value: 3,
    left: null,
    right: leaf(6),
  },
};

test('null root returns empty array for every order', () => {
  expect(traverse(null, 'preorder')).toEqual([]);
  expect(traverse(null, 'inorder')).toEqual([]);
  expect(traverse(null, 'postorder')).toEqual([]);
  expect(traverse(null, 'levelorder')).toEqual([]);
});

test('preorder: root, left, right', () => {
  expect(traverse(sample, 'preorder')).toEqual([1, 2, 4, 5, 3, 6]);
});

test('inorder: left, root, right', () => {
  expect(traverse(sample, 'inorder')).toEqual([4, 2, 5, 1, 3, 6]);
});

test('postorder: left, right, root', () => {
  expect(traverse(sample, 'postorder')).toEqual([4, 5, 2, 6, 3, 1]);
});

test('levelorder: BFS top-to-bottom, left-to-right', () => {
  expect(traverse(sample, 'levelorder')).toEqual([1, 2, 3, 4, 5, 6]);
});

test('single leaf returns its single value for every order', () => {
  const node = leaf('x');
  for (const order of [
    'preorder',
    'inorder',
    'postorder',
    'levelorder',
  ] as const) {
    expect(traverse(node, order)).toEqual(['x']);
  }
});

test('left-skewed tree (only left children)', () => {
  const tree: TreeNode<number> = {
    value: 1,
    left: {
      value: 2,
      left: { value: 3, left: null, right: null },
      right: null,
    },
    right: null,
  };
  expect(traverse(tree, 'preorder')).toEqual([1, 2, 3]);
  expect(traverse(tree, 'inorder')).toEqual([3, 2, 1]);
  expect(traverse(tree, 'postorder')).toEqual([3, 2, 1]);
  expect(traverse(tree, 'levelorder')).toEqual([1, 2, 3]);
});

test('right-skewed tree (only right children)', () => {
  const tree: TreeNode<number> = {
    value: 1,
    left: null,
    right: {
      value: 2,
      left: null,
      right: { value: 3, left: null, right: null },
    },
  };
  expect(traverse(tree, 'preorder')).toEqual([1, 2, 3]);
  expect(traverse(tree, 'inorder')).toEqual([1, 2, 3]);
  expect(traverse(tree, 'postorder')).toEqual([3, 2, 1]);
  expect(traverse(tree, 'levelorder')).toEqual([1, 2, 3]);
});
