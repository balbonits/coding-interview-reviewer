import { spawn } from "node:child_process";
import { mkdtemp, writeFile, rm, readdir, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

export type JavaRunResult = {
  ok: boolean;
  stdout: string;
  stderr: string;
  exitCode: number | null;
  phase: "compile" | "run";
  durationMs: number;
  timedOut: boolean;
  className: string;
};

export type JdkStatus = {
  ok: boolean;
  version?: string;
  error?: string;
  /** Resolved javac path when ok. */
  javacPath?: string;
  /** Resolved java path when ok. */
  javaPath?: string;
  /** True when /usr/bin/java exists but no real JDK is behind it (macOS stub). */
  stub?: boolean;
};

const COMPILE_TIMEOUT_MS = 30_000;
const RUN_TIMEOUT_MS = 10_000;
const MAX_HEAP = "-Xmx256m";

/**
 * Search common JDK install locations and return the first working javac
 * found. Order: $JAVA_HOME, /Library/Java/JavaVirtualMachines, /opt/homebrew
 * openjdk variants (newest version wins among these), $HOME/.sdkman, then
 * PATH as a last resort (which on macOS hits the stub at /usr/bin/javac and
 * fails — so callers can show an install hint).
 */
async function discoverJdks(): Promise<string[]> {
  const candidates: string[] = [];

  // jenv shims first — honors `jenv global` / `jenv local` (.java-version).
  // Shims are standalone scripts; no shell rc init needed.
  if (process.env.HOME) {
    candidates.push(join(process.env.HOME, ".jenv", "shims"));
  }

  if (process.env.JAVA_HOME) {
    candidates.push(join(process.env.JAVA_HOME, "bin"));
  }

  const macosVms = "/Library/Java/JavaVirtualMachines";
  try {
    const entries = await readdir(macosVms);
    for (const e of entries) {
      candidates.push(join(macosVms, e, "Contents", "Home", "bin"));
    }
  } catch {
    // dir doesn't exist
  }

  // Brew openjdk (current + versioned). Prefer newest version first.
  const brewOpt = "/opt/homebrew/opt";
  try {
    const entries = await readdir(brewOpt);
    const openjdks = entries
      .filter((e) => e === "openjdk" || /^openjdk@\d+$/.test(e))
      .sort((a, b) => {
        const va = parseInt(a.split("@")[1] ?? "9999", 10);
        const vb = parseInt(b.split("@")[1] ?? "9999", 10);
        return vb - va; // newest first
      });
    for (const e of openjdks) candidates.push(join(brewOpt, e, "bin"));
  } catch {
    // not on Apple silicon brew
  }

  const intelBrewOpt = "/usr/local/opt";
  try {
    const entries = await readdir(intelBrewOpt);
    const openjdks = entries.filter(
      (e) => e === "openjdk" || /^openjdk@\d+$/.test(e),
    );
    for (const e of openjdks) candidates.push(join(intelBrewOpt, e, "bin"));
  } catch {
    // intel brew not installed
  }

  if (process.env.HOME) {
    const sdkman = join(process.env.HOME, ".sdkman", "candidates", "java");
    try {
      const entries = await readdir(sdkman);
      for (const e of entries) candidates.push(join(sdkman, e, "bin"));
    } catch {
      // sdkman not installed
    }
  }

  // PATH fallback — bare command, runs whatever resolves.
  candidates.push("");

  // De-dupe while preserving order; only keep dirs that contain a javac file.
  const seen = new Set<string>();
  const out: string[] = [];
  for (const c of candidates) {
    if (seen.has(c)) continue;
    seen.add(c);
    if (c === "") {
      out.push("");
      continue;
    }
    try {
      await stat(join(c, "javac"));
      out.push(c);
    } catch {
      // skip; no javac in this dir
    }
  }
  return out;
}

async function probeJavac(
  binDir: string,
): Promise<{ ok: boolean; version: string; isStub: boolean }> {
  const cmd = binDir ? join(binDir, "javac") : "javac";
  return new Promise((resolve) => {
    const child = spawn(cmd, ["-version"]);
    let out = "";
    child.stdout.on("data", (d: Buffer) => (out += d.toString()));
    child.stderr.on("data", (d: Buffer) => (out += d.toString()));
    child.on("close", (code) => {
      const text = out.trim();
      const isStub = /Unable to locate a Java Runtime/i.test(text);
      resolve({
        ok: code === 0 && /\d/.test(text) && !isStub,
        version: text,
        isStub,
      });
    });
    child.on("error", () => resolve({ ok: false, version: "", isStub: false }));
  });
}

let cachedResolved:
  | { javac: string; java: string; version: string }
  | null
  | undefined;

async function resolveJdk(): Promise<{
  javac: string;
  java: string;
  version: string;
} | null> {
  if (cachedResolved !== undefined) return cachedResolved;
  const dirs = await discoverJdks();
  for (const d of dirs) {
    const probe = await probeJavac(d);
    if (probe.ok) {
      cachedResolved = {
        javac: d ? join(d, "javac") : "javac",
        java: d ? join(d, "java") : "java",
        version: probe.version,
      };
      return cachedResolved;
    }
  }
  cachedResolved = null;
  return null;
}

/** Clear the cached JDK resolution — useful after the user installs one. */
export function resetJdkCache() {
  cachedResolved = undefined;
}

function detectClassName(code: string): string {
  const publicMatch = code.match(/public\s+class\s+(\w+)/);
  if (publicMatch) return publicMatch[1];
  const anyMatch = code.match(/class\s+(\w+)/);
  if (anyMatch) return anyMatch[1];
  return "Main";
}

type SpawnResult = {
  stdout: string;
  stderr: string;
  exitCode: number | null;
  timedOut: boolean;
};

function runWithTimeout(
  cmd: string,
  args: string[],
  cwd: string,
  stdin: string | undefined,
  timeoutMs: number,
): Promise<SpawnResult> {
  return new Promise((resolve) => {
    const child = spawn(cmd, args, { cwd });
    let stdout = "";
    let stderr = "";
    let timedOut = false;

    const timer = setTimeout(() => {
      timedOut = true;
      child.kill("SIGKILL");
    }, timeoutMs);

    child.stdout.on("data", (d: Buffer) => {
      stdout += d.toString();
      if (stdout.length > 1_000_000) child.kill("SIGKILL");
    });
    child.stderr.on("data", (d: Buffer) => {
      stderr += d.toString();
      if (stderr.length > 1_000_000) child.kill("SIGKILL");
    });

    if (stdin !== undefined && stdin !== "") {
      child.stdin.write(stdin);
    }
    child.stdin.end();

    child.on("close", (code) => {
      clearTimeout(timer);
      resolve({ stdout, stderr, exitCode: code, timedOut });
    });
    child.on("error", (err) => {
      clearTimeout(timer);
      resolve({
        stdout,
        stderr: stderr + (stderr ? "\n" : "") + String(err),
        exitCode: null,
        timedOut,
      });
    });
  });
}

export async function runJava(
  code: string,
  stdin?: string,
): Promise<JavaRunResult> {
  const className = detectClassName(code);
  const jdk = await resolveJdk();
  if (!jdk) {
    return {
      ok: false,
      stdout: "",
      stderr: "No JDK found",
      exitCode: null,
      phase: "compile",
      durationMs: 0,
      timedOut: false,
      className,
    };
  }
  const dir = await mkdtemp(join(tmpdir(), "java-run-"));
  const start = Date.now();
  try {
    await writeFile(join(dir, `${className}.java`), code, "utf8");

    const compile = await runWithTimeout(
      jdk.javac,
      [`${className}.java`],
      dir,
      undefined,
      COMPILE_TIMEOUT_MS,
    );
    if (compile.timedOut || compile.exitCode !== 0) {
      return {
        ok: false,
        stdout: compile.stdout,
        stderr: compile.stderr,
        exitCode: compile.exitCode,
        phase: "compile",
        durationMs: Date.now() - start,
        timedOut: compile.timedOut,
        className,
      };
    }

    const run = await runWithTimeout(
      jdk.java,
      [MAX_HEAP, className],
      dir,
      stdin,
      RUN_TIMEOUT_MS,
    );
    return {
      ok: !run.timedOut && run.exitCode === 0,
      stdout: run.stdout,
      stderr: run.stderr,
      exitCode: run.exitCode,
      phase: "run",
      durationMs: Date.now() - start,
      timedOut: run.timedOut,
      className,
    };
  } finally {
    await rm(dir, { recursive: true, force: true }).catch(() => {});
  }
}

export async function checkJdkStatus(): Promise<JdkStatus> {
  const jdk = await resolveJdk();
  if (jdk) {
    return {
      ok: true,
      version: jdk.version,
      javacPath: jdk.javac,
      javaPath: jdk.java,
    };
  }
  // Nothing found anywhere. Probe PATH directly to know whether to flag the
  // macOS stub specifically (gives the user the right install hint).
  const pathProbe = await probeJavac("");
  return {
    ok: false,
    stub: pathProbe.isStub,
    error: pathProbe.isStub
      ? "macOS Java stub detected — no real JDK installed."
      : pathProbe.version || "javac not found on PATH",
  };
}
