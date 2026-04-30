<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.

# Trigger phrases (for agents)

When the user says any of these, run the matching command immediately. No need to ask — these are pre-authorized.

| User says… | Run | Notes |
|---|---|---|
| "restart dev" / "restart the dev server" | `npm run restart` | Full smart restart. Best run in background; tell user to check :3000 in ~10s. |
| "restart dev status" / "what's running?" | `npm run restart:status` | Read-only status report. Run in foreground, summarize results. |
| "restart [searxng / mongo / ollama / next]" | `bash scripts/restart-dev.sh <service>` | Restart just that one. |

The restart sequence is designed for the laptop-sleep-recovery case: Docker containers go stale, file watchers desync, etc. See `scripts/restart-dev.sh` for the full logic.
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

## 5. Optional — SearXNG for on-demand web search

The floating study assistant can call a local SearXNG instance when you ask it to search, verify, or cite sources. SearXNG is a free, open-source metasearch aggregator that runs in Docker. **Skip this step if you don't want web search** — the rest of the app works fine without it.

**The good news: `npm run dev:local` handles everything automatically** if Docker is installed. It will:
1. Start Docker Desktop if not running (macOS / systemd Linux)
2. Create the SearXNG container on first run (pulls ~150 MB image)
3. Start the existing container on later runs
4. Skip with a warning if Docker isn't installed

So all you need is:
```bash
# Install Docker Desktop once: https://www.docker.com/products/docker-desktop/
# Then just run as usual:
npm run dev:local
```

Manual control if you want it:
```bash
# Health check:
curl -sf http://localhost:8888/healthz && echo "ok"

# Stop / start without restarting the whole dev server:
docker stop searxng
docker start searxng

# Nuke and recreate (e.g. after editing searxng/settings.yml):
docker rm -f searxng
# next `npm run dev:local` will recreate it from the fresh config
```

If SearXNG isn't running, the assistant gracefully falls back to "answering from training data only" with an inline notice. No errors, no broken UI.

## 6. Start the app
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
- Sessions stored in MongoDB (`interview_sessions`) via `lib/interviewSessions.ts` (typed CRUD over `/api/sessions`).
- Per-track interviewer prompts live in `INTERVIEW_TRACKS` (`lib/interviewSessions.ts`); the active prompt is built by `buildSystemPrompt(track, context)`.

**Tracks**

Built-in tracks: `javascript`, `dsa`, `react`, `typescript`, `html-css`, `system-design`, `general`. Each has a fixed `systemPrompt` that anchors the topic surface area.

The `custom` track is different — it takes user-supplied context (`{ roleTitle, companyName, jobDescription, notes }`) and renders a templated interviewer prompt that simulates an actual interview for that specific role: small-talk warm-up, 4–6 questions weighted by the JD, behavioral close, candidate-questions wrap. Created from a form at `/interview` (paste a JD, hit Start).

**Voice (Web Speech API)**

The session page uses `lib/speech.ts` to wire the Web Speech API for both directions:
- `🎤 Speak` button (`SpeechRecognition`) dictates into the answer textarea with live interim transcripts. Final phrases get appended to the existing input.
- Per-message speaker icons + a header `🔊 Auto-speak` toggle (`SpeechSynthesis`) read the interviewer aloud. Auto-speak preference is persisted in `localStorage` (`interview.autoSpeak`).
- Both are feature-detected — buttons hide if the browser lacks support. Chrome/Edge ship both; Safari has TTS but not STT; Firefox has neither.
- `stripForSpeech()` removes Markdown punctuation and code-block contents before TTS so it doesn't read backticks/asterisks aloud.

**Mermaid diagrams**

Fenced ` ```mermaid ` blocks in interviewer / floating-chat output render inline as SVG via `components/MermaidBlock.tsx` (dynamic import of `mermaid`, dark-mode-reactive via `MutationObserver`, error fallback shows source). System prompts give the model permission to draw flowchart / sequenceDiagram / erDiagram when a visual would clarify.

**Chat controls (Claude-style)**

Each message has a hover-revealed action toolbar below the bubble: copy-as-Markdown, speak/stop (assistant only), regenerate (latest assistant turn only). Header has an `Export` button that downloads the full transcript as `.md` with track + role context, JD, and turn-by-turn `**Interviewer:** / **You:**` blocks.

**Save to Notes**

Click `Save to Notes` (header) → server fetches the session, calls Ollama with a summarizer system prompt, and stores the AI-generated study note in MongoDB (`interview_notes`). 1:1 pairing — the note's `_id` and `id` equal the session id, so re-saving updates the existing note instead of creating duplicates. Chat input is locked while the note is being generated to avoid two concurrent Ollama requests fighting for the model.

Notes live at `/notes/saved/[id]` and surface in a `From your mock interviews` section on the `/notes` index. Schema: `{ id, sessionId, title, track, context?, tags, content, createdAt, updatedAt? }`. Title and tags are parsed from the AI output (`# Title` heading + `**Tags:**` line).

**Env vars (memory caps):**
- `OLLAMA_INTERVIEW_MODEL` — default `qwen2.5:14b` (Q4_K_M ≈ 9 GB resident). Used by the streaming interviewer, Save-to-Notes summarizer, and the Quiz generator.
- `OLLAMA_URL` — default `http://localhost:11434`.
- `OLLAMA_NUM_CTX` — default `4096`. Lower this if you need to shrink the KV cache further.
- `OLLAMA_NOTES_NUM_CTX` — default `8192`. The summarizer needs to fit the whole transcript, so it gets a bigger window.
- `OLLAMA_QUIZ_NUM_CTX` — default `8192`. Same reasoning for quiz generation when sourcing from notes / exercises.
- Recommend setting `OLLAMA_MAX_LOADED_MODELS=1` in your shell so two models can't co-load. `keep_alive` is hard-coded to `2m` in `lib/ollama.ts` so the model unloads quickly when idle.

### Quiz feature (`/quiz`)

Drill-mode practice page. Users pick a topic prompt or a saved interview note as the source, the local AI generates a small batch of questions, and the user works through them one at a time with immediate per-question feedback.

**Question types:**
- `mcq` — 4 distinct options, one correct, per-option rationale shown after answering.
- `predict-output` — short JS snippet with `console.log`s; user types the expected output; matched against the AI's claimed output (whitespace-normalized).

**Validation pipeline (in `lib/quizGenerator.ts`):**
Every question is validated before the user sees it:
1. Strict JSON parse of the model's output (with fence salvaging for stray ` ```json ` wrappers).
2. Schema validator (`isValidMCQ` / `isValidPredictOutput` in `lib/quiz.ts`) — type, distinct options, `correctIndex` in range, rationale per option, etc.
3. **For predict-output:** the snippet is actually executed in a fresh `vm.runInNewContext` sandbox (1s timeout, captured `console.log`) and the real output is compared to the AI's claimed `expectedOutput`. Mismatch = discarded. This catches the bulk of AI hallucinations.
4. If the validator rejects too many questions, the generator re-prompts up to 3 attempts to top up the batch. If it still falls short the UI tells the user how many were rejected.

**Sources (`QuizSource`):**
- `topic` — free-form prompt (`?source=topic&topic=closures`)
- `interview-note` — pulls from a saved AI study note (`?source=interview-note&id=...`)
- `note` — pulls from an MDX note in `content/notes/` (`?source=note&slug=...`)
- `exercise` — pulls from an exercise's `meta.json` + problem statement (`?source=exercise&slug=...`)

**Quiz me buttons (`components/QuizMeButton.tsx`):**
A universal entry point. Sends the user to `/quiz` with URL params that auto-trigger generation. Wired into:
- Exercise pages, MDX note pages, saved interview-note pages
- Interview session pages (only after a note has been saved — the button uses the note's content as quiz source)

**Persistence:**
- Quizzes themselves are ephemeral (held in client state)
- Each individual answer attempt is POSTed to `/api/quiz/attempts` and saved in MongoDB (`quiz_attempts`) for future analytics / `/review` integration

### Playwright

`@playwright/test` is installed but **not yet wired into anything**. Future plan: a `tutorial` page that uses Playwright in headless mode to capture screenshots of the app in known states for documentation. No E2E tests yet — don't write any unless explicitly asked.

### Web search (SearXNG, on-demand)

The floating study assistant (`/api/ai/chat`) can call out to a local SearXNG container for live web results. Triggering is **intent-driven**: the route runs a regex over the user's last message and only attaches the `web_search` tool when the user explicitly asks (search, look up, verify, cite, "latest X", "as of 2026", etc.).

When triggered:
1. Route checks `isSearchAvailable()` — quick health probe at `${SEARXNG_URL}/healthz`.
2. If reachable → attach the `web_search` tool, call `chatWithTools()` non-streamed. The model emits tool calls; we hit SearXNG's JSON API; results are fed back; model produces a final answer with markdown source links. Status messages (`Searching the web for: "X"…`) are streamed to the client as italic content chunks so the user sees progress.
3. If unreachable → existing streaming path runs as normal, with a one-line notice prepended: *"Web search isn't running locally — answering from training data only."*

The interview chatbot (`/api/ai/interview`) intentionally does **not** have web search wired in — actual interviewers don't browse mid-question, and giving the LLM tools there would break roleplay.

**Env:**
- `SEARXNG_URL` — default `http://localhost:8888`. Override if you run SearXNG on a different port.

**Trigger phrases (tuned in `app/api/ai/chat/route.ts`):** "search online / web", "look it/this up", "verify", "fact-check", "validate your answer", "cite sources", "provide a reference", "where can I read more", "latest / current / recent <X>", "as of 2026", "is that still accurate", "MDN says". Add more by extending `SEARCH_INTENT_PATTERNS`.

## What's shipped

All core features are complete. The app is local-only by design (Ollama can't run in the cloud).

- **`/exercises`** — Sandpack exercises, 5 templates, auto-graded tests, reveal solution, AI hint/review/explain panel, `Quiz me` button that generates a quiz from the exercise content
- **`/notes`** — MDX note library + a `From your mock interviews` section listing AI-generated study notes (`/notes/saved/[id]`), tag filtering, 12 notes across all front-end subjects, `Quiz me` button on every note
- **`/interview`** — Streaming AI mock interviewer with 7 fixed tracks + a `Custom Mock Interview` track that takes a JD and simulates an actual interview for the role. Sessions in MongoDB, Markdown rendering, Mermaid diagrams, Web Speech API voice (both directions), per-message chat controls (copy / regenerate / speak), `.md` transcript export, `Save to Notes` for AI-distilled study notes (1:1 with session), and `Quiz me` once a note has been saved
- **`/quiz`** — AI-generated drill-mode questions (MCQ + predict-output) with full validation pipeline. See *Quiz feature* below.
- **`/review`** — SM-2 spaced repetition queue, MongoDB-backed
- **`/news`** — RSS aggregator (JS Weekly, CSS Weekly, Smashing, Dev.to), per-item AI summarization
- **`/capture`** — Quick capture form, MongoDB persistence, MDX export
- **Floating study assistant** (every page except `/interview`) — Markdown + Mermaid + per-message copy
- **Dark mode** — ThemeToggle component, FOUC-free inline script, localStorage persistence

Content: 15 exercises, 12 notes spanning DSA, React, TypeScript, REST APIs, Node.js, MongoDB, SEO, UX/UI, microservices/MFEs, modern HTML/CSS/JS.

**Deploy is deferred** — blocked on cloud LLM strategy. Do not suggest Vercel or cloud hosting unless the user raises it.
