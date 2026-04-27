#!/usr/bin/env node
// Verify every exercise's solution.{ext} passes its tests.{ext}.
//
// Each tests file uses Jest-style globals: `test`, `expect`, plus
// `expect(...).resolves`/`rejects` for async assertions. We shim those
// here, rewrite the `from './starter'` import to point at `./solution`,
// then dynamic-import the rewritten test file.
//
// React templates (`react`, `react-ts`) are skipped — they need a DOM
// (jsdom) and @testing-library/react, which aren't dev deps. We
// statically validate they at least import cleanly via a smoke check.

import fs from "node:fs/promises";
import path from "node:path";
import url from "node:url";
import ts from "typescript";

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const EXERCISES_DIR = path.join(__dirname, "..", "content", "exercises");

function stripTypes(source, { jsx = false } = {}) {
  return ts.transpileModule(source, {
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ESNext,
      moduleResolution: ts.ModuleResolutionKind.Bundler,
      jsx: jsx ? ts.JsxEmit.ReactJSX : ts.JsxEmit.None,
    },
  }).outputText;
}

let jsdomInstalled = false;
async function ensureJsdom() {
  if (jsdomInstalled) return;
  const { JSDOM } = await import("jsdom");
  const dom = new JSDOM("<!doctype html><html><body></body></html>", {
    url: "http://localhost/",
  });
  // Copy DOM globals onto Node's globalThis for RTL/React.
  // Some Node-built-in globals (like `navigator`) are read-only getters,
  // so we use defineProperty with configurable=true to overwrite them.
  const setGlobal = (name, value) => {
    Object.defineProperty(globalThis, name, {
      value,
      writable: true,
      configurable: true,
    });
  };
  setGlobal("window", dom.window);
  setGlobal("document", dom.window.document);
  setGlobal("navigator", dom.window.navigator);
  setGlobal("HTMLElement", dom.window.HTMLElement);
  setGlobal("Node", dom.window.Node);
  setGlobal("Element", dom.window.Element);
  setGlobal("Event", dom.window.Event);
  setGlobal("MouseEvent", dom.window.MouseEvent);
  setGlobal("KeyboardEvent", dom.window.KeyboardEvent);
  globalThis.requestAnimationFrame = (cb) => setTimeout(cb, 0);
  globalThis.cancelAnimationFrame = (id) => clearTimeout(id);
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  jsdomInstalled = true;
}

const TEMPLATE_EXT = {
  vanilla: "js",
  "vanilla-ts": "ts",
  react: "jsx",
  "react-ts": "tsx",
  node: "js",
};

const REACT_TEMPLATES = new Set(["react", "react-ts"]);

// ---------- Jest-style assertion shim ----------

class AssertionError extends Error {
  constructor(msg) {
    super(msg);
    this.name = "AssertionError";
  }
}

function deepEqual(a, b) {
  if (Object.is(a, b)) return true;
  if (a === null || b === null) return false;
  if (typeof a !== "object" || typeof b !== "object") return false;
  if (a instanceof Date && b instanceof Date) return a.getTime() === b.getTime();
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  if (Array.isArray(a)) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) if (!deepEqual(a[i], b[i])) return false;
    return true;
  }
  const ka = Object.keys(a);
  const kb = Object.keys(b);
  if (ka.length !== kb.length) return false;
  for (const k of ka) if (!deepEqual(a[k], b[k])) return false;
  return true;
}

function fmt(v) {
  if (typeof v === "string") return JSON.stringify(v);
  if (typeof v === "function") return "[Function]";
  try {
    return JSON.stringify(v);
  } catch {
    return String(v);
  }
}

function makeMatchers(actual, negated = false) {
  const flip = (cond) => (negated ? !cond : cond);
  const fail = (msg) => {
    throw new AssertionError(msg);
  };
  const m = {
    toBe(expected) {
      if (!flip(Object.is(actual, expected))) {
        fail(`expected ${fmt(actual)} ${negated ? "not " : ""}toBe ${fmt(expected)}`);
      }
    },
    toEqual(expected) {
      if (!flip(deepEqual(actual, expected))) {
        fail(`expected ${fmt(actual)} ${negated ? "not " : ""}toEqual ${fmt(expected)}`);
      }
    },
    toBeUndefined() {
      if (!flip(actual === undefined)) {
        fail(`expected ${fmt(actual)} ${negated ? "not " : ""}toBeUndefined`);
      }
    },
    toBeNull() {
      if (!flip(actual === null)) {
        fail(`expected ${fmt(actual)} ${negated ? "not " : ""}toBeNull`);
      }
    },
    toBeTruthy() {
      if (!flip(!!actual)) {
        fail(`expected ${fmt(actual)} ${negated ? "not " : ""}toBeTruthy`);
      }
    },
    toBeFalsy() {
      if (!flip(!actual)) {
        fail(`expected ${fmt(actual)} ${negated ? "not " : ""}toBeFalsy`);
      }
    },
    toBeDefined() {
      if (!flip(actual !== undefined)) {
        fail(`expected ${fmt(actual)} ${negated ? "not " : ""}toBeDefined`);
      }
    },
    toBeInstanceOf(ctor) {
      if (!flip(actual instanceof ctor)) {
        fail(`expected ${fmt(actual)} ${negated ? "not " : ""}toBeInstanceOf ${ctor.name}`);
      }
    },
    toBeLessThanOrEqual(n) {
      if (!flip(actual <= n)) {
        fail(`expected ${actual} ${negated ? "not " : ""}<= ${n}`);
      }
    },
    toBeGreaterThanOrEqual(n) {
      if (!flip(actual >= n)) {
        fail(`expected ${actual} ${negated ? "not " : ""}>= ${n}`);
      }
    },
    toBeLessThan(n) {
      if (!flip(actual < n)) {
        fail(`expected ${actual} ${negated ? "not " : ""}< ${n}`);
      }
    },
    toBeGreaterThan(n) {
      if (!flip(actual > n)) {
        fail(`expected ${actual} ${negated ? "not " : ""}> ${n}`);
      }
    },
    toHaveLength(expected) {
      const len = actual && actual.length;
      if (!flip(len === expected)) {
        fail(`expected length ${expected}, got ${len}`);
      }
    },
    toMatch(re) {
      const ok = re instanceof RegExp ? re.test(actual) : String(actual).includes(re);
      if (!flip(ok)) {
        fail(`expected ${fmt(actual)} ${negated ? "not " : ""}toMatch ${re}`);
      }
    },
    toContain(needle) {
      const ok =
        (typeof actual === "string" && actual.includes(needle)) ||
        (Array.isArray(actual) && actual.includes(needle));
      if (!flip(ok)) {
        fail(`expected ${fmt(actual)} ${negated ? "not " : ""}toContain ${fmt(needle)}`);
      }
    },
    toThrow(expected) {
      let threw = false;
      let err;
      try {
        if (typeof actual !== "function") {
          fail("toThrow requires a function");
        }
        actual();
      } catch (e) {
        threw = true;
        err = e;
      }
      if (!flip(threw)) {
        fail(`expected function ${negated ? "not " : ""}toThrow`);
      }
      if (threw && expected && !negated) {
        const msg = err && err.message ? err.message : String(err);
        if (expected instanceof RegExp ? !expected.test(msg) : !msg.includes(expected)) {
          fail(`thrown error did not match ${fmt(expected)} (got ${fmt(msg)})`);
        }
      }
    },
  };
  return m;
}

function makeAsyncMatchers(promise, negated = false) {
  return {
    async toBe(expected) {
      const settled = await settle(promise);
      if (settled.status !== "fulfilled") {
        if (!negated) throw new AssertionError(`expected resolved value, got rejection ${fmt(settled.reason)}`);
        return;
      }
      makeMatchers(settled.value, negated).toBe(expected);
    },
    async toEqual(expected) {
      const settled = await settle(promise);
      if (settled.status !== "fulfilled") {
        if (!negated) throw new AssertionError(`expected resolved value, got rejection ${fmt(settled.reason)}`);
        return;
      }
      makeMatchers(settled.value, negated).toEqual(expected);
    },
    async toBeUndefined() {
      const settled = await settle(promise);
      makeMatchers(settled.status === "fulfilled" ? settled.value : settled.reason, negated).toBeUndefined();
    },
  };
}

function makeRejectsMatchers(promise) {
  return {
    async toBe(expected) {
      const settled = await settle(promise);
      if (settled.status !== "rejected") {
        throw new AssertionError(`expected rejection, got fulfilled ${fmt(settled.value)}`);
      }
      makeMatchers(settled.reason).toBe(expected);
    },
    async toEqual(expected) {
      const settled = await settle(promise);
      if (settled.status !== "rejected") {
        throw new AssertionError(`expected rejection, got fulfilled ${fmt(settled.value)}`);
      }
      makeMatchers(settled.reason).toEqual(expected);
    },
    async toThrow(expected) {
      const settled = await settle(promise);
      if (settled.status !== "rejected") {
        throw new AssertionError(`expected promise to reject, got fulfilled ${fmt(settled.value)}`);
      }
      if (expected !== undefined) {
        const msg = settled.reason && settled.reason.message ? settled.reason.message : String(settled.reason);
        if (expected instanceof RegExp ? !expected.test(msg) : !msg.includes(expected)) {
          throw new AssertionError(`rejection did not match ${fmt(expected)} (got ${fmt(msg)})`);
        }
      }
    },
  };
}

function settle(p) {
  return Promise.resolve(p).then(
    (value) => ({ status: "fulfilled", value }),
    (reason) => ({ status: "rejected", reason }),
  );
}

function makeExpect() {
  function expect(actual) {
    const matchers = makeMatchers(actual, false);
    matchers.not = makeMatchers(actual, true);
    if (actual && typeof actual.then === "function") {
      matchers.resolves = makeAsyncMatchers(actual, false);
      matchers.rejects = makeRejectsMatchers(actual);
    }
    return matchers;
  }
  return expect;
}

// ---------- Test collector ----------

function makeRunner() {
  const tests = [];
  const beforeEachFns = [];
  const afterEachFns = [];
  const testFn = (name, fn) => {
    tests.push({ name, fn });
  };
  testFn.skip = () => {};
  return {
    test: testFn,
    it: testFn,
    beforeEach: (fn) => beforeEachFns.push(fn),
    afterEach: (fn) => afterEachFns.push(fn),
    expect: makeExpect(),
    _tests: tests,
    _beforeEachFns: beforeEachFns,
    _afterEachFns: afterEachFns,
  };
}

// ---------- Per-exercise execution ----------

async function runExercise(slug) {
  const dir = path.join(EXERCISES_DIR, slug);
  const meta = JSON.parse(await fs.readFile(path.join(dir, "meta.json"), "utf8"));
  const template = meta.template ?? "vanilla";
  const ext = TEMPLATE_EXT[template];

  const testsPath = path.join(dir, `tests.${ext}`);
  const solutionPath = path.join(dir, `solution.${ext}`);
  const isTs = template === "vanilla-ts" || template === "react-ts";
  const isReact = REACT_TEMPLATES.has(template);

  let original;
  try {
    original = await fs.readFile(testsPath, "utf8");
  } catch {
    return { slug, skipped: true, reason: `no tests.${ext}` };
  }

  if (isReact) await ensureJsdom();

  const cleanupFiles = [];
  let runnablePath;
  // React tests reference './Starter' (capital S); rewrite to compiled solution.
  // Other tests reference './starter'.
  const starterImportRegex = isReact
    ? /from\s+['"]\.\/Starter['"]/g
    : /from\s+['"]\.\/starter['"]/g;

  if (isTs || isReact) {
    const solutionSource = await fs.readFile(solutionPath, "utf8");
    const compiledSolutionPath = path.join(dir, "solution.run.mjs");
    await fs.writeFile(
      compiledSolutionPath,
      stripTypes(solutionSource, { jsx: isReact }),
      "utf8",
    );
    cleanupFiles.push(compiledSolutionPath);

    const compiledTests = stripTypes(original, { jsx: isReact }).replace(
      starterImportRegex,
      `from './solution.run.mjs'`,
    );
    runnablePath = path.join(dir, "tests.run.mjs");
    await fs.writeFile(runnablePath, compiledTests, "utf8");
    cleanupFiles.push(runnablePath);
  } else {
    const rewritten = original.replace(
      starterImportRegex,
      `from './solution.${ext}'`,
    );
    runnablePath = path.join(dir, "tests.run.mjs");
    await fs.writeFile(runnablePath, rewritten, "utf8");
    cleanupFiles.push(runnablePath);
  }

  const runner = makeRunner();
  // Install globals for the test module to consume.
  globalThis.test = runner.test;
  globalThis.it = runner.it;
  globalThis.expect = runner.expect;
  globalThis.beforeEach = runner.beforeEach;
  globalThis.afterEach = runner.afterEach;

  let importError = null;
  try {
    // Cache-bust so re-runs reload the file.
    await import(url.pathToFileURL(runnablePath).href + `?t=${Date.now()}`);
  } catch (e) {
    importError = e;
  }

  const results = [];
  // For React tests, unmount any mounted components between tests so each
  // test starts with a clean DOM (RTL's render doesn't auto-cleanup outside
  // of a test framework integration).
  let rtlCleanup = null;
  if (isReact) {
    const rtl = await import("@testing-library/react");
    rtlCleanup = rtl.cleanup;
  }

  if (!importError) {
    for (const t of runner._tests) {
      try {
        for (const b of runner._beforeEachFns) await b();
        await t.fn();
        for (const a of runner._afterEachFns) await a();
        results.push({ name: t.name, ok: true });
      } catch (e) {
        results.push({
          name: t.name,
          ok: false,
          error: e instanceof Error ? `${e.message}` : String(e),
        });
      } finally {
        if (rtlCleanup) rtlCleanup();
      }
    }
  }

  for (const f of cleanupFiles) await fs.unlink(f).catch(() => {});

  // Existence check on solution
  let solutionExists = true;
  try {
    await fs.access(solutionPath);
  } catch {
    solutionExists = false;
  }

  return {
    slug,
    solutionExists,
    importError: importError ? (importError.stack ?? importError.message) : null,
    results,
  };
}

// ---------- Main ----------

async function main() {
  // Test code may create promises that reject before a matcher attaches
  // (e.g. .rejects assertions await settle, so they handle them later).
  // Swallow these so the harness keeps running and we get a real
  // assertion error from the matcher, not a process crash.
  process.on("unhandledRejection", () => {});

  const entries = await fs.readdir(EXERCISES_DIR, { withFileTypes: true });
  const slugs = entries.filter((e) => e.isDirectory()).map((e) => e.name).sort();

  let totalTests = 0;
  let totalFailed = 0;
  let totalSkipped = 0;
  const failedExercises = [];

  for (const slug of slugs) {
    const r = await runExercise(slug);

    if (r.skipped) {
      totalSkipped++;
      console.log(`⏭  ${slug.padEnd(30)} skipped — ${r.reason}`);
      continue;
    }

    if (r.importError) {
      console.log(`❌ ${slug.padEnd(30)} import error`);
      console.log(`   ${r.importError.split("\n")[0]}`);
      failedExercises.push(slug);
      totalFailed++;
      continue;
    }

    if (!r.solutionExists) {
      console.log(`❌ ${slug.padEnd(30)} no solution file`);
      failedExercises.push(slug);
      totalFailed++;
      continue;
    }

    const passed = r.results.filter((t) => t.ok).length;
    const failed = r.results.filter((t) => !t.ok);
    totalTests += r.results.length;
    totalFailed += failed.length;

    if (failed.length === 0) {
      console.log(`✅ ${slug.padEnd(30)} ${passed}/${r.results.length}`);
    } else {
      console.log(`❌ ${slug.padEnd(30)} ${passed}/${r.results.length}`);
      for (const f of failed) {
        console.log(`     ✗ ${f.name}`);
        console.log(`         ${f.error}`);
      }
      failedExercises.push(slug);
    }
  }

  console.log("");
  console.log(`Total: ${totalTests} tests, ${totalFailed} failed, ${totalSkipped} exercises skipped`);
  if (failedExercises.length > 0) {
    console.log(`Failed exercises: ${failedExercises.join(", ")}`);
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
