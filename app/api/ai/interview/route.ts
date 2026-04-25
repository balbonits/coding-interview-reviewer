import { NextRequest } from "next/server";
import { streamChat, type OllamaMessage } from "@/lib/ollama";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MODEL = process.env.OLLAMA_INTERVIEW_MODEL ?? "qwen2.5:14b";
const NUM_CTX = Number(process.env.OLLAMA_NUM_CTX ?? 4096);
// Cheap heuristic: ~4 chars per token for English text.
const CHARS_PER_TOKEN = 4;

const SYSTEM_PROMPT = `You are a senior front-end engineer conducting a focused 15-minute JavaScript technical interview.

Rules of engagement:
- Ask ONE question at a time. Wait for the candidate's answer before moving on.
- Vary the question style: mix conceptual ("how does X work?"), trade-off ("when would you reach for Y vs Z?"), debugging ("what's wrong with this snippet?"), and short coding questions.
- After each answer, ask a follow-up that probes a weakness, extends the idea, or pushes to a deeper "why".
- Keep your turns short. Don't lecture. Don't dump multi-paragraph explanations of correct answers — your job is to evaluate, not teach.
- If the candidate is wrong or vague, gently push back ("walk me through that one more time" / "what would happen if...?") instead of immediately giving the answer.
- If the candidate explicitly asks you to stop, give a brief 3-bullet summary of strengths/gaps/recommended-next-topic and end the session.
- Topic surface area for this interview: closures, scope, this binding, prototypes & classes, async/await, promises, event loop, modules, ES2015+ features, common interview patterns (debounce, throttle, deep-clone), and basic React/TypeScript familiarity.

Begin the interview by greeting briefly and asking your first question.`;

type RequestBody = {
  messages: OllamaMessage[];
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

  const fullMessages: OllamaMessage[] = [
    { role: "system", content: SYSTEM_PROMPT },
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

/**
 * Drop oldest user/assistant turns until the rough token estimate fits the
 * budget. Always keeps the most recent message (the user's current question).
 */
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
