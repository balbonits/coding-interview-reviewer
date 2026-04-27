"use client";

import {
  useState,
  useEffect,
  useRef,
  use,
  type FormEvent,
  type KeyboardEvent,
} from "react";
import Markdown from "react-markdown";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { InlineRename } from "@/components/ui/inline-rename";
import { Textarea } from "@/components/ui/textarea";
import {
  getSession,
  updateSession,
  renameSession,
  endSession,
  sessionDisplayTitle,
  trackLabel,
  INTERVIEW_TRACKS,
  type InterviewSession,
  type InterviewMessage,
} from "@/lib/interviewSessions";

function kickoffFor(session: InterviewSession): string {
  return (
    INTERVIEW_TRACKS[session.track]?.kickoffPrompt ??
    INTERVIEW_TRACKS.javascript.kickoffPrompt
  );
}

export default function InterviewSessionPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = use(params);
  const router = useRouter();

  const [session, setSession] = useState<InterviewSession | null>(null);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const transcriptRef = useRef<HTMLDivElement>(null);
  const kickedOffRef = useRef(false);

  useEffect(() => {
    getSession(sessionId).then((s) => {
      if (!s) {
        router.replace("/interview");
        return;
      }
      setSession(s);
      if (!kickedOffRef.current && s.messages.length === 0 && !s.endedAt) {
        kickedOffRef.current = true;
        void send([{ role: "user", content: kickoffFor(s) }], s);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  useEffect(() => {
    transcriptRef.current?.scrollTo({
      top: transcriptRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [session?.messages]);

  async function send(
    newMessages: InterviewMessage[],
    baseSession: InterviewSession,
  ) {
    setError(null);
    setIsStreaming(true);

    const messagesAfterUser: InterviewMessage[] = [
      ...baseSession.messages,
      ...newMessages,
    ];

    const optimistic: InterviewSession = {
      ...baseSession,
      messages: [...messagesAfterUser, { role: "assistant", content: "" }],
    };
    setSession(optimistic);
    // fire-and-forget optimistic save
    void updateSession(baseSession.id, { messages: optimistic.messages });

    try {
      const res = await fetch("/api/ai/interview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: messagesAfterUser,
          track: baseSession.track,
        }),
      });

      if (!res.ok || !res.body) {
        const errBody = await res.text().catch(() => "");
        throw new Error(`HTTP ${res.status}: ${errBody.slice(0, 200)}`);
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
              setSession((prev) =>
                prev
                  ? {
                      ...prev,
                      messages: [
                        ...prev.messages.slice(0, -1),
                        { role: "assistant", content: assistantContent },
                      ],
                    }
                  : prev,
              );
            }
          } catch {
            // ignore partial-line parse errors
          }
        }
      }

      const finalMessages: InterviewMessage[] = [
        ...messagesAfterUser,
        { role: "assistant", content: assistantContent },
      ];
      await updateSession(baseSession.id, { messages: finalMessages });
      setSession((prev) =>
        prev ? { ...prev, messages: finalMessages } : prev,
      );
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      setError(msg);
      setSession((prev) =>
        prev ? { ...prev, messages: messagesAfterUser } : prev,
      );
      void updateSession(baseSession.id, { messages: messagesAfterUser });
    } finally {
      setIsStreaming(false);
    }
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!input.trim() || isStreaming || !session) return;
    const userMessage: InterviewMessage = { role: "user", content: input.trim() };
    setInput("");
    void send([userMessage], session);
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSubmit(e as unknown as FormEvent);
    }
  }

  async function handleEnd() {
    if (!session || isStreaming) return;
    await endSession(session.id);
    setSession({ ...session, endedAt: Date.now() });
  }

  async function commitTitle(next: string) {
    if (!session) return;
    setIsEditingTitle(false);
    const updated = await renameSession(session.id, next);
    if (updated) setSession(updated);
  }

  if (!session) {
    return <p className="text-muted-foreground">Loading session…</p>;
  }

  const kickoff = kickoffFor(session);
  const visibleMessages = session.messages.filter(
    (m) => m.role !== "system" && m.content !== kickoff,
  );

  return (
    <div className="flex flex-col gap-4 h-[calc(100vh-12rem)]">
      <header className="space-y-2">
        <Link
          href="/interview"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← All sessions
        </Link>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            {isEditingTitle ? (
              <InlineRename
                value={session.title ?? ""}
                placeholder={`${trackLabel(session.track)} interview`}
                onSubmit={commitTitle}
                onCancel={() => setIsEditingTitle(false)}
              />
            ) : (
              <div className="flex items-center gap-2">
                <h1 className="truncate text-lg font-semibold">
                  {sessionDisplayTitle(session)}
                </h1>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsEditingTitle(true)}
                >
                  Rename
                </Button>
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              {trackLabel(session.track)}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-3 text-sm">
            {session.endedAt ? (
              <span className="text-muted-foreground">Session ended</span>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={() => { void handleEnd(); }}
                disabled={isStreaming}
              >
                End session
              </Button>
            )}
          </div>
        </div>
      </header>

      <div
        ref={transcriptRef}
        className="flex-1 min-h-0 overflow-y-auto space-y-4 rounded-lg border border-border bg-card p-4"
      >
        {visibleMessages.length === 0 && (
          <p className="text-sm text-muted-foreground">
            Waiting for the interviewer…
          </p>
        )}
        {visibleMessages.map((m, i) => (
          <Message key={i} message={m} />
        ))}
        {isStreaming &&
          session.messages[session.messages.length - 1]?.content === "" && (
            <p className="text-xs text-muted-foreground">
              Interviewer is thinking…
            </p>
          )}
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {!session.endedAt && (
        <form onSubmit={handleSubmit} className="space-y-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type your answer…"
            className="min-h-24 resize-none"
            disabled={isStreaming}
          />
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">⌘/Ctrl + Enter to send</p>
            <Button type="submit" disabled={!input.trim() || isStreaming}>
              {isStreaming ? "Streaming…" : "Send"}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}

function Message({ message }: { message: InterviewMessage }) {
  const isUser = message.role === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[85%] rounded-lg px-4 py-2 text-sm leading-6 ${
          isUser
            ? "bg-primary text-primary-foreground whitespace-pre-wrap"
            : "bg-muted text-foreground"
        }`}
      >
        {isUser ? (message.content || "…") : (
          <Markdown
            components={{
              p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
              strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
              em: ({ children }) => <em className="italic">{children}</em>,
              ul: ({ children }) => <ul className="list-disc pl-4 mb-2 space-y-1">{children}</ul>,
              ol: ({ children }) => <ol className="list-decimal pl-4 mb-2 space-y-1">{children}</ol>,
              li: ({ children }) => <li>{children}</li>,
              h1: ({ children }) => <h1 className="font-semibold text-base mb-1">{children}</h1>,
              h2: ({ children }) => <h2 className="font-semibold mb-1">{children}</h2>,
              h3: ({ children }) => <h3 className="font-medium mb-1">{children}</h3>,
              blockquote: ({ children }) => <blockquote className="border-l-2 border-border pl-3 italic opacity-80 my-2">{children}</blockquote>,
              code: ({ className, children, ...props }) => {
                const isBlock = className?.startsWith("language-");
                return isBlock ? (
                  <pre className="bg-background/60 rounded p-3 overflow-x-auto text-xs my-2 font-mono">
                    <code {...props}>{children}</code>
                  </pre>
                ) : (
                  <code className="bg-background/60 rounded px-1 py-0.5 text-xs font-mono" {...props}>{children}</code>
                );
              },
            }}
          >
            {message.content || "…"}
          </Markdown>
        )}
      </div>
    </div>
  );
}
