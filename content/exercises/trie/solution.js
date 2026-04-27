function makeNode() {
  return { children: new Map(), isEnd: false };
}

export class Trie {
  constructor() {
    this.root = makeNode();
  }

  insert(word) {
    let node = this.root;
    for (const ch of word) {
      if (!node.children.has(ch)) node.children.set(ch, makeNode());
      node = node.children.get(ch);
    }
    node.isEnd = true;
  }

  _walk(prefix) {
    let node = this.root;
    for (const ch of prefix) {
      const next = node.children.get(ch);
      if (!next) return null;
      node = next;
    }
    return node;
  }

  search(word) {
    const node = this._walk(word);
    return !!node && node.isEnd;
  }

  startsWith(prefix) {
    return this._walk(prefix) !== null;
  }

  suggest(prefix) {
    const node = this._walk(prefix);
    if (!node) return [];
    const out = [];
    const dfs = (n, path) => {
      if (n.isEnd) out.push(path);
      for (const [ch, child] of n.children) {
        dfs(child, path + ch);
      }
    };
    dfs(node, prefix);
    return out;
  }
}
