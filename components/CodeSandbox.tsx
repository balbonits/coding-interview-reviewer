"use client";

import { useMemo, useState, useTransition } from "react";
import {
  SandpackProvider,
  SandpackLayout,
  SandpackCodeEditor,
  SandpackPreview,
  SandpackConsole,
  SandpackFileExplorer,
  useSandpack,
  type SandpackFiles,
} from "@codesandbox/sandpack-react";
import { Button } from "@/components/ui/button";
import type { SandpackTemplate } from "@/lib/exercises";

export type SubmittedFile = { path: string; code: string };

type Props = {
  template?: SandpackTemplate;
  allowTemplateChange?: boolean;
  initialFiles?: SandpackFiles;
  onSubmit?: (files: SubmittedFile[], template: SandpackTemplate) => void;
  onCancel?: () => void;
  submitLabel?: string;
  cancelLabel?: string;
  height?: number;
};

const TEMPLATE_OPTIONS: { value: SandpackTemplate; label: string }[] = [
  { value: "vanilla", label: "JS" },
  { value: "vanilla-ts", label: "TS" },
  { value: "react", label: "React" },
  { value: "react-ts", label: "React TS" },
  { value: "node", label: "Node" },
];

const DEFAULT_FILES: Record<SandpackTemplate, SandpackFiles> = {
  vanilla: {
    "/index.js": {
      code: `// Build a small demo here.\n// Use console.log to show output.\n\nfunction greet(name) {\n  return \`Hello, \${name}!\`;\n}\n\nconsole.log(greet("world"));\n`,
      active: true,
    },
  },
  "vanilla-ts": {
    "/index.ts": {
      code: `// Build a small demo here.\n// Use console.log to show output.\n\nfunction greet(name: string): string {\n  return \`Hello, \${name}!\`;\n}\n\nconsole.log(greet("world"));\n`,
      active: true,
    },
  },
  react: {
    "/App.js": {
      code: `import { useState } from "react";\n\nexport default function App() {\n  const [count, setCount] = useState(0);\n  return (\n    <div style={{ padding: 16, fontFamily: "system-ui" }}>\n      <h1>Demo</h1>\n      <button onClick={() => setCount(count + 1)}>count: {count}</button>\n    </div>\n  );\n}\n`,
      active: true,
    },
  },
  "react-ts": {
    "/App.tsx": {
      code: `import { useState } from "react";\n\nexport default function App() {\n  const [count, setCount] = useState<number>(0);\n  return (\n    <div style={{ padding: 16, fontFamily: "system-ui" }}>\n      <h1>Demo</h1>\n      <button onClick={() => setCount(count + 1)}>count: {count}</button>\n    </div>\n  );\n}\n`,
      active: true,
    },
  },
  node: {
    "/index.js": {
      code: `// Node-flavored demo. console.log is shown below.\n\nfunction greet(name) {\n  return \`Hello, \${name}!\`;\n}\n\nconsole.log(greet("world"));\n`,
      active: true,
    },
  },
};

function isReactTemplate(t: SandpackTemplate) {
  return t === "react" || t === "react-ts";
}

function SubmitBar({
  onSubmit,
  onCancel,
  template,
  submitLabel = "Submit for review",
  cancelLabel = "Cancel",
}: {
  onSubmit?: (files: SubmittedFile[], template: SandpackTemplate) => void;
  onCancel?: () => void;
  template: SandpackTemplate;
  submitLabel?: string;
  cancelLabel?: string;
}) {
  const { sandpack } = useSandpack();

  function handleSubmit() {
    if (!onSubmit) return;
    const files: SubmittedFile[] = Object.entries(sandpack.files)
      .filter(([, f]) => !f.hidden)
      .map(([path, f]) => ({ path, code: f.code }));
    onSubmit(files, template);
  }

  return (
    <div className="flex flex-wrap items-center justify-end gap-2 border-t border-border bg-card px-3 py-2">
      {onCancel && (
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
          {cancelLabel}
        </Button>
      )}
      {onSubmit && (
        <Button type="button" size="sm" onClick={handleSubmit}>
          {submitLabel}
        </Button>
      )}
    </div>
  );
}

export function CodeSandbox({
  template: initialTemplate = "vanilla",
  allowTemplateChange = true,
  initialFiles,
  onSubmit,
  onCancel,
  submitLabel,
  cancelLabel,
  height = 360,
}: Props) {
  const [template, setTemplate] = useState<SandpackTemplate>(initialTemplate);
  const [providerKey, setProviderKey] = useState(0);
  const [isSwitching, startSwitch] = useTransition();

  const files = useMemo<SandpackFiles>(
    () => initialFiles ?? DEFAULT_FILES[template],
    // We intentionally re-derive when template changes so the user gets fresh
    // starter files in the new language, unless caller pinned `initialFiles`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [template, providerKey],
  );

  function switchTemplate(next: SandpackTemplate) {
    if (next === template) return;
    // Marks the Sandpack remount as a transition so the template-picker
    // click stays responsive while the heavy provider rebuild happens.
    startSwitch(() => {
      setTemplate(next);
      setProviderKey((k) => k + 1);
    });
  }

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card">
      {allowTemplateChange && (
        <div className="flex flex-wrap items-center gap-2 border-b border-border bg-muted/30 px-3 py-2 text-xs">
          <span className="text-muted-foreground">Template:</span>
          {TEMPLATE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => switchTemplate(opt.value)}
              disabled={isSwitching}
              className={`rounded px-2 py-0.5 transition-colors disabled:opacity-50 ${
                template === opt.value
                  ? "bg-primary text-primary-foreground"
                  : "border border-border bg-background hover:bg-muted"
              }`}
            >
              {opt.label}
            </button>
          ))}
          {isSwitching && (
            <span className="text-muted-foreground">switching…</span>
          )}
        </div>
      )}

      <SandpackProvider
        key={`${template}-${providerKey}`}
        template={template}
        theme="dark"
        files={files}
      >
        <SandpackLayout>
          <SandpackFileExplorer style={{ height }} />
          <SandpackCodeEditor
            showLineNumbers
            showInlineErrors
            wrapContent
            style={{ height }}
          />
          {isReactTemplate(template) ? (
            <SandpackPreview style={{ height }} showOpenInCodeSandbox={false} />
          ) : (
            <SandpackConsole style={{ height }} />
          )}
        </SandpackLayout>

        <SubmitBar
          onSubmit={onSubmit}
          onCancel={onCancel}
          template={template}
          submitLabel={submitLabel}
          cancelLabel={cancelLabel}
        />
      </SandpackProvider>
    </div>
  );
}
