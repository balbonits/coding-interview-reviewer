export type TreeNode<T> = {
  value: T;
  left: TreeNode<T> | null;
  right: TreeNode<T> | null;
};

export type TraversalOrder =
  | 'preorder'
  | 'inorder'
  | 'postorder'
  | 'levelorder';

// TODO: implement traverse for all four orders.
export function traverse<T>(
  _root: TreeNode<T> | null,
  _order: TraversalOrder,
): T[] {
  return [];
}
