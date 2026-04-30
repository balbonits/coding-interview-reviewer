"use client";

import { useEffect, useRef, useState } from "react";
import {
  SandpackProvider,
  SandpackLayout,
  SandpackCodeEditor,
  SandpackTests,
  useSandpack,
  type SandpackFiles,
} from "@codesandbox/sandpack-react";
import type { SandpackTemplate } from "@/lib/exercises";

type Props = {
  starter: string;
  tests: string;
  solution: string;
  template?: SandpackTemplate;
  problem?: string;
};

type TemplateFileShape = {
  starterPath: string;
  testPath: string;
  extras?: SandpackFiles;
};

function fileShapeForTemplate(template: SandpackTemplate): TemplateFileShape {
  switch (template) {
    case "vanilla":
      return {
        starterPath: "/starter.js",
        testPath: "/starter.test.js",
        extras: {
          "/index.js": { code: `import './starter.js';`, hidden: true },
        },
      };
    case "vanilla-ts":
      return {
        starterPath: "/starter.ts",
        testPath: "/starter.test.ts",
        extras: {
          "/index.ts": { code: `import './starter';`, hidden: true },
        },
      };
    case "node":
      return {
        starterPath: "/starter.js",
        testPath: "/starter.test.js",
        extras: {
          "/index.js": { code: `import './starter.js';`, hidden: true },
        },
      };
    case "react":
      return {
        starterPath: "/Starter.jsx",
        testPath: "/Starter.test.jsx",
        extras: {
          "/App.js": {
            code: `import Starter from './Starter.jsx';\nexport default function App() { return <Starter />; }`,
            hidden: true,
          },
        },
      };
    case "react-ts":
      return {
        starterPath: "/Starter.tsx",
        testPath: "/Starter.test.tsx",
        extras: {
          "/App.tsx": {
            code: `import Starter from './Starter';\nexport default function App() { return <Starter />; }`,
            hidden: true,
          },
        },
      };
  }
}

type AiAction = "hint" | "review" | "explain";

const ACTION_LABELS: Record<AiAction, string> = {
  hint: "Hint",
  review: "Review my code",
  explain: "Explain the concept",
};

function AiPanel({ problem }: { problem: string }) {
  const { sandpack } = useSandpack();
  const [response, setResponse] = useState("");
  const [loading, setLoading] = useState<AiAction | null>(null);
  const [open, setOpen] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  // Cancel any in-flight request when the component unmounts (e.g. user
  // navigates away mid-stream).
  useEffect(() => {
    return () => {
      abortRef.current?.abort();
      abortRef.current = null;
    };
  }, []);

  function close() {
    // Closing means "I don't want this answer" — abort, clear loading state,
    // wipe the buffered response so reopening doesn't flash stale text.
    abortRef.current?.abort();
    abortRef.current = null;
    setOpen(false);
    setLoading(null);
    setResponse("");
  }

  async function ask(action: AiAction) {
    // Cancel any previous in-flight request before starting a new one.
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    const activeCode = sandpack.files[sandpack.activeFile]?.code ?? "";
    setLoading(action);
    setOpen(true);
    setResponse("");

    try {
      const res = await fetch("/api/ai/exercise", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, code: activeCode, problem }),
        signal: controller.signal,
      });

      if (!res.ok || !res.body) {
        const err = await res.text().catch(() => "");
        if (!controller.signal.aborted) {
          setResponse(`Error: ${err || res.statusText}`);
        }
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";

      while (true) {
        if (controller.signal.aborted) {
          await reader.cancel().catch(() => {});
          return;
        }
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const chunk = JSON.parse(line);
            const token: string = chunk?.message?.content ?? "";
            if (token && !controller.signal.aborted) {
              setResponse((prev) => prev + token);
            }
          } catch {
            // skip malformed lines
          }
        }
      }
    } catch (e) {
      // Aborted requests are expected when the user closes the panel — don't
      // surface them as errors.
      if (controller.signal.aborted) return;
      setResponse(
        `Failed to reach Ollama: ${e instanceof Error ? e.message : String(e)}`,
      );
    } finally {
      if (abortRef.current === controller) {
        abortRef.current = null;
      }
      // Only clear loading if this request is still the active one. (If the
      // user already started another action, that action owns `loading`.)
      setLoading((prev) => (prev === action ? null : prev));
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {(["hint", "review", "explain"] as AiAction[]).map((action) => (
          <button
            key={action}
            type="button"
            disabled={loading !== null}
            onClick={() => ask(action)}
            className="rounded border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted disabled:opacity-50"
          >
            {loading === action ? "..." : ACTION_LABELS[action]}
          </button>
        ))}
      </div>

      {open && (
        <div className="relative rounded-lg border border-border bg-card p-4 text-sm">
          <button
            type="button"
            aria-label="Close AI response"
            onClick={close}
            className="absolute right-3 top-3 text-xs text-muted-foreground hover:text-foreground"
          >
            ✕
          </button>
          <pre className="whitespace-pre-wrap font-sans leading-relaxed">
            {response || (loading ? "Thinking…" : "")}
          </pre>
        </div>
      )}
    </div>
  );
}

export function ExerciseSandbox({
  starter,
  tests,
  solution,
  template = "vanilla",
  problem = "",
}: Props) {
  const [showSolution, setShowSolution] = useState(false);
  const shape = fileShapeForTemplate(template);

  const files: SandpackFiles = {
    [shape.starterPath]: { code: starter, active: true },
    [shape.testPath]: { code: tests, hidden: true },
    ...(shape.extras ?? {}),
  };

  return (
    <div className="space-y-4">
      <SandpackProvider template={template} theme="dark" files={files}>
        <SandpackLayout>
          <SandpackCodeEditor
            showLineNumbers
            showInlineErrors
            wrapContent
            style={{ height: "480px" }}
          />
          <SandpackTests
            verbose
            watchMode
            style={{ height: "480px" }}
          />
        </SandpackLayout>

        {problem && <AiPanel problem={problem} />}
      </SandpackProvider>

      <details
        className="rounded-lg border border-border bg-card"
        open={showSolution}
        onToggle={(e) => setShowSolution(e.currentTarget.open)}
      >
        <summary className="cursor-pointer list-none px-4 py-3 text-sm font-medium select-none">
          {showSolution ? "▼" : "▶"} Reveal reference solution{" "}
          <span className="text-muted-foreground">
            (try it yourself first!)
          </span>
        </summary>
        <pre className="overflow-x-auto border-t border-border bg-zinc-950 p-4 text-sm text-zinc-100">
          <code>{solution}</code>
        </pre>
      </details>
    </div>
  );
}
