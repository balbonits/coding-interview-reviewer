type Node<T> = {
  value: T;
  prev: Node<T> | null;
  next: Node<T> | null;
};

export class LinkedList<T> {
  private head: Node<T> | null = null;
  private tail: Node<T> | null = null;
  private _size = 0;

  push(value: T): void {
    const node: Node<T> = { value, prev: this.tail, next: null };
    if (this.tail) this.tail.next = node;
    else this.head = node;
    this.tail = node;
    this._size++;
  }

  pop(): T | undefined {
    if (!this.tail) return undefined;
    const value = this.tail.value;
    this.tail = this.tail.prev;
    if (this.tail) this.tail.next = null;
    else this.head = null;
    this._size--;
    return value;
  }

  unshift(value: T): void {
    const node: Node<T> = { value, prev: null, next: this.head };
    if (this.head) this.head.prev = node;
    else this.tail = node;
    this.head = node;
    this._size++;
  }

  shift(): T | undefined {
    if (!this.head) return undefined;
    const value = this.head.value;
    this.head = this.head.next;
    if (this.head) this.head.prev = null;
    else this.tail = null;
    this._size--;
    return value;
  }

  reverse(): void {
    let cur = this.head;
    while (cur) {
      const next = cur.next;
      cur.next = cur.prev;
      cur.prev = next;
      cur = next;
    }
    [this.head, this.tail] = [this.tail, this.head];
  }

  toArray(): T[] {
    const out: T[] = [];
    for (let n = this.head; n; n = n.next) out.push(n.value);
    return out;
  }

  get size(): number {
    return this._size;
  }
}
