import { RateLimiter } from "./starter";

function makeClock(start = 1_000_000) {
  let t = start;
  return {
    now: () => t,
    advance: (ms) => {
      t += ms;
    },
    set: (ms) => {
      t = ms;
    },
  };
}

test("allows up to maxRequests then blocks", () => {
  const clock = makeClock();
  const lim = new RateLimiter({ maxRequests: 3, windowMs: 1000, now: clock.now });
  expect(lim.allow("A")).toBe(true);
  expect(lim.allow("A")).toBe(true);
  expect(lim.allow("A")).toBe(true);
  expect(lim.allow("A")).toBe(false);
});

test("remaining counts down and never goes negative", () => {
  const clock = makeClock();
  const lim = new RateLimiter({ maxRequests: 3, windowMs: 1000, now: clock.now });
  expect(lim.remaining("A")).toBe(3);
  lim.allow("A");
  expect(lim.remaining("A")).toBe(2);
  lim.allow("A");
  lim.allow("A");
  lim.allow("A"); // blocked
  expect(lim.remaining("A")).toBe(0);
});

test("clients are isolated", () => {
  const clock = makeClock();
  const lim = new RateLimiter({ maxRequests: 2, windowMs: 1000, now: clock.now });
  expect(lim.allow("A")).toBe(true);
  expect(lim.allow("A")).toBe(true);
  expect(lim.allow("A")).toBe(false);
  expect(lim.allow("B")).toBe(true);
  expect(lim.allow("B")).toBe(true);
});

test("window slides: blocked client becomes allowed after windowMs", () => {
  const clock = makeClock();
  const lim = new RateLimiter({ maxRequests: 2, windowMs: 1000, now: clock.now });
  lim.allow("A"); // t=1_000_000
  lim.allow("A"); // t=1_000_000
  expect(lim.allow("A")).toBe(false);
  clock.advance(1001);
  expect(lim.allow("A")).toBe(true);
  expect(lim.remaining("A")).toBe(1);
});

test("partial window expiry frees up some slots", () => {
  const clock = makeClock();
  const lim = new RateLimiter({ maxRequests: 3, windowMs: 1000, now: clock.now });
  lim.allow("A"); // t0
  clock.advance(400);
  lim.allow("A"); // t0+400
  clock.advance(400);
  lim.allow("A"); // t0+800
  expect(lim.allow("A")).toBe(false);
  // Advance just past the first stamp's expiry (t0 + 1001 -> t0 dropped).
  clock.advance(201);
  expect(lim.allow("A")).toBe(true);
  expect(lim.allow("A")).toBe(false); // back to limit
});

test("remaining for an unknown client is maxRequests", () => {
  const clock = makeClock();
  const lim = new RateLimiter({ maxRequests: 5, windowMs: 1000, now: clock.now });
  expect(lim.remaining("never-seen")).toBe(5);
});

test("remaining prunes expired entries even without an allow call", () => {
  const clock = makeClock();
  const lim = new RateLimiter({ maxRequests: 2, windowMs: 1000, now: clock.now });
  lim.allow("A");
  lim.allow("A");
  expect(lim.remaining("A")).toBe(0);
  clock.advance(1001);
  expect(lim.remaining("A")).toBe(2);
});

test("rejected attempts do not consume budget", () => {
  const clock = makeClock();
  const lim = new RateLimiter({ maxRequests: 1, windowMs: 1000, now: clock.now });
  expect(lim.allow("A")).toBe(true);
  expect(lim.allow("A")).toBe(false);
  expect(lim.allow("A")).toBe(false);
  expect(lim.allow("A")).toBe(false);
  clock.advance(1001);
  expect(lim.allow("A")).toBe(true); // still 1 slot per window
});
