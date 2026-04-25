<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Project: Coding Interview Reviewer

Personal front-end interview prep workspace for John (the user). Built day 1 as local-only MVP. Long-term goal: deploy as a public portfolio piece.

## Stack

- **Next.js 16.2.4** (App Router, Turbopack), **React 19.2.4**, **TypeScript**
- **Tailwind v4** (config in CSS, `@import "tailwindcss"`) + **shadcn/ui** (in `components/ui/`)
- **MDX** via `next-mdx-remote/rsc` + `gray-matter` + `rehype-prism-plus` (Prism Tomorrow theme)
- **Sandpack** (`@codesandbox/sandpack-react`) for in-browser code exercises
- **Ollama** at `localhost:11434` for AI (model: `qwen2.5:14b`); lightweight `fetch` wrapper in `lib/ollama.ts`
- **localStorage** for state (interview transcripts, exercise progress) — Day 2 will swap to Firestore

## Three core features

1. **`/exercises`** — Sandpack-powered in-browser coding exercises with auto-graded tests + reveal solution
2. **`/notes`** — MDX-driven note library with tag filtering at `/tags/[tag]` (notes + exercises share a tag taxonomy)
3. **`/interview`** — Streaming chat with local LLM that role-plays a JS interviewer; transcripts in localStorage

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

## Day 2+ priorities (in user's stated order of urgency)

1. **Subject coverage expansion** — user wants exercises + notes spanning: DSA, React, TypeScript, RESTful APIs, microservices/microfrontend, JS/ECMAScript core, Node.js/server-side, MongoDB, UX/UI design, SEO, modern HTML, modern CSS.
   - **Day 1 seeded** (3 exercises, 6 notes): two-sum, fizzbuzz, debounce; closures, React 19 hooks, TS modern, modern CSS/HTML/JS.
   - **Day 2 seeded so far** (3 exercises, 6 notes): resilient-fetch (REST), mongo-query-matcher (Mongo), rate-limiter (Node); rest-apis, mongodb, node-server-side, seo, ux-ui, microservices-microfrontend.
   - **Still gaps**: React (component / hooks exercise), TypeScript (type-puzzle exercise — needs `vanilla-ts` template), more DSA depth (linked list, tree, LRU). Sandpack template support is in place; just need authoring time.
2. ~~**Sandpack template support**~~ ✓ Done — `template` field in `meta.json` supports `vanilla`, `vanilla-ts`, `react`, `react-ts`, `node`. See "Exercises" section above for file conventions per template.
3. **Manual dark mode toggle** — currently using shadcn's class-based dark variant but no toggle; will need a client component + localStorage persistence
4. **Deploy to Vercel** — env vars (Ollama won't be reachable from Vercel — Day 2 needs cloud LLM strategy: probably free Gemini tier or Anthropic API once user is employed)
5. **Firebase Auth + Firestore** — Google + GitHub SSO, allowlist UID, swap localStorage → Firestore
6. **AI side-features using existing deepseek-coder-v2 model** — chatbot, "Explain this" on code blocks, "Hint" + "Review my code" on exercises, "Grade my solution"
7. **Spaced repetition** — daily review queue with SM-2 lite scheduler over notes & exercises
8. **News feed** — RSS in, locally-summarized, tag-threaded
9. **Quick capture form** — mobile-friendly authoring (writes to Firestore, "promote to repo" action)

## Important context about the user

- **Currently unemployed** — already pays $200/mo for Claude Max; cannot afford additional paid services. Default to free tools (Ollama, Gemini free tier, Vercel free tier).
- **Front-end interview candidate** — building this as both prep tool AND portfolio piece. Quality of code and content matters for portfolio signal.
- **HTML/CSS/JS knowledge from 2008** — needs current best practices in notes (handled in 3 "modern X" notes already shipped).
- **Do not skip the local-only constraint** until user explicitly asks to deploy.

## Planning artifacts

The full Day 1 plan is in `~/.claude/plans/i-need-help-in-shiny-sunset.md`. Read it before changing architecture. The plan reflects user-approved decisions (stack, three cores, working method).

## Working method

Spec-driven, front-to-back. Day 1 specs are inline in the plan file (compressed for the time budget). Day 2+ specs should live in `/specs/<phase>-<feature>.md` with: user stories, UI sketch, state matrix, TypeScript data contract, acceptance criteria, out-of-scope.
