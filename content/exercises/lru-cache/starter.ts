// TODO: implement an O(1) LRU cache.
export class LRUCache<K, V> {
  constructor(_capacity: number) {
    // your fields here
  }

  get(_key: K): V | undefined {
    return undefined;
  }

  put(_key: K, _value: V): void {
    // insert or update; evict LRU when over capacity
  }

  get size(): number {
    return 0;
  }
}
