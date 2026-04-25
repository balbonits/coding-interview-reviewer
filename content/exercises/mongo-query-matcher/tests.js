import { match } from "./starter";

test("implicit equality on top-level field", () => {
  expect(match({ name: "Alice" }, { name: "Alice", age: 30 })).toBe(true);
  expect(match({ name: "Bob" }, { name: "Alice" })).toBe(false);
});

test("multiple implicit-equality fields are AND-ed", () => {
  expect(match({ name: "Alice", age: 30 }, { name: "Alice", age: 30 })).toBe(
    true,
  );
  expect(match({ name: "Alice", age: 25 }, { name: "Alice", age: 30 })).toBe(
    false,
  );
});

test("$gt and $lt", () => {
  expect(match({ age: { $gt: 18 } }, { age: 30 })).toBe(true);
  expect(match({ age: { $gt: 18 } }, { age: 18 })).toBe(false);
  expect(match({ age: { $lt: 18 } }, { age: 17 })).toBe(true);
  expect(match({ age: { $lt: 18 } }, { age: 18 })).toBe(false);
});

test("$gte and $lte boundaries", () => {
  expect(match({ age: { $gte: 18 } }, { age: 18 })).toBe(true);
  expect(match({ age: { $lte: 18 } }, { age: 18 })).toBe(true);
});

test("multiple ops on a single field are AND-ed", () => {
  expect(match({ age: { $gte: 18, $lt: 65 } }, { age: 18 })).toBe(true);
  expect(match({ age: { $gte: 18, $lt: 65 } }, { age: 65 })).toBe(false);
  expect(match({ age: { $gte: 18, $lt: 65 } }, { age: 17 })).toBe(false);
});

test("$ne", () => {
  expect(
    match({ status: { $ne: "archived" } }, { status: "active" }),
  ).toBe(true);
  expect(
    match({ status: { $ne: "archived" } }, { status: "archived" }),
  ).toBe(false);
});

test("$in and $nin", () => {
  expect(
    match({ status: { $in: ["active", "pending"] } }, { status: "active" }),
  ).toBe(true);
  expect(match({ status: { $in: ["active"] } }, { status: "archived" })).toBe(
    false,
  );
  expect(match({ role: { $nin: ["admin"] } }, { role: "user" })).toBe(true);
  expect(match({ role: { $nin: ["admin"] } }, { role: "admin" })).toBe(false);
});

test("$exists distinguishes missing from null", () => {
  expect(match({ deletedAt: { $exists: true } }, { deletedAt: 123 })).toBe(
    true,
  );
  expect(match({ deletedAt: { $exists: true } }, { deletedAt: null })).toBe(
    true,
  );
  expect(match({ deletedAt: { $exists: false } }, { name: "A" })).toBe(true);
  expect(match({ deletedAt: { $exists: true } }, { name: "A" })).toBe(false);
});

test("$or matches if any sub-query matches", () => {
  const q = { $or: [{ role: "admin" }, { role: "owner" }] };
  expect(match(q, { role: "admin" })).toBe(true);
  expect(match(q, { role: "owner" })).toBe(true);
  expect(match(q, { role: "user" })).toBe(false);
});

test("$and matches only if every sub-query matches", () => {
  const q = { $and: [{ age: { $gte: 18 } }, { status: "active" }] };
  expect(match(q, { age: 18, status: "active" })).toBe(true);
  expect(match(q, { age: 18, status: "archived" })).toBe(false);
  expect(match(q, { age: 17, status: "active" })).toBe(false);
});

test("mixes top-level fields with $or", () => {
  const q = { active: true, $or: [{ role: "admin" }, { role: "owner" }] };
  expect(match(q, { active: true, role: "admin" })).toBe(true);
  expect(match(q, { active: false, role: "admin" })).toBe(false);
  expect(match(q, { active: true, role: "user" })).toBe(false);
});

test("empty query matches anything", () => {
  expect(match({}, {})).toBe(true);
  expect(match({}, { a: 1, b: 2 })).toBe(true);
});

test("throws on unknown operator", () => {
  expect(() => match({ x: { $bogus: 1 } }, { x: 1 })).toThrow();
});
