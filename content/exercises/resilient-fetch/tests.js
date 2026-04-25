import { request } from "./starter";

const originalFetch = globalThis.fetch;

function jsonResponse(body, init = {}) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json" },
    ...init,
  });
}

function mockFetch(handlers) {
  let calls = 0;
  globalThis.fetch = async (url, opts) => {
    const handler = handlers[calls];
    calls++;
    if (typeof handler === "function") return handler(url, opts);
    if (handler instanceof Error) throw handler;
    return handler;
  };
  return () => calls;
}

afterEach(() => {
  globalThis.fetch = originalFetch;
});

test("returns parsed JSON on 200", async () => {
  mockFetch([jsonResponse({ ok: true })]);
  const result = await request("/api");
  expect(result).toEqual({ ok: true });
});

test("retries on 500, then succeeds", async () => {
  const calls = mockFetch([
    new Response("server error", { status: 500 }),
    jsonResponse({ ok: 1 }),
  ]);
  const result = await request("/api", { retries: 2, baseDelayMs: 1 });
  expect(result).toEqual({ ok: 1 });
  expect(calls()).toBe(2);
});

test("does not retry on 400", async () => {
  const calls = mockFetch([new Response("bad", { status: 400 })]);
  await expect(
    request("/api", { retries: 3, baseDelayMs: 1 }),
  ).rejects.toThrow();
  expect(calls()).toBe(1);
});

test("does not retry on 404", async () => {
  const calls = mockFetch([new Response("not found", { status: 404 })]);
  await expect(
    request("/api", { retries: 3, baseDelayMs: 1 }),
  ).rejects.toThrow();
  expect(calls()).toBe(1);
});

test("throws after exhausting retries on 500", async () => {
  const calls = mockFetch([
    new Response("e", { status: 500 }),
    new Response("e", { status: 500 }),
    new Response("e", { status: 500 }),
  ]);
  await expect(
    request("/api", { retries: 2, baseDelayMs: 1 }),
  ).rejects.toThrow();
  expect(calls()).toBe(3); // initial + 2 retries
});

test("retries on a thrown network error, then succeeds", async () => {
  const calls = mockFetch([
    new TypeError("network down"),
    jsonResponse({ ok: 1 }),
  ]);
  const result = await request("/api", { retries: 2, baseDelayMs: 1 });
  expect(result).toEqual({ ok: 1 });
  expect(calls()).toBe(2);
});

test("honors Retry-After on 429 (uses it instead of backoff)", async () => {
  mockFetch([
    new Response("rate", {
      status: 429,
      headers: { "Retry-After": "0" },
    }),
    jsonResponse({ ok: 1 }),
  ]);
  const start = Date.now();
  // baseDelayMs is large; if Retry-After (0) is honored, we skip the wait.
  const result = await request("/api", { retries: 1, baseDelayMs: 500 });
  expect(result).toEqual({ ok: 1 });
  expect(Date.now() - start).toBeLessThan(200);
});

test("retries on 503", async () => {
  const calls = mockFetch([
    new Response("down", { status: 503 }),
    jsonResponse({ ok: 1 }),
  ]);
  const result = await request("/api", { retries: 1, baseDelayMs: 1 });
  expect(result).toEqual({ ok: 1 });
  expect(calls()).toBe(2);
});

test("forwards method and body to fetch", async () => {
  let captured;
  globalThis.fetch = async (url, opts) => {
    captured = { url, opts };
    return jsonResponse({ ok: 1 });
  };
  await request("/api/x", { method: "POST", body: "hello" });
  expect(captured.url).toBe("/api/x");
  expect(captured.opts.method).toBe("POST");
  expect(captured.opts.body).toBe("hello");
  // signal should be set (from AbortController)
  expect(captured.opts.signal).toBeDefined();
});
