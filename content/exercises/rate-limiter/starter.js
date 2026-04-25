/**
 * Sliding-window log rate limiter.
 *
 * @param {object} opts
 * @param {number} opts.maxRequests   max requests allowed per window
 * @param {number} opts.windowMs      window length in milliseconds
 * @param {() => number} [opts.now]   injected clock (default: Date.now)
 */
export class RateLimiter {
  constructor({ maxRequests, windowMs, now = () => Date.now() }) {
    // your code here
  }

  /**
   * Returns true if this attempt is within budget (and records it),
   * false if the client is rate-limited.
   * @param {string} clientId
   * @returns {boolean}
   */
  allow(clientId) {
    // your code here
  }

  /**
   * Returns how many more requests this client could make right now.
   * @param {string} clientId
   * @returns {number}
   */
  remaining(clientId) {
    // your code here
  }
}
