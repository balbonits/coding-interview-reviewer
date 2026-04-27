export class EventEmitter {
  constructor() {
    this.listeners = new Map();
  }

  on(event, listener) {
    if (!this.listeners.has(event)) this.listeners.set(event, []);
    this.listeners.get(event).push(listener);
    return () => this.off(event, listener);
  }

  off(event, listener) {
    const arr = this.listeners.get(event);
    if (!arr) return;
    const i = arr.indexOf(listener);
    if (i !== -1) arr.splice(i, 1);
    if (arr.length === 0) this.listeners.delete(event);
  }

  emit(event, ...args) {
    const arr = this.listeners.get(event);
    if (!arr) return;
    // Walk the live array so a listener removed during emit is skipped.
    let i = 0;
    while (i < arr.length) {
      const listener = arr[i];
      listener(...args);
      // If the call didn't splice this listener out, advance.
      if (arr[i] === listener) i++;
    }
  }

  once(event, listener) {
    const wrapper = (...args) => {
      this.off(event, wrapper);
      listener(...args);
    };
    return this.on(event, wrapper);
  }
}
