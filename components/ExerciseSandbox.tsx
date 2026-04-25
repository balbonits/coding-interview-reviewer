"use client";

import { useState } from "react";
import {
  SandpackProvider,
  SandpackLayout,
  SandpackCodeEditor,
  SandpackTests,
  type SandpackFiles,
} from "@codesandbox/sandpack-react";
import type { SandpackTemplate } from "@/lib/exercises";

type Props = {
  starter: string;
  tests: string;
  solution: string;
  template?: SandpackTemplate;
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

export function ExerciseSandbox({
  starter,
  tests,
  solution,
  template = "vanilla",
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
