export class RateLimiter {
  constructor({ maxRequests, windowMs, now = () => Date.now() }) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
    this.now = now;
    this.log = new Map(); // clientId -> number[] (timestamps, oldest first)
  }

  allow(clientId) {
    const stamps = this._prune(clientId);
    if (stamps.length < this.maxRequests) {
      stamps.push(this.now());
      return true;
    }
    return false;
  }

  remaining(clientId) {
    const stamps = this._prune(clientId);
    return Math.max(0, this.maxRequests - stamps.length);
  }

  _prune(clientId) {
    const cutoff = this.now() - this.windowMs;
    let stamps = this.log.get(clientId);
    if (!stamps) {
      stamps = [];
      this.log.set(clientId, stamps);
      return stamps;
    }
    // Drop expired entries from the front (timestamps are appended in order).
    let i = 0;
    while (i < stamps.length && stamps[i] <= cutoff) i++;
    if (i > 0) stamps.splice(0, i);
    return stamps;
  }
}
