import { NextRequest } from "next/server";
import {
  chatWithTools,
  streamChat,
  type OllamaMessage,
  type OllamaTool,
} from "@/lib/ollama";
import {
  formatResultsForModel,
  isSearchAvailable,
  webSearch,
} from "@/lib/websearch";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MODEL = process.env.OLLAMA_INTERVIEW_MODEL ?? "qwen2.5:14b";
const NUM_CTX = Number(process.env.OLLAMA_NUM_CTX ?? 4096);
const CHARS_PER_TOKEN = 4;

const WEB_SEARCH_TOOL: OllamaTool = {
  type: "function",
  function: {
    name: "web_search",
    description:
      "Search the web for current information, references, citations, or to verify a claim. Returns up to 5 results with titles, URLs, and snippets. Use when the user asks to search, look something up, verify, fact-check, find references, or asks about recent / current / latest information.",
    parameters: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description:
            "The search query. Be specific. Prefer 4–10 words covering the precise question.",
        },
      },
      required: ["query"],
    },
  },
};

// Patterns that indicate the user explicitly wants the web. If matched, we
// enable the web_search tool and instruct the model to use it. Bias is
// toward over-detection: false positives just mean "tool is available";
// the model can still choose not to call it.
const SEARCH_INTENT_PATTERNS: RegExp[] = [
  // Direct search verbs
  /\bsearch\b/i,
  /\blook\s+up\b/i,
  /\blook\s+(online|on\s+the\s+web|things\s+up)\b/i,
  /\bgoogle\s+(it|this|that|for)\b/i,
  /\bbrowse\s+(the\s+web|online|for)\b/i,

  // Verification / fact-checking
  /\b(verify|fact[\s-]?check|double[\s-]?check)\b/i,
  /\bvalidate\s+(your|this|that)?\s*(answer|claim|response|reply|info|information)\b/i,
  /\bis\s+(this|that|it)\s+still\s+(true|valid|accurate|correct|current|right)\b/i,

  // Sources / citations / references
  /\b(cite|citation|citations|sources?|references?)\b/i,
  /\bprovide\s+(a\s+)?(source|citation|reference|link|url)/i,
  /\bgive\s+me\s+(a\s+)?(source|citation|reference|link|url|some\s+links)/i,
  /\bwith\s+(sources?|references?|citations?|links?)\b/i,
  /\bwhere\s+can\s+i\s+(read|find|learn)\s+more\b/i,
  /\bon\s+the\s+(web|net|internet)\b/i,

  // "Latest" / freshness signals
  /\b(latest|newest|current|currently|recent(ly)?|up[\s-]?to[\s-]?date)\b/i,
  /\bas\s+of\s+(20\d{2}|today|now)\b/i,
  /\bin\s+20\d{2}\b/i,

  // Doc-source name-drops
  /\b(mdn|w3c|whatwg|tc39|caniuse|stackoverflow)\b/i,
];

function detectSearchIntent(text: string): boolean {
  return SEARCH_INTENT_PATTERNS.some((p) => p.test(text));
}

function buildSystemPrompt(
  pageTitle: string,
  pageDescription: string,
  pathname: string,
  toolsEnabled: boolean,
  intentExplicit: boolean,
): string {
  const location = pageTitle
    ? `The user is currently on: **${pageTitle}**${pageDescription ? ` — ${pageDescription}` : ""}.`
    : `The user is browsing the app (path: ${pathname || "/"}).`;

  const today = new Date().toISOString().slice(0, 10);
  const dateLine = `Today's date is ${today}. Your training data has a cutoff well before this. Many things have shipped since — assume the JavaScript / React / web ecosystem has moved on.`;

  const toolsClause = toolsEnabled
    ? `

You have access to a \`web_search\` tool that returns live web results. ${
        intentExplicit
          ? "The user is explicitly asking you to search, verify, cite, or look something up. You MUST call web_search."
          : "Call it when you need current information, citations, or to verify a claim."
      }

CRITICAL — query construction:
- Preserve the user's exact terms (especially version numbers like "React 19", library names, API names). Do NOT silently rewrite "React 19" to "React 18" because your training says React 18 is the latest — that is exactly the kind of mistake the search tool is here to fix.
- If the user mentions a specific version, library, or API, that token must appear in your search query verbatim.

CRITICAL — when search results conflict with your training:
- TRUST the search results. They are current; your training has a cutoff date and is often outdated, especially for fast-moving libraries like React, Next.js, TypeScript, Node, and the web platform.
- If multiple credible sources (especially official docs like react.dev, MDN, the W3C) describe something as released and documented, treat it as released and documented. Report what they say.
- Do NOT hedge with phrases like "as of my last update", "this might be speculative", "this is unconfirmed", "no official release", "this is hypothetical", or "the latest is actually <older version>". If react.dev shows a hook reference page for it, the hook exists.
- It IS appropriate to mention if results are sparse, contradictory, or appear to come from low-quality blogs.

After receiving results, write your answer with markdown links to the sources you actually used. End with a "Sources:" section listing each cited link.`
    : "";

  return `You are a concise study assistant embedded in a front-end interview prep app. You help a job-seeking engineer study JavaScript, TypeScript, React, HTML, CSS, accessibility, performance, and front-end architecture.

${dateLine}

${location}

Guidelines:
- Tailor answers to the current page topic when relevant.
- Keep responses short and direct — this is a study tool, not a lecture.
- Use code examples when they clarify things.
- When a visual would clarify the explanation (architecture, sequence-of-events, data flow, lifecycle, data model), draw a diagram in a fenced \`\`\`mermaid block. Mermaid renders inline as an SVG. Prefer flowchart, sequenceDiagram, erDiagram, classDiagram, or stateDiagram. Keep diagrams small (≤ 10 nodes).
- If asked to quiz or practice, do so with one question at a time.
- Do NOT roleplay as an interviewer — there is a separate mock interviewer in the app for that.${toolsClause}`;
}

type RequestBody = {
  messages: OllamaMessage[];
  pageTitle?: string;
  pageDescription?: string;
  pathname?: string;
};

export async function POST(req: NextRequest) {
  let body: RequestBody;
  try {
    body = (await req.json()) as RequestBody;
  } catch {
    return jsonError(400, "Invalid JSON body");
  }
  if (!body.messages || !Array.isArray(body.messages)) {
    return jsonError(400, "Missing or invalid `messages` array");
  }

  const trimmed = trimToContextBudget(body.messages, NUM_CTX);
  const lastUser = [...trimmed].reverse().find((m) => m.role === "user");
  const intentExplicit = lastUser
    ? detectSearchIntent(lastUser.content)
    : false;

  // Tools are only attached when the user explicitly asks. This keeps the
  // streaming path fast for the 95% of questions that don't need search.
  const wantTools = intentExplicit;
  const searchAvailable = wantTools ? await isSearchAvailable() : false;

  const systemPrompt = buildSystemPrompt(
    body.pageTitle ?? "",
    body.pageDescription ?? "",
    body.pathname ?? "",
    searchAvailable,
    intentExplicit,
  );

  const fullMessages: OllamaMessage[] = [
    { role: "system", content: systemPrompt },
    ...trimmed,
  ];

  if (wantTools && searchAvailable) {
    return streamToolEnabledResponse(fullMessages);
  }

  // No tools — original streaming path.
  try {
    const stream = await streamChat({
      model: MODEL,
      messages: fullMessages,
      numCtx: NUM_CTX,
      keepAlive: "2m",
    });

    // If user wanted search but SearXNG was down, prepend a notice chunk.
    if (wantTools && !searchAvailable) {
      const reader = stream.getReader();
      const encoder = new TextEncoder();
      const notice = JSON.stringify({
        message: {
          content:
            "_(Web search isn't running locally — answering from training data only. To enable, start SearXNG: see AGENTS.md.)_\n\n",
        },
      });
      const wrapped = new ReadableStream<Uint8Array>({
        async start(controller) {
          controller.enqueue(encoder.encode(notice + "\n"));
          while (true) {
            const { value, done } = await reader.read();
            if (done) break;
            controller.enqueue(value);
          }
          controller.close();
        },
      });
      return new Response(wrapped, {
        headers: ndjsonHeaders(),
      });
    }

    return new Response(stream, { headers: ndjsonHeaders() });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return jsonError(502, `Ollama upstream error: ${msg}`);
  }
}

/**
 * Run the tool-calling loop and stream status updates + the final answer to
 * the client as NDJSON chunks. The client appends each chunk's content to
 * the running assistant message, so the user sees: status → status → answer.
 */
function streamToolEnabledResponse(
  messages: OllamaMessage[],
): Response {
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const enqueue = (content: string) => {
        controller.enqueue(
          encoder.encode(JSON.stringify({ message: { content } }) + "\n"),
        );
      };

      try {
        const final = await chatWithTools({
          model: MODEL,
          messages,
          tools: [WEB_SEARCH_TOOL],
          numCtx: NUM_CTX,
          keepAlive: "2m",
          maxIterations: 3,
          onStatus: (msg) => {
            // Render status updates as italic markdown so they're visually
            // distinct from the final answer.
            enqueue(`_${msg}_\n\n`);
          },
          handler: async (name, args) => {
            if (name === "web_search") {
              const query = String(args.query ?? "").trim();
              if (!query) return "Empty query.";
              try {
                const results = await webSearch(query, 5);
                return formatResultsForModel(results);
              } catch (e) {
                return `Search failed: ${e instanceof Error ? e.message : String(e)}`;
              }
            }
            return `Unknown tool: ${name}`;
          },
        });
        enqueue(final);
      } catch (e) {
        enqueue(
          `\n\n_(Web-search-mode error: ${
            e instanceof Error ? e.message : String(e)
          })_`,
        );
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, { headers: ndjsonHeaders() });
}

function ndjsonHeaders() {
  return {
    "Content-Type": "application/x-ndjson; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Accel-Buffering": "no",
  };
}

function jsonError(status: number, message: string) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function trimToContextBudget(
  messages: OllamaMessage[],
  numCtx: number,
): OllamaMessage[] {
  const budgetTokens = Math.floor(numCtx * 0.75);
  const trimmed = [...messages];
  while (trimmed.length > 1 && estimateTokens(trimmed) > budgetTokens) {
    trimmed.shift();
  }
  return trimmed;
}

function estimateTokens(messages: OllamaMessage[]): number {
  let chars = 0;
  for (const m of messages) chars += m.content.length;
  return Math.ceil(chars / CHARS_PER_TOKEN);
}
