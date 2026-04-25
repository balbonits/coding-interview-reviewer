const RETRYABLE_STATUS = new Set([429, 500, 502, 503, 504]);

export async function request(url, options = {}) {
  const {
    retries = 3,
    baseDelayMs = 100,
    timeoutMs = 10000,
    ...fetchOpts
  } = options;

  let attempt = 0;
  while (true) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    let response;
    try {
      response = await fetch(url, { ...fetchOpts, signal: controller.signal });
    } catch (err) {
      clearTimeout(timer);
      if (attempt < retries) {
        await sleep(backoffWithJitter(baseDelayMs, attempt));
        attempt++;
        continue;
      }
      throw new Error(
        `request failed after ${attempt + 1} attempt(s): ${err.message}`,
      );
    }
    clearTimeout(timer);

    if (response.ok) {
      return await response.json();
    }

    // Non-retryable client error -> throw immediately.
    if (!RETRYABLE_STATUS.has(response.status)) {
      throw new Error(`request failed with status ${response.status}`);
    }

    // Retryable status (429, 5xx). Retry if attempts remain.
    if (attempt < retries) {
      const retryAfterMs = parseRetryAfter(response.headers.get("Retry-After"));
      const delay = retryAfterMs ?? backoffWithJitter(baseDelayMs, attempt);
      await sleep(delay);
      attempt++;
      continue;
    }

    throw new Error(
      `request failed with status ${response.status} after ${attempt + 1} attempt(s)`,
    );
  }
}

function backoffWithJitter(baseMs, attempt) {
  const exp = baseMs * Math.pow(2, attempt);
  const jitter = Math.random() * baseMs;
  return exp + jitter;
}

function parseRetryAfter(value) {
  if (value == null) return null;
  const seconds = Number(value);
  if (!Number.isNaN(seconds)) return seconds * 1000;
  // Could be an HTTP-date; not handled here for brevity.
  return null;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
