const RETRYABLE_STATUS = new Set([429, 500, 502, 503, 504]);

/**
 * Fetch wrapper with retries + exponential backoff for transient failures.
 *
 * @param {string} url
 * @param {object} [options]
 * @param {number} [options.retries=3]      max retry attempts
 * @param {number} [options.baseDelayMs=100] base for exponential backoff
 * @param {number} [options.timeoutMs=10000] per-attempt timeout
 * @returns {Promise<any>} parsed JSON body
 *
 * Behavior:
 * - 2xx -> return parsed JSON
 * - Non-retryable 4xx (e.g. 400/401/403/404/409/422) -> throw immediately
 * - Retryable status (429, 5xx) -> retry with exponential backoff + jitter
 *   - 429/503 with `Retry-After` header (seconds) -> use that delay instead
 * - Network error from fetch -> retry as if it were a 5xx
 * - Per-attempt timeout via AbortController; counts as a network error
 * - When retries are exhausted, throw an Error
 */
export async function request(url, options = {}) {
  // your code here
}
