export class LRUCache<K, V> {
  private store = new Map<K, V>();

  constructor(private capacity: number) {}

  get(key: K): V | undefined {
    if (!this.store.has(key)) return undefined;
    const value = this.store.get(key)!;
    // bump to most-recent: delete and re-insert at the tail of insertion order
    this.store.delete(key);
    this.store.set(key, value);
    return value;
  }

  put(key: K, value: V): void {
    if (this.capacity <= 0) return;
    if (this.store.has(key)) {
      this.store.delete(key);
    } else if (this.store.size >= this.capacity) {
      // store is non-empty (size >= capacity > 0), so .next().value is defined
      const oldest = this.store.keys().next().value;
      if (oldest !== undefined) this.store.delete(oldest);
    }
    this.store.set(key, value);
  }

  get size(): number {
    return this.store.size;
  }
}
