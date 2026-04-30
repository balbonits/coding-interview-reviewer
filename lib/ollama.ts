const OLLAMA_URL = process.env.OLLAMA_URL ?? "http://localhost:11434";

export type OllamaRole = "system" | "user" | "assistant";

export type OllamaMessage = {
  role: OllamaRole;
  content: string;
};

export type OllamaStreamChunk = {
  model: string;
  created_at: string;
  message?: { role: "assistant"; content: string };
  done: boolean;
  done_reason?: string;
};

/**
 * POST a chat completion to the local Ollama server and return the raw
 * NDJSON response stream. Caller is responsible for parsing.
 *
 * Memory controls (enforce a soft ~12 GB cap on a 14B-Q4 model):
 * - `numCtx` shrinks the KV cache (default 2048; we cap at 4096).
 * - `keepAlive` short-idle-unloads the model so it doesn't sit resident.
 * - Pair with env `OLLAMA_MAX_LOADED_MODELS=1` so two models can't co-load.
 */
export async function streamChat(opts: {
  model: string;
  messages: OllamaMessage[];
  signal?: AbortSignal;
  numCtx?: number;
  keepAlive?: string | number;
}): Promise<ReadableStream<Uint8Array>> {
  const res = await fetch(`${OLLAMA_URL}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: opts.model,
      messages: opts.messages,
      stream: true,
      options: { num_ctx: opts.numCtx ?? 4096 },
      keep_alive: opts.keepAlive ?? "2m",
    }),
    signal: opts.signal,
  });

  if (!res.ok || !res.body) {
    const errText = await res.text().catch(() => "(no body)");
    throw new Error(
      `Ollama ${res.status} ${res.statusText}: ${errText.slice(0, 300)}`,
    );
  }

  return res.body;
}

/**
 * Non-streaming chat completion. Returns the full assistant content as a
 * single string. Use for one-shot tasks like summarization where streaming
 * to the client would add complexity without UX benefit.
 */
export async function chat(opts: {
  model: string;
  messages: OllamaMessage[];
  signal?: AbortSignal;
  numCtx?: number;
  keepAlive?: string | number;
}): Promise<string> {
  const res = await fetch(`${OLLAMA_URL}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: opts.model,
      messages: opts.messages,
      stream: false,
      options: { num_ctx: opts.numCtx ?? 4096 },
      keep_alive: opts.keepAlive ?? "2m",
    }),
    signal: opts.signal,
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "(no body)");
    throw new Error(
      `Ollama ${res.status} ${res.statusText}: ${errText.slice(0, 300)}`,
    );
  }

  const json = (await res.json()) as { message?: { content?: string } };
  return json.message?.content ?? "";
}
