<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# First-time setup (run this before anything else)

If the user has just cloned this repo, walk through these steps in order. Check each one before moving on — do not assume anything is already installed.

## 1. Node.js
```bash
node --version   # must be ≥ 18
```
If missing: `brew install node` or https://nodejs.org

## 2. Dependencies
```bash
npm install
```

## 3. Ollama
```bash
ollama --version
```
If missing: `brew install ollama` or https://ollama.com/download

Then confirm the required model is pulled:
```bash
ollama list | grep qwen2.5:14b
```
If not listed:
```bash
ollama pull qwen2.5:14b   # ~9 GB — takes a few minutes on first run
```
> The model name can be overridden with `OLLAMA_INTERVIEW_MODEL` env var. `dev.sh` will auto-pull it on first `npm run dev:local` if it's missing.

### Choosing a model based on available RAM

Before pulling, check the user's available RAM:
```bash
# macOS
sysctl -n hw.memsize | awk '{print $1/1024/1024/1024 " GB"}'
```

| Available RAM | Recommended model | Pull command |
|---|---|---|
| ≥ 16 GB | `qwen2.5:14b` (default, best quality) | `ollama pull qwen2.5:14b` |
| 8–16 GB | `qwen2.5:7b` (good quality, ~4.5 GB) | `ollama pull qwen2.5:7b` |
| < 8 GB | `qwen2.5:3b` (lighter, ~2 GB) | `ollama pull qwen2.5:3b` |

If the user picks a smaller model, set it in their shell or `.env.local`:
```bash
OLLAMA_INTERVIEW_MODEL=qwen2.5:7b npm run dev:local
# or add to .env.local:
# OLLAMA_INTERVIEW_MODEL=qwen2.5:7b
```

**Warning signs that the model is too large:** system becomes unresponsive while the model loads, responses are extremely slow (> 60s for first token), or `ollama serve` logs show swap usage. If any of these occur, recommend switching to a smaller model.

## 4. MongoDB
```bash
mongod --version
```
If missing:
```bash
brew tap mongodb/brew && brew install mongodb-community
```

## 5. Start the app
```bash
npm run dev:local
```
This runs `scripts/dev.sh` which: starts Ollama if not running → auto-pulls the model if not present → starts MongoDB if not running → runs `next dev`.

Open http://localhost:3000 — all features should work immediately. No `.env` file needed.

---

# Project: Coding Interview Reviewer

Personal front-end interview prep workspace for John (the user). Built day 1 as local-only MVP. Long-term goal: deploy as a public portfolio piece.

## Stack

- **Next.js 16.2.4** (App Router, Turbopack), **React 19.2.4**, **TypeScript**
- **Tailwind v4** (config in CSS, `@import "tailwindcss"`) + **shadcn/ui** (in `components/ui/`)
- **MDX** via `next-mdx-remote/rsc` + `gray-matter` + `rehype-prism-plus` (Prism Tomorrow theme)
- **Sandpack** (`@codesandbox/sandpack-react`) for in-browser code exercises
- **Ollama** at `localhost:11434` for AI (model: `qwen2.5:14b`); lightweight `fetch` wrapper in `lib/ollama.ts`
- **MongoDB** at `localhost:27017` (db: `coding-interview-reviewer`); connection singleton in `lib/mongodb.ts` — replaces localStorage for all persistent state

## Three core features

1. **`/exercises`** — Sandpack-powered in-browser coding exercises with auto-graded tests + reveal solution
2. **`/notes`** — MDX-driven note library with tag filtering at `/tags/[tag]` (notes + exercises share a tag taxonomy)
3. **`/interview`** — Streaming chat with local LLM that role-plays a JS interviewer; transcripts in MongoDB (`interview_sessions` collection)

## Content authoring conventions

### Notes — `content/notes/<slug>.mdx`

Single MDX file per note with frontmatter:

```yaml
---
title: "..."
tags: ["javascript", "react", ...]
related: ["..."]   # optional
---
```

Body is Markdown + JSX. Code blocks get Prism syntax highlighting. Custom MDX components live in `components/MdxComponents.tsx`.

### Exercises — `content/exercises/<slug>/`

Folder per exercise with 5 files:

- `meta.json` — `{ slug, title, tags, difficulty, estimatedMinutes, concepts, template? }`
- `problem.mdx` — frontmatter (`title`) + Markdown problem statement
- `starter.{ext}` — initial editor code (must export the symbol(s) under test)
- `solution.{ext}` — reference solution (revealed via `<details>` after attempt)
- `tests.{ext}` — Vitest/Jest-style assertions; imports from `./starter` (or `./Starter` for React templates)

**`template` field** in `meta.json` controls Sandpack template + file extension. Defaults to `"vanilla"` if omitted. Supported templates and file extensions:

| `template` value | File ext | Sandpack-loaded paths | Notes |
|---|---|---|---|
| `"vanilla"` (default) | `.js` | `/starter.js`, `/starter.test.js` | Plain JS, no DOM scaffolding |
| `"vanilla-ts"` | `.ts` | `/starter.ts`, `/starter.test.ts` | TypeScript, type-checked in browser |
| `"node"` | `.js` | `/starter.js`, `/starter.test.js` | Node-flavored runtime (process, Buffer, etc.) |
| `"react"` | `.jsx` | `/Starter.jsx`, `/Starter.test.jsx` | Default-export the component as `Starter` |
| `"react-ts"` | `.tsx` | `/Starter.tsx`, `/Starter.test.tsx` | Same as `react` with TS |

Mapping lives in `lib/exercises.ts` (`TEMPLATE_EXT`) and `components/ExerciseSandbox.tsx` (`fileShapeForTemplate`). Add a new template by extending both.

### AI interviewer

- Server route: `app/api/ai/interview/route.ts` — POSTs to Ollama, streams NDJSON back to client. Trims oldest messages to keep within ~75% of the configured `num_ctx` (cheap char-based estimator).
- Client: `app/interview/[sessionId]/page.tsx` — parses NDJSON line-by-line and renders progressively.
- Sessions stored in `localStorage` via `lib/interviewSessions.ts` (typed CRUD).
- System prompt is hardcoded in the route handler.

**Env vars (memory caps):**
- `OLLAMA_INTERVIEW_MODEL` — default `qwen2.5:14b` (Q4_K_M ≈ 9 GB resident).
- `OLLAMA_URL` — default `http://localhost:11434`.
- `OLLAMA_NUM_CTX` — default `4096`. Lower this if you need to shrink the KV cache further.
- Recommend setting `OLLAMA_MAX_LOADED_MODELS=1` in your shell so two models can't co-load. `keep_alive` is hard-coded to `2m` in `lib/ollama.ts` so the model unloads quickly when idle.

## What's shipped

All core features are complete. The app is local-only by design (Ollama can't run in the cloud).

- **`/exercises`** — Sandpack exercises, 5 templates, auto-graded tests, reveal solution, AI hint/review/explain panel
- **`/notes`** — MDX note library, tag filtering, 12 notes across all front-end subjects
- **`/interview`** — Streaming AI mock interviewer, sessions in MongoDB, Markdown rendering
- **`/review`** — SM-2 spaced repetition queue, MongoDB-backed
- **`/news`** — RSS aggregator (JS Weekly, CSS Weekly, Smashing, Dev.to), per-item AI summarization
- **`/capture`** — Quick capture form, MongoDB persistence, MDX export
- **Dark mode** — ThemeToggle component, FOUC-free inline script, localStorage persistence

Content: 15 exercises, 12 notes spanning DSA, React, TypeScript, REST APIs, Node.js, MongoDB, SEO, UX/UI, microservices/MFEs, modern HTML/CSS/JS.

**Deploy is deferred** — blocked on cloud LLM strategy. Do not suggest Vercel or cloud hosting unless the user raises it.
