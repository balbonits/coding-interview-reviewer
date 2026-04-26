import { NextRequest } from "next/server";
import { streamChat, type OllamaMessage } from "@/lib/ollama";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MODEL = process.env.OLLAMA_INTERVIEW_MODEL ?? "qwen2.5:14b";
const NUM_CTX = Number(process.env.OLLAMA_NUM_CTX ?? 4096);
const CHARS_PER_TOKEN = 4;

function buildSystemPrompt(
  pageTitle: string,
  pageDescription: string,
  pathname: string,
): string {
  const location = pageTitle
    ? `The user is currently on: **${pageTitle}**${pageDescription ? ` — ${pageDescription}` : ""}.`
    : `The user is browsing the app (path: ${pathname || "/"}).`;

  return `You are a concise study assistant embedded in a front-end interview prep app. You help a job-seeking engineer study JavaScript, TypeScript, React, HTML, CSS, accessibility, performance, and front-end architecture.

${location}

Guidelines:
- Tailor answers to the current page topic when relevant.
- Keep responses short and direct — this is a study tool, not a lecture.
- Use code examples when they clarify things.
- If asked to quiz or practice, do so with one question at a time.
- Do NOT roleplay as an interviewer — there is a separate mock interviewer in the app for that.`;
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

  const systemPrompt = buildSystemPrompt(
    body.pageTitle ?? "",
    body.pageDescription ?? "",
    body.pathname ?? "",
  );

  const fullMessages: OllamaMessage[] = [
    { role: "system", content: systemPrompt },
    ...trimToContextBudget(body.messages, NUM_CTX),
  ];

  try {
    const stream = await streamChat({
      model: MODEL,
      messages: fullMessages,
      numCtx: NUM_CTX,
      keepAlive: "2m",
    });
    return new Response(stream, {
      headers: {
        "Content-Type": "application/x-ndjson; charset=utf-8",
        "Cache-Control": "no-store",
        "X-Accel-Buffering": "no",
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return jsonError(502, `Ollama upstream error: ${msg}`);
  }
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
