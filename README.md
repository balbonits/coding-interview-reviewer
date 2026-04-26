# Coding Interview Reviewer

A personal front-end interview prep workspace — built entirely with AI (Claude Code + Claude Sonnet). Live coding exercises, review notes, an AI mock interviewer, spaced repetition, a tech news feed, and a quick capture form. Runs fully local: no cloud services, no subscriptions beyond what you already have.

> **Built with AI, not boilerplate.** Every feature, exercise, note, and architectural decision in this project was generated through a conversation with Claude Code. This is a real working app, not a demo.

---

## Features

### `/exercises` — In-browser coding exercises
- Live code editor powered by [Sandpack](https://sandpack.codesandbox.io/) (real browser runtime, no backend)
- Auto-graded tests that run in the browser as you type
- Reveal solution with a toggle
- AI panel: **Hint**, **Review my code**, **Explain the concept** — reads your live code and streams a response from the local LLM
- 5 template types: `vanilla` JS, `vanilla-ts` TypeScript, `react` JSX, `react-ts` TSX, `node`

### `/notes` — MDX note library
- Markdown + JSX notes with Prism syntax highlighting
- Tag filtering at `/tags/[tag]`
- 12 notes covering: closures, React 19 hooks, TypeScript, REST APIs, MongoDB, Node.js, SEO, UX/UI, microservices/MFEs, modern HTML, CSS, and JavaScript

### `/interview` — AI mock interviewer
- Streaming chat with a local LLM role-playing a senior front-end engineer
- Asks one question at a time, follows up on weak answers, varies question style (conceptual, trade-off, debugging, coding)
- Full session history persisted to MongoDB — resumable
- Markdown rendering in responses (bold, lists, code blocks)
- Context window trimming to stay within the model's token budget

### `/review` — Spaced repetition
- SM-2 algorithm: **Again / Hard / Good / Easy** grading
- Due-today queue, seeded from your exercise library
- Review items and grades persisted to MongoDB

### `/news` — Tech news feed
- Aggregates RSS from: JavaScript Weekly, CSS Weekly, Smashing Magazine, Dev.to
- Per-item AI summarization (streams from local LLM)
- 1-hour client-side cache

### `/capture` — Quick capture
- Paste a snippet, URL, or thought — saves to MongoDB
- Download any capture as an `.mdx` file ready to drop into `/content/notes`

---

## Exercises (15 total)

| Exercise | Topic | Template |
|---|---|---|
| Two Sum | DSA — hash map | vanilla |
| FizzBuzz | DSA — basics | vanilla |
| Debounce | JS patterns | vanilla |
| Linked List | DSA — doubly linked list + reverse | vanilla-ts |
| Tree Traversal | DSA — pre/in/post/level order | vanilla-ts |
| LRU Cache | DSA — Map insertion-order trick | vanilla-ts |
| Resilient Fetch | REST — retry + timeout | vanilla |
| Mongo Query Matcher | MongoDB — predicate engine | vanilla |
| Rate Limiter | Node.js — sliding window | vanilla |
| Type-Safe Pick | TypeScript — generics | vanilla-ts |
| SEO Meta Tags | SEO — OG/Twitter/JSON-LD builder | vanilla-ts |
| MFE Registry | Microfrontends — prefix router | vanilla-ts |
| use-toggle | React — custom hook | react |
| a11y Refactor | Accessibility — WCAG / ARIA | react |

---

## Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16.2.4 (App Router, Turbopack) |
| UI | React 19.2.4, TypeScript, Tailwind v4, shadcn/ui |
| Content | MDX via `next-mdx-remote/rsc`, `gray-matter`, `rehype-prism-plus` |
| Code editor | `@codesandbox/sandpack-react` |
| AI | [Ollama](https://ollama.com) at `localhost:11434`, model `qwen2.5:14b` |
| Database | MongoDB at `localhost:27017` (Node.js driver, singleton connection) |
| Markdown | `react-markdown` (chat), Prism Tomorrow theme (notes/exercises) |

---

## Prerequisites

- **Node.js** ≥ 18
- **MongoDB** — `brew tap mongodb/brew && brew install mongodb-community`
- **Ollama** — [ollama.com/download](https://ollama.com/download), then pull a model based on your RAM:

  | RAM | Model | Command |
  |---|---|---|
  | ≥ 16 GB | `qwen2.5:14b` (default, best quality) | `ollama pull qwen2.5:14b` |
  | 8–16 GB | `qwen2.5:7b` | `ollama pull qwen2.5:7b` |
  | < 8 GB | `qwen2.5:3b` | `ollama pull qwen2.5:3b` |

  If you use a smaller model, set `OLLAMA_INTERVIEW_MODEL=qwen2.5:7b` in `.env.local`. The startup script will warn you and pause before pulling the 14B model on a low-memory machine.

---

## Getting started

```bash
git clone https://github.com/balbonits/coding-interview-reviewer.git
cd coding-interview-reviewer
npm install
npm run dev:local   # starts Ollama + MongoDB + Next.js in one command
```

Open [http://localhost:3000](http://localhost:3000).

`npm run dev:local` uses `scripts/dev.sh` which:
1. Checks if `ollama` is running — starts it if not
2. Checks if `mongod` is running — starts it via Homebrew service or direct binary if not
3. Runs `next dev`

---

## Environment variables

All have sensible defaults — no `.env` file required to get started.

| Variable | Default | Description |
|---|---|---|
| `MONGODB_URI` | `mongodb://localhost:27017` | MongoDB connection string |
| `MONGODB_DB` | `coding-interview-reviewer` | Database name |
| `OLLAMA_URL` | `http://localhost:11434` | Ollama base URL |
| `OLLAMA_INTERVIEW_MODEL` | `qwen2.5:14b` | Model for the interview chatbot |
| `OLLAMA_NUM_CTX` | `4096` | Context window size (tokens) |

For memory-constrained machines, set `OLLAMA_MAX_LOADED_MODELS=1` in your shell to prevent two models from co-loading.

---

## Project structure

```
app/
  interview/          # AI mock interviewer (streaming chat)
  exercises/          # Exercise browser + Sandpack runner
  notes/              # MDX note library
  review/             # Spaced repetition queue
  news/               # RSS tech news feed
  capture/            # Quick capture form
  api/
    ai/interview/     # Streams chat from Ollama
    ai/exercise/      # Hint / review / explain for exercises
    sessions/         # CRUD for interview sessions (MongoDB)
    review-items/     # CRUD for SRS items (MongoDB)
    captures/         # CRUD for captures (MongoDB)
    news/             # RSS aggregator

content/
  exercises/<slug>/   # meta.json, problem.mdx, starter, solution, tests
  notes/<slug>.mdx    # frontmatter (title, tags) + Markdown body

lib/
  mongodb.ts          # Connection singleton
  ollama.ts           # streamChat() wrapper
  spaced-repetition.ts # SM-2 algorithm
  rss.ts              # RSS/Atom parser + feed list
  exercises.ts        # Exercise loader
  captures.ts         # Capture helpers
  interviewSessions.ts # Session API client

components/
  ExerciseSandbox.tsx # Sandpack + AI panel
  ReviewQueue.tsx     # SRS grading UI
  NewsFeed.tsx        # News + summarization UI
  CaptureForm.tsx     # Quick capture UI
  ThemeToggle.tsx     # Dark/light mode toggle
  ui/                 # shadcn/ui primitives
```

---

## Adding content

**New note** — create `content/notes/<slug>.mdx`:
```yaml
---
title: "Your Title"
tags: ["javascript", "react"]
---
```

**New exercise** — create `content/exercises/<slug>/` with 5 files:
- `meta.json` — `{ slug, title, tags, difficulty, estimatedMinutes, concepts, template }`
- `problem.mdx` — problem statement
- `starter.{js|ts|jsx|tsx}` — initial editor code
- `solution.{js|ts|jsx|tsx}` — reference solution
- `tests.{js|ts|jsx|tsx}` — Vitest-style assertions

---

## About

Built as a portfolio piece and personal prep tool by [John Dilig](https://github.com/balbonits). Every line of code was written in collaboration with [Claude Code](https://claude.ai/code) (Anthropic) — from architecture decisions to debugging obscure Next.js fetch caching behavior. The goal was to see how far a single person with AI assistance could get in a few days of focused work.
