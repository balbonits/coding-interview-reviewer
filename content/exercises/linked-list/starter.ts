// TODO: implement a generic doubly linked list.
// All operations except toArray and reverse must be O(1).
export class LinkedList<T> {
  // your fields here

  push(_value: T): void {
    // append to tail
  }

  pop(): T | undefined {
    // remove and return tail value
    return undefined;
  }

  unshift(_value: T): void {
    // prepend to head
  }

  shift(): T | undefined {
    // remove and return head value
    return undefined;
  }

  reverse(): void {
    // reverse in place — swap each node's prev/next, then swap head/tail
  }

  toArray(): T[] {
    // values head -> tail
    return [];
  }

  get size(): number {
    return 0;
  }
}
