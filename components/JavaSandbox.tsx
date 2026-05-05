"use client";

import { useEffect, useState, useTransition, type KeyboardEvent } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

const STARTER = `public class Main {
    public static void main(String[] args) {
        System.out.println("Hello from Java!");
    }
}
`;

export type JavaSubmission = {
  code: string;
  stdin: string;
  lastResult?: JavaRunResult;
};

type JavaRunResult = {
  ok: boolean;
  stdout: string;
  stderr: string;
  exitCode: number | null;
  phase: "compile" | "run";
  durationMs: number;
  timedOut: boolean;
  className: string;
};

type Props = {
  onSubmit?: (sub: JavaSubmission) => void;
  onCancel?: () => void;
  submitLabel?: string;
  cancelLabel?: string;
};

type JdkProbe =
  | { kind: "loading" }
  | { kind: "ok"; version: string }
  | { kind: "missing"; message: string; installHint: string };

type RunState =
  | { kind: "idle" }
  | { kind: "result"; result: JavaRunResult }
  | { kind: "error"; message: string };

export function JavaSandbox({
  onSubmit,
  onCancel,
  submitLabel = "Submit for review",
  cancelLabel = "Cancel",
}: Props) {
  const [code, setCode] = useState(STARTER);
  const [stdin, setStdin] = useState("");
  const [run, setRun] = useState<RunState>({ kind: "idle" });
  const [jdk, setJdk] = useState<JdkProbe>({ kind: "loading" });
  const [isRunning, startRun] = useTransition();

  useEffect(() => {
    let cancelled = false;
    fetch("/api/run/java")
      .then((r) => r.json())
      .then((s) => {
        if (cancelled) return;
        if (s.ok) {
          setJdk({ kind: "ok", version: s.version ?? "" });
        } else {
          setJdk({
            kind: "missing",
            message: s.error ?? "JDK not detected",
            installHint: s.installHint ?? "",
          });
        }
      })
      .catch((e) => {
        if (!cancelled) {
          setJdk({
            kind: "missing",
            message: String(e),
            installHint: "",
          });
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  function execute() {
    startRun(async () => {
      try {
        const res = await fetch("/api/run/java", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code, stdin }),
        });
        const data = await res.json();
        if (!res.ok) {
          setRun({
            kind: "error",
            message: `${data.error ?? res.statusText}${
              data.installHint ? `\n\n${data.installHint}` : ""
            }`,
          });
          return;
        }
        setRun({ kind: "result", result: data as JavaRunResult });
      } catch (e) {
        setRun({
          kind: "error",
          message: e instanceof Error ? e.message : String(e),
        });
      }
    });
  }

  function handleCodeKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    // Tab inserts spaces instead of changing focus.
    if (e.key === "Tab") {
      e.preventDefault();
      const ta = e.currentTarget;
      const start = ta.selectionStart;
      const end = ta.selectionEnd;
      const next = code.slice(0, start) + "    " + code.slice(end);
      setCode(next);
      requestAnimationFrame(() => {
        ta.selectionStart = ta.selectionEnd = start + 4;
      });
    }
  }

  function handleSubmit() {
    if (!onSubmit) return;
    const lastResult = run.kind === "result" ? run.result : undefined;
    onSubmit({ code, stdin, lastResult });
  }

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-muted/30 px-3 py-2 text-xs">
        <span className="text-muted-foreground">
          Java sandbox{" "}
          {jdk.kind === "ok" && (
            <span className="ml-1 text-green-500">· {jdk.version}</span>
          )}
        </span>
        <span className="text-muted-foreground">
          compile 30s · run 10s · heap 256MB
        </span>
      </div>

      {jdk.kind === "missing" && (
        <div className="border-b border-border bg-destructive/10 px-3 py-2 text-xs text-destructive">
          <p className="font-medium">JDK not detected — {jdk.message}</p>
          {jdk.installHint && (
            <p className="mt-1 font-mono text-[11px] whitespace-pre-wrap">
              {jdk.installHint}
            </p>
          )}
        </div>
      )}

      <Textarea
        value={code}
        onChange={(e) => setCode(e.target.value)}
        onKeyDown={handleCodeKeyDown}
        spellCheck={false}
        className="min-h-[300px] resize-y rounded-none border-0 border-b border-border font-mono text-xs leading-5"
      />

      <details className="border-b border-border">
        <summary className="cursor-pointer px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground">
          Stdin (optional)
        </summary>
        <Textarea
          value={stdin}
          onChange={(e) => setStdin(e.target.value)}
          spellCheck={false}
          placeholder="Lines of input piped to the program's stdin…"
          className="min-h-16 max-h-40 rounded-none border-0 border-t border-border font-mono text-xs"
        />
      </details>

      <div className="max-h-[220px] min-h-[80px] overflow-auto bg-zinc-950 px-3 py-2 font-mono text-xs leading-5 text-zinc-100">
        <Output state={run} isRunning={isRunning} />
      </div>

      <div className="flex flex-wrap items-center justify-end gap-2 border-t border-border bg-card px-3 py-2">
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={execute}
          disabled={isRunning || jdk.kind !== "ok"}
        >
          {isRunning ? "Running…" : "Run"}
        </Button>
        {onCancel && (
          <Button type="button" size="sm" variant="ghost" onClick={onCancel}>
            {cancelLabel}
          </Button>
        )}
        {onSubmit && (
          <Button type="button" size="sm" onClick={handleSubmit}>
            {submitLabel}
          </Button>
        )}
      </div>
    </div>
  );
}

function Output({
  state,
  isRunning,
}: {
  state: RunState;
  isRunning: boolean;
}) {
  if (isRunning) {
    return <span className="text-zinc-500">Compiling and running…</span>;
  }
  if (state.kind === "idle") {
    return (
      <span className="text-zinc-500">
        Run output will appear here. Click <strong>Run</strong> to compile and
        execute.
      </span>
    );
  }
  if (state.kind === "error") {
    return <pre className="m-0 whitespace-pre-wrap text-red-400">{state.message}</pre>;
  }

  const r = state.result;
  const blocks: string[] = [];
  if (r.phase === "compile" && !r.ok) {
    blocks.push("-- compile error --");
    if (r.stderr) blocks.push(r.stderr);
    if (r.timedOut) blocks.push("-- compile timed out --");
  } else {
    if (r.stdout) blocks.push(r.stdout.replace(/\n$/, ""));
    if (r.stderr) {
      blocks.push((blocks.length ? "\n" : "") + "-- stderr --\n" + r.stderr);
    }
    if (r.timedOut) blocks.push("\n-- run timed out (10s limit) --");
    if (r.exitCode !== null && r.exitCode !== 0 && !r.timedOut) {
      blocks.push(`\n-- exit ${r.exitCode} --`);
    }
  }
  const meta = `\n\n[${r.className} · ${r.durationMs}ms]`;
  const text = blocks.join("") || "(no output)";
  return (
    <pre className="m-0 whitespace-pre-wrap">
      {text}
      <span className="text-zinc-500">{meta}</span>
    </pre>
  );
}
