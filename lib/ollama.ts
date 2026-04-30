const OLLAMA_URL = process.env.OLLAMA_URL ?? "http://localhost:11434";

export type OllamaRole = "system" | "user" | "assistant" | "tool";

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

// ---------- Tool calling ----------

export type OllamaTool = {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: {
      type: "object";
      properties: Record<string, { type: string; description?: string }>;
      required?: string[];
    };
  };
};

export type OllamaToolCall = {
  function: {
    name: string;
    arguments: Record<string, unknown>;
  };
};

export type OllamaMessageWithTools = OllamaMessage & {
  tool_calls?: OllamaToolCall[];
};

export type ToolHandler = (
  name: string,
  args: Record<string, unknown>,
) => Promise<string>;

/**
 * Non-streaming chat that supports a tool-calling loop. The model may emit
 * tool calls; we execute them via `handler`, append the results, and re-call
 * the model up to `maxIterations` times. Returns the final assistant text.
 *
 * Status updates can be reported via the `onStatus` callback so callers can
 * stream them to the user (e.g. "Searching the web for X…").
 */
export async function chatWithTools(opts: {
  model: string;
  messages: OllamaMessage[];
  tools: OllamaTool[];
  handler: ToolHandler;
  numCtx?: number;
  keepAlive?: string | number;
  maxIterations?: number;
  onStatus?: (msg: string) => void | Promise<void>;
  signal?: AbortSignal;
}): Promise<string> {
  const messages: OllamaMessageWithTools[] = [...opts.messages];
  const maxIter = opts.maxIterations ?? 4;

  for (let iter = 0; iter < maxIter; iter++) {
    const res = await fetch(`${OLLAMA_URL}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: opts.model,
        messages,
        tools: opts.tools,
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
    const json = (await res.json()) as {
      message?: {
        role?: string;
        content?: string;
        tool_calls?: OllamaToolCall[];
      };
    };
    const message = json.message ?? {};
    const toolCalls = message.tool_calls ?? [];

    if (toolCalls.length === 0) {
      return message.content ?? "";
    }

    // Push the assistant turn (with tool_calls) so the model can see its own
    // intent in the conversation when we re-call.
    messages.push({
      role: "assistant",
      content: message.content ?? "",
      tool_calls: toolCalls,
    } as OllamaMessageWithTools);

    for (const call of toolCalls) {
      const name = call.function.name;
      const args = call.function.arguments ?? {};
      await opts.onStatus?.(formatToolStatus(name, args));
      let result: string;
      try {
        result = await opts.handler(name, args);
      } catch (e) {
        result = `Tool error: ${e instanceof Error ? e.message : String(e)}`;
      }
      messages.push({
        role: "tool",
        content: result,
      } as OllamaMessageWithTools);
    }
  }

  // If we hit the iteration cap, ask the model for a final answer without
  // further tool calls by calling chat() one more time.
  return await chat({
    model: opts.model,
    messages,
    numCtx: opts.numCtx,
    keepAlive: opts.keepAlive,
    signal: opts.signal,
  });
}

function formatToolStatus(
  name: string,
  args: Record<string, unknown>,
): string {
  if (name === "web_search" && typeof args.query === "string") {
    return `Searching the web for: "${args.query}"…`;
  }
  return `Calling ${name}…`;
}
