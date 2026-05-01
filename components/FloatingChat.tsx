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
import remarkGfm from "remark-gfm";
import {
  Check,
  Copy,
  History,
  MessageSquarePlus,
  Trash2,
  Volume2,
  VolumeOff,
} from "lucide-react";
import { MermaidBlock } from "@/components/MermaidBlock";
import { usePageContext } from "@/lib/pageContext";
import {
  cancelSpeech,
  isSpeechSynthesisSupported,
  speak,
  stripForSpeech,
} from "@/lib/speech";
import {
  deleteFloatingChatSession,
  deriveTitle,
  getFloatingChatSession,
  listFloatingChatSessions,
  saveFloatingChatSession,
  type FloatingChatSession,
} from "@/lib/floatingChatSessions";

type ChatMessage = { role: "user" | "assistant"; content: string };

const AUTO_SPEAK_KEY = "floatingChat.autoSpeak";
const ACTIVE_SESSION_KEY = "floatingChat.activeSessionId";

type ChatView = "chat" | "history";

export function FloatingChat() {
  const pathname = usePathname();
  const { ctx } = usePageContext();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const [speakingIdx, setSpeakingIdx] = useState<number | null>(null);
  const [autoSpeak, setAutoSpeak] = useState(false);
  const [ttsSupported, setTtsSupported] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [view, setView] = useState<ChatView>("chat");
  const [historySessions, setHistorySessions] = useState<FloatingChatSession[]>(
    [],
  );
  const [historyLoading, setHistoryLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const autoSpeakRef = useRef(false);
  const lastSpokenIdxRef = useRef<number>(-1);
  const saveTimerRef = useRef<number | null>(null);
  const sessionCreatedAtRef = useRef<number | null>(null);

  useEffect(() => {
    autoSpeakRef.current = autoSpeak;
  }, [autoSpeak]);

  useEffect(() => {
    setTtsSupported(isSpeechSynthesisSupported());
    try {
      setAutoSpeak(localStorage.getItem(AUTO_SPEAK_KEY) === "1");
    } catch {
      // ignore
    }
    // Restore the active session if one is pinned in localStorage.
    let activeId: string | null = null;
    try {
      activeId = localStorage.getItem(ACTIVE_SESSION_KEY);
    } catch {
      // ignore
    }
    if (activeId) {
      void getFloatingChatSession(activeId).then((s) => {
        if (s) {
          setSessionId(s.id);
          setMessages(s.messages);
          sessionCreatedAtRef.current = s.createdAt;
        } else {
          // session was deleted; clear stale id
          try {
            localStorage.removeItem(ACTIVE_SESSION_KEY);
          } catch {}
        }
      });
    }
    return () => cancelSpeech();
  }, []);

  // Auto-save the active session whenever messages settle (debounced 800ms;
  // skipped while streaming so we don't churn on every token).
  useEffect(() => {
    if (isStreaming) return;
    if (messages.length === 0) return;
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }
    saveTimerRef.current = window.setTimeout(() => {
      const id = sessionId ?? crypto.randomUUID();
      const now = Date.now();
      const createdAt = sessionCreatedAtRef.current ?? now;
      const session: FloatingChatSession = {
        id,
        title: deriveTitle(messages),
        pagePath: pathname ?? undefined,
        pageTitle: ctx.title || undefined,
        messages,
        createdAt,
        updatedAt: now,
      };
      void saveFloatingChatSession(session);
      if (!sessionId) {
        setSessionId(id);
        sessionCreatedAtRef.current = createdAt;
        try {
          localStorage.setItem(ACTIVE_SESSION_KEY, id);
        } catch {}
      }
    }, 800);
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages, isStreaming]);

  function persistAutoSpeak(next: boolean) {
    setAutoSpeak(next);
    try {
      localStorage.setItem(AUTO_SPEAK_KEY, next ? "1" : "0");
    } catch {
      // ignore
    }
    if (!next) {
      cancelSpeech();
      setSpeakingIdx(null);
    }
  }

  async function copyMessage(content: string, idx: number) {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedIdx(idx);
      window.setTimeout(
        () => setCopiedIdx((cur) => (cur === idx ? null : cur)),
        1500,
      );
    } catch {
      // ignore
    }
  }

  function speakMessage(text: string, idx: number) {
    if (speakingIdx === idx) {
      cancelSpeech();
      setSpeakingIdx(null);
      return;
    }
    const ok = speak(stripForSpeech(text), {
      onStart: () => setSpeakingIdx(idx),
      onEnd: () => setSpeakingIdx(null),
      onError: () => setSpeakingIdx(null),
    });
    if (!ok) setSpeakingIdx(null);
  }

  function newChat() {
    if (isStreaming) return;
    cancelSpeech();
    setMessages([]);
    setInput("");
    setError(null);
    setCopiedIdx(null);
    setSpeakingIdx(null);
    setSessionId(null);
    sessionCreatedAtRef.current = null;
    lastSpokenIdxRef.current = -1;
    setView("chat");
    try {
      localStorage.removeItem(ACTIVE_SESSION_KEY);
    } catch {}
  }

  async function openHistory() {
    setView("history");
    setHistoryLoading(true);
    try {
      const list = await listFloatingChatSessions();
      setHistorySessions(list);
    } finally {
      setHistoryLoading(false);
    }
  }

  function loadSession(s: FloatingChatSession) {
    cancelSpeech();
    setMessages(s.messages);
    setSessionId(s.id);
    sessionCreatedAtRef.current = s.createdAt;
    setError(null);
    setCopiedIdx(null);
    setSpeakingIdx(null);
    lastSpokenIdxRef.current = s.messages.length - 1; // don't auto-speak loaded
    setView("chat");
    try {
      localStorage.setItem(ACTIVE_SESSION_KEY, s.id);
    } catch {}
  }

  async function removeSession(id: string) {
    if (!window.confirm("Delete this chat? This can't be undone.")) return;
    await deleteFloatingChatSession(id);
    setHistorySessions((prev) => prev.filter((s) => s.id !== id));
    if (sessionId === id) {
      // We were viewing the deleted session — start fresh.
      newChat();
      setView("history");
    }
  }

  useEffect(() => {
    if (open && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, open]);

  // Auto-speak: when streaming finishes for the latest assistant message,
  // read it aloud once if auto-speak is enabled.
  useEffect(() => {
    if (isStreaming) return;
    if (!autoSpeakRef.current) return;
    if (messages.length === 0) return;
    const lastIdx = messages.length - 1;
    const last = messages[lastIdx];
    if (last.role !== "assistant") return;
    if (!last.content.trim()) return;
    if (lastSpokenIdxRef.current === lastIdx) return;
    lastSpokenIdxRef.current = lastIdx;
    speak(stripForSpeech(last.content), {
      onStart: () => setSpeakingIdx(lastIdx),
      onEnd: () => setSpeakingIdx(null),
      onError: () => setSpeakingIdx(null),
    });
  }, [isStreaming, messages]);

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
            <div className="ml-3 flex shrink-0 items-center gap-1">
              <button
                type="button"
                onClick={() => (view === "history" ? setView("chat") : void openHistory())}
                disabled={isStreaming}
                title={view === "history" ? "Back to chat" : "Chat history"}
                aria-label={view === "history" ? "Back to chat" : "Chat history"}
                className={`rounded p-1 transition-colors hover:bg-background ${
                  view === "history"
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground"
                } disabled:cursor-not-allowed disabled:opacity-40`}
              >
                <History className="size-4" />
              </button>
              <button
                type="button"
                onClick={newChat}
                disabled={messages.length === 0 || isStreaming}
                title="New chat — clear current conversation"
                aria-label="New chat"
                className="rounded p-1 text-muted-foreground transition-colors hover:bg-background hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
              >
                <MessageSquarePlus className="size-4" />
              </button>
              {ttsSupported && (
                <button
                  type="button"
                  onClick={() => persistAutoSpeak(!autoSpeak)}
                  title={
                    autoSpeak
                      ? "Auto-speak on — click to disable"
                      : "Auto-speak off — click to enable"
                  }
                  aria-label={
                    autoSpeak ? "Disable auto-speak" : "Enable auto-speak"
                  }
                  className={`rounded p-1 transition-colors hover:bg-background ${
                    autoSpeak
                      ? "text-primary"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {autoSpeak ? (
                    <Volume2 className="size-4" />
                  ) : (
                    <VolumeOff className="size-4" />
                  )}
                </button>
              )}
              <button
                onClick={() => setOpen(false)}
                className="text-muted-foreground hover:text-foreground transition-colors text-lg leading-none"
                aria-label="Close study assistant"
              >
                ✕
              </button>
            </div>
          </div>

          {/* History view */}
          {view === "history" && (
            <div className="flex-1 overflow-y-auto p-3">
              {historyLoading ? (
                <p className="mt-10 text-center text-sm text-muted-foreground">
                  Loading chats…
                </p>
              ) : historySessions.length === 0 ? (
                <p className="mt-10 text-center text-sm text-muted-foreground">
                  No saved chats yet.
                </p>
              ) : (
                <ul className="space-y-1">
                  {historySessions.map((s) => (
                    <li
                      key={s.id}
                      className={`group/h flex items-start gap-2 rounded-md p-2 hover:bg-muted ${
                        s.id === sessionId ? "bg-muted/60" : ""
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => loadSession(s)}
                        className="min-w-0 flex-1 text-left"
                      >
                        <p className="line-clamp-2 text-sm font-medium">
                          {s.title}
                        </p>
                        <p className="mt-0.5 truncate text-xs text-muted-foreground">
                          {s.pageTitle ?? s.pagePath ?? "—"} ·{" "}
                          {new Date(s.updatedAt).toLocaleString(undefined, {
                            month: "short",
                            day: "numeric",
                            hour: "numeric",
                            minute: "2-digit",
                          })}
                          {" · "}
                          {s.messages.length} msg
                        </p>
                      </button>
                      <button
                        type="button"
                        onClick={() => void removeSession(s.id)}
                        title="Delete chat"
                        aria-label="Delete chat"
                        className="rounded p-1 text-muted-foreground opacity-0 transition-opacity hover:bg-background hover:text-destructive group-hover/h:opacity-100"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {/* Messages */}
          {view === "chat" && (
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
                className={`group/msg flex flex-col ${m.role === "user" ? "items-end" : "items-start"}`}
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
                      remarkPlugins={[remarkGfm]}
                      components={{
                        code: ({ className, children, ...props }) => {
                          if (className === "language-mermaid") {
                            return (
                              <MermaidBlock source={String(children).trim()} />
                            );
                          }
                          const isBlock = className?.startsWith("language-");
                          return isBlock ? (
                            <pre className="my-2 overflow-x-auto rounded bg-zinc-950 p-2 text-xs text-zinc-100">
                              <code className={className} {...props}>
                                {children}
                              </code>
                            </pre>
                          ) : (
                            <code
                              className="rounded bg-background/60 px-1 py-0.5 font-mono text-xs"
                              {...props}
                            >
                              {children}
                            </code>
                          );
                        },
                        pre: ({ children }) => <>{children}</>,
                        p: ({ children, ...props }) => (
                          <p className="mb-1 last:mb-0" {...props}>
                            {children}
                          </p>
                        ),
                        strong: ({ children }) => (
                          <strong className="font-semibold">{children}</strong>
                        ),
                        em: ({ children }) => (
                          <em className="italic">{children}</em>
                        ),
                        h1: ({ children }) => (
                          <h1 className="mt-2 mb-1 text-base font-semibold">{children}</h1>
                        ),
                        h2: ({ children }) => (
                          <h2 className="mt-2 mb-1 font-semibold">{children}</h2>
                        ),
                        h3: ({ children }) => (
                          <h3 className="mt-1 mb-1 font-medium">{children}</h3>
                        ),
                        blockquote: ({ children }) => (
                          <blockquote className="my-2 border-l-2 border-border pl-2 italic opacity-80">
                            {children}
                          </blockquote>
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
                        table: ({ children }) => (
                          <div className="my-2 overflow-x-auto">
                            <table className="w-full border-collapse text-xs">
                              {children}
                            </table>
                          </div>
                        ),
                        thead: ({ children }) => (
                          <thead className="border-b border-border">{children}</thead>
                        ),
                        tr: ({ children }) => (
                          <tr className="border-b border-border/50 last:border-0">
                            {children}
                          </tr>
                        ),
                        th: ({ children }) => (
                          <th className="px-2 py-1 text-left font-semibold align-top">
                            {children}
                          </th>
                        ),
                        td: ({ children }) => (
                          <td className="px-2 py-1 align-top">{children}</td>
                        ),
                        a: ({ href, children }) => (
                          <a
                            href={href}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary underline underline-offset-2 hover:opacity-80"
                          >
                            {children}
                          </a>
                        ),
                      }}
                    >
                      {m.content || (isStreaming && i === messages.length - 1 ? "▋" : "")}
                    </Markdown>
                  ) : (
                    m.content
                  )}
                </div>
                {m.content.trim() && (
                  <div
                    className={`mt-0.5 flex gap-0.5 transition-opacity ${
                      copiedIdx === i || speakingIdx === i
                        ? "opacity-100"
                        : "opacity-0 group-hover/msg:opacity-100 focus-within:opacity-100"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => copyMessage(m.content, i)}
                      title={copiedIdx === i ? "Copied!" : "Copy as Markdown"}
                      aria-label={
                        copiedIdx === i ? "Copied" : "Copy as Markdown"
                      }
                      className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                    >
                      {copiedIdx === i ? (
                        <Check className="size-3" />
                      ) : (
                        <Copy className="size-3" />
                      )}
                    </button>
                    {ttsSupported && m.role === "assistant" && (
                      <button
                        type="button"
                        onClick={() => speakMessage(m.content, i)}
                        title={
                          speakingIdx === i ? "Stop speaking" : "Read aloud"
                        }
                        aria-label={
                          speakingIdx === i ? "Stop speaking" : "Read aloud"
                        }
                        className={`rounded p-1 hover:bg-muted hover:text-foreground ${
                          speakingIdx === i
                            ? "text-primary"
                            : "text-muted-foreground"
                        }`}
                      >
                        {speakingIdx === i ? (
                          <VolumeOff className="size-3" />
                        ) : (
                          <Volume2 className="size-3" />
                        )}
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}
            {error && (
              <p className="text-xs text-destructive text-center">{error}</p>
            )}
          </div>
          )}

          {/* Input — hidden in history view */}
          {view === "chat" && (
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
          )}
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
