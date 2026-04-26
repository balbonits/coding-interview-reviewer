"use client";
import {
  useState,
  useRef,
  useEffect,
  type FormEvent,
  type KeyboardEvent,
} from "react";
import { usePathname } from "next/navigation";
import Markdown from "react-markdown";
import { usePageContext } from "@/lib/pageContext";

type ChatMessage = { role: "user" | "assistant"; content: string };

export function FloatingChat() {
  const pathname = usePathname();
  const { ctx } = usePageContext();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, open]);

  // Interview pages have their own dedicated AI chat
  if (pathname?.startsWith("/interview")) return null;

  async function send() {
    const text = input.trim();
    if (!text || isStreaming) return;

    const userMsg: ChatMessage = { role: "user", content: text };
    const next: ChatMessage[] = [
      ...messages,
      userMsg,
      { role: "assistant", content: "" },
    ];
    setMessages(next);
    setInput("");
    setError(null);
    setIsStreaming(true);

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...messages, userMsg],
          pageTitle: ctx.title,
          pageDescription: ctx.description,
          pathname,
        }),
      });

      if (!res.ok || !res.body) {
        throw new Error(`HTTP ${res.status}`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let assistantContent = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;
          try {
            const chunk = JSON.parse(trimmed) as {
              message?: { content?: string };
            };
            const piece = chunk.message?.content;
            if (piece) {
              assistantContent += piece;
              setMessages((prev) => [
                ...prev.slice(0, -1),
                { role: "assistant", content: assistantContent },
              ]);
            }
          } catch {
            // ignore partial-line parse errors
          }
        }
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      setError(msg);
      setMessages((prev) => prev.slice(0, -1));
    } finally {
      setIsStreaming(false);
    }
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    void send();
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      void send();
    }
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
      {open && (
        <div className="flex flex-col w-[380px] h-[500px] rounded-xl border border-border bg-background shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/40 shrink-0">
            <div className="min-w-0">
              <p className="text-sm font-semibold">Study Assistant</p>
              {ctx.title && (
                <p className="text-xs text-muted-foreground truncate">
                  {ctx.title}
                </p>
              )}
            </div>
            <button
              onClick={() => setOpen(false)}
              className="ml-3 shrink-0 text-muted-foreground hover:text-foreground transition-colors text-lg leading-none"
              aria-label="Close study assistant"
            >
              ✕
            </button>
          </div>

          {/* Messages */}
          <div
            ref={scrollRef}
            className="flex-1 overflow-y-auto p-4 space-y-3"
          >
            {messages.length === 0 && (
              <p className="text-sm text-muted-foreground text-center mt-10">
                Ask anything about what you&apos;re studying.
              </p>
            )}
            {messages.map((m, i) => (
              <div
                key={i}
                className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[88%] rounded-lg px-3 py-2 text-sm ${
                    m.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-foreground"
                  }`}
                >
                  {m.role === "assistant" ? (
                    <Markdown
                      components={{
                        code: ({ children, ...props }) => (
                          <code
                            className="rounded bg-background/60 px-1 py-0.5 font-mono text-xs"
                            {...props}
                          >
                            {children}
                          </code>
                        ),
                        pre: ({ children, ...props }) => (
                          <pre
                            className="my-2 overflow-x-auto rounded bg-zinc-950 p-2 text-xs text-zinc-100"
                            {...props}
                          >
                            {children}
                          </pre>
                        ),
                        p: ({ children, ...props }) => (
                          <p className="mb-1 last:mb-0" {...props}>
                            {children}
                          </p>
                        ),
                        ul: ({ children, ...props }) => (
                          <ul className="my-1 list-disc pl-4 space-y-0.5" {...props}>
                            {children}
                          </ul>
                        ),
                        ol: ({ children, ...props }) => (
                          <ol className="my-1 list-decimal pl-4 space-y-0.5" {...props}>
                            {children}
                          </ol>
                        ),
                      }}
                    >
                      {m.content || (isStreaming && i === messages.length - 1 ? "▋" : "")}
                    </Markdown>
                  ) : (
                    m.content
                  )}
                </div>
              </div>
            ))}
            {error && (
              <p className="text-xs text-destructive text-center">{error}</p>
            )}
          </div>

          {/* Input */}
          <form
            onSubmit={handleSubmit}
            className="border-t border-border p-3 flex gap-2 shrink-0"
          >
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask anything… ⌘↵ to send"
              rows={2}
              disabled={isStreaming}
              className="flex-1 resize-none rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring placeholder:text-muted-foreground disabled:opacity-60"
            />
            <button
              type="submit"
              disabled={!input.trim() || isStreaming}
              className="self-end rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50 hover:opacity-90 transition-opacity"
            >
              Send
            </button>
          </form>
        </div>
      )}

      {/* Toggle button */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-12 h-12 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center hover:opacity-90 transition-opacity"
        aria-label={open ? "Close study assistant" : "Open study assistant"}
      >
        {open ? (
          <span className="text-base leading-none">✕</span>
        ) : (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        )}
      </button>
    </div>
  );
}
