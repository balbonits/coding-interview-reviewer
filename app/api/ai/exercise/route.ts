import { NextRequest } from "next/server";
import { streamChat, type OllamaMessage } from "@/lib/ollama";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MODEL = process.env.OLLAMA_INTERVIEW_MODEL ?? "qwen2.5:14b";
const NUM_CTX = Number(process.env.OLLAMA_NUM_CTX ?? 4096);

type Action = "hint" | "review" | "explain";

type RequestBody = {
  action: Action;
  code: string;
  problem: string;
};

function buildMessages(action: Action, code: string, problem: string): OllamaMessage[] {
  const systemBase = `You are a senior front-end engineer helping a candidate practice coding exercises. Be concise — 3–5 sentences max unless a list is genuinely clearer.`;

  switch (action) {
    case "hint":
      return [
        { role: "system", content: systemBase },
        {
          role: "user",
          content: `Problem:\n${problem}\n\nCandidate's current code:\n\`\`\`\n${code}\n\`\`\`\n\nGive ONE targeted hint that nudges them in the right direction without giving the solution away. Focus on the most important missing piece.`,
        },
      ];
    case "review":
      return [
        { role: "system", content: systemBase },
        {
          role: "user",
          content: `Problem:\n${problem}\n\nCandidate's code:\n\`\`\`\n${code}\n\`\`\`\n\nReview this code. Note: correctness first, then edge cases, then style. If it looks like a stub or incomplete, say so briefly and point to the first thing to fix.`,
        },
      ];
    case "explain":
      return [
        { role: "system", content: systemBase },
        {
          role: "user",
          content: `A candidate is working on this exercise:\n${problem}\n\nExplain the core concept(s) they need to understand to solve it. Use plain language and, if useful, a short example. Do not reveal the solution.`,
        },
      ];
  }
}

export async function POST(req: NextRequest) {
  let body: RequestBody;
  try {
    body = (await req.json()) as RequestBody;
  } catch {
    return jsonError(400, "Invalid JSON body");
  }

  const { action, code, problem } = body;
  if (!action || !["hint", "review", "explain"].includes(action)) {
    return jsonError(400, "action must be hint | review | explain");
  }
  if (typeof code !== "string" || typeof problem !== "string") {
    return jsonError(400, "code and problem must be strings");
  }

  const messages = buildMessages(action, code, problem);

  try {
    const stream = await streamChat({
      model: MODEL,
      messages,
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
