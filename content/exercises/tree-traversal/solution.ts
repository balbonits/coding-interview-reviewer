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

export function traverse<T>(
  root: TreeNode<T> | null,
  order: TraversalOrder,
): T[] {
  if (!root) return [];
  const out: T[] = [];

  if (order === 'levelorder') {
    const queue: TreeNode<T>[] = [root];
    while (queue.length) {
      const node = queue.shift()!;
      out.push(node.value);
      if (node.left) queue.push(node.left);
      if (node.right) queue.push(node.right);
    }
    return out;
  }

  function dfs(node: TreeNode<T> | null): void {
    if (!node) return;
    if (order === 'preorder') out.push(node.value);
    dfs(node.left);
    if (order === 'inorder') out.push(node.value);
    dfs(node.right);
    if (order === 'postorder') out.push(node.value);
  }

  dfs(root);
  return out;
}
