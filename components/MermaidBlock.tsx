"use client";

import { useEffect, useId, useRef, useState } from "react";

type RenderState =
  | { kind: "idle" }
  | { kind: "ready"; svg: string }
  | { kind: "error"; message: string };

/**
 * Renders a Mermaid diagram from a fenced ```mermaid block. Mermaid is
 * dynamically imported on first use so it doesn't bloat the initial bundle.
 * If the source fails to parse (common while a streaming LLM is mid-output),
 * we fall back to showing the raw source.
 */
export function MermaidBlock({ source }: { source: string }) {
  const reactId = useId().replace(/[^a-zA-Z0-9]/g, "");
  const [state, setState] = useState<RenderState>({ kind: "idle" });
  const [themeKey, setThemeKey] = useState(0);
  const counter = useRef(0);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const obs = new MutationObserver(() => setThemeKey((k) => k + 1));
    obs.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    let cancelled = false;
    const run = counter.current + 1;
    counter.current = run;

    async function render() {
      try {
        const { default: mermaid } = await import("mermaid");
        if (cancelled || run !== counter.current) return;
        const isDark = document.documentElement.classList.contains("dark");
        mermaid.initialize({
          startOnLoad: false,
          securityLevel: "strict",
          theme: isDark ? "dark" : "default",
          fontFamily: "inherit",
          flowchart: { useMaxWidth: true },
          sequence: { useMaxWidth: true },
        });
        const renderId = `mmd-${reactId}-${run}`;
        const { svg } = await mermaid.render(renderId, source);
        if (cancelled || run !== counter.current) return;
        setState({ kind: "ready", svg });
      } catch (e) {
        if (cancelled || run !== counter.current) return;
        const message = e instanceof Error ? e.message : "render failed";
        setState({ kind: "error", message });
      }
    }

    void render();
    return () => {
      cancelled = true;
    };
  }, [source, reactId, themeKey]);

  if (state.kind === "ready") {
    return (
      <div
        className="my-3 flex justify-center overflow-x-auto rounded-md border border-border bg-card p-3 [&>svg]:max-w-full [&>svg]:h-auto"
        dangerouslySetInnerHTML={{ __html: state.svg }}
      />
    );
  }

  if (state.kind === "error") {
    return (
      <details className="my-2 rounded-md border border-destructive/50 bg-destructive/10 p-2 text-xs">
        <summary className="cursor-pointer text-destructive">
          Diagram failed to render — click to view source
        </summary>
        <pre className="mt-2 overflow-x-auto whitespace-pre-wrap font-mono">
          {source}
        </pre>
        <p className="mt-1 text-destructive/80">{state.message}</p>
      </details>
    );
  }

  return (
    <pre className="my-2 overflow-x-auto rounded bg-muted/60 p-2 text-xs font-mono opacity-60">
      {source}
    </pre>
  );
}
