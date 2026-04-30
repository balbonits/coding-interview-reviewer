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
import {
  Check,
  Copy,
  Download,
  Mic,
  MicOff,
  RotateCcw,
  Volume2,
  VolumeOff,
} from "lucide-react";
import { MermaidBlock } from "@/components/MermaidBlock";
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
import {
  cancelSpeech,
  isSpeechRecognitionSupported,
  isSpeechSynthesisSupported,
  speak,
  startRecognition,
  stripForSpeech,
  type RecognitionHandle,
} from "@/lib/speech";

const AUTO_SPEAK_KEY = "interview.autoSpeak";

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
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState("");
  const [autoSpeak, setAutoSpeak] = useState(false);
  const [speakingIdx, setSpeakingIdx] = useState<number | null>(null);
  const [sttSupported, setSttSupported] = useState(false);
  const [ttsSupported, setTtsSupported] = useState(false);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const transcriptRef = useRef<HTMLDivElement>(null);
  const kickedOffRef = useRef(false);
  const recognitionRef = useRef<RecognitionHandle | null>(null);
  const autoSpeakRef = useRef(false);

  useEffect(() => {
    autoSpeakRef.current = autoSpeak;
  }, [autoSpeak]);

  useEffect(() => {
    setSttSupported(isSpeechRecognitionSupported());
    setTtsSupported(isSpeechSynthesisSupported());
    try {
      setAutoSpeak(localStorage.getItem(AUTO_SPEAK_KEY) === "1");
    } catch {
      // localStorage can throw in some privacy modes
    }
    return () => {
      recognitionRef.current?.abort();
      cancelSpeech();
    };
  }, []);

  function persistAutoSpeak(next: boolean) {
    setAutoSpeak(next);
    try {
      localStorage.setItem(AUTO_SPEAK_KEY, next ? "1" : "0");
    } catch {
      // ignore
    }
    if (!next) cancelSpeech();
  }

  function startListening() {
    if (recognitionRef.current) return;
    cancelSpeech();
    setSpeakingIdx(null);
    setError(null);
    setInterim("");
    const handle = startRecognition({
      onInterim: (text) => setInterim(text),
      onFinal: (text) => {
        setInput((prev) => (prev ? `${prev.trimEnd()} ${text}` : text));
        setInterim("");
      },
      onError: (err) => {
        if (err !== "no-speech" && err !== "aborted") {
          setError(`Microphone: ${err}`);
        }
      },
      onEnd: () => {
        recognitionRef.current = null;
        setListening(false);
        setInterim("");
      },
    });
    if (!handle) {
      setError("Microphone is not available in this browser.");
      return;
    }
    recognitionRef.current = handle;
    setListening(true);
  }

  function stopListening() {
    recognitionRef.current?.stop();
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

  async function copyMessage(content: string, idx: number) {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedIdx(idx);
      window.setTimeout(
        () => setCopiedIdx((cur) => (cur === idx ? null : cur)),
        1500,
      );
    } catch {
      setError("Couldn't copy to clipboard.");
    }
  }

  function regenerateLast() {
    if (!session || isStreaming || session.endedAt) return;
    const messages = session.messages;
    let lastUserIdx = -1;
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === "user") {
        lastUserIdx = i;
        break;
      }
    }
    if (lastUserIdx === -1) return;
    cancelSpeech();
    setSpeakingIdx(null);
    const lastUserMsg = messages[lastUserIdx];
    const rolledBack: InterviewSession = {
      ...session,
      messages: messages.slice(0, lastUserIdx),
    };
    setSession(rolledBack);
    void send([lastUserMsg], rolledBack);
  }

  function exportMarkdown() {
    if (!session) return;
    const lines: string[] = [];
    lines.push(`# ${sessionDisplayTitle(session)}`);
    lines.push("");
    lines.push(`- **Track:** ${trackLabel(session.track)}`);
    lines.push(
      `- **Started:** ${new Date(session.startedAt).toLocaleString()}`,
    );
    if (session.endedAt) {
      lines.push(`- **Ended:** ${new Date(session.endedAt).toLocaleString()}`);
    }
    if (session.track === "custom" && session.context) {
      const c = session.context;
      if (c.roleTitle) lines.push(`- **Role:** ${c.roleTitle}`);
      if (c.companyName) lines.push(`- **Company:** ${c.companyName}`);
      if (c.jobDescription) {
        lines.push("", "## Job Description", "", c.jobDescription);
      }
      if (c.notes) {
        lines.push("", "## Candidate Notes", "", c.notes);
      }
    }
    lines.push("", "---", "");

    const kickoff = kickoffFor(session);
    for (const m of session.messages) {
      if (m.role === "system") continue;
      if (m.content === kickoff) continue;
      const label = m.role === "assistant" ? "Interviewer" : "You";
      lines.push(`**${label}:**`, "", m.content, "");
    }

    const slug = (session.title || trackLabel(session.track))
      .replace(/[^\w\s-]/g, "")
      .replace(/\s+/g, "-")
      .toLowerCase();
    const date = new Date(session.startedAt).toISOString().slice(0, 10);
    const filename = `${slug || "interview"}-${date}.md`;

    const blob = new Blob([lines.join("\n")], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

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
          context: baseSession.context,
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

      if (autoSpeakRef.current && assistantContent.trim()) {
        const visibleIdx = finalMessages
          .filter(
            (m) =>
              m.role !== "system" && m.content !== kickoffFor(baseSession),
          )
          .length - 1;
        speakMessage(assistantContent, visibleIdx);
      }
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
    if (recognitionRef.current) recognitionRef.current.stop();
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
  let lastAssistantIdx = -1;
  for (let i = visibleMessages.length - 1; i >= 0; i--) {
    if (visibleMessages[i].role === "assistant") {
      lastAssistantIdx = i;
      break;
    }
  }

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
              {session.track === "custom" && session.context?.roleTitle
                ? ` · ${session.context.roleTitle}`
                : ""}
              {session.track === "custom" && session.context?.companyName
                ? ` @ ${session.context.companyName}`
                : ""}
            </p>
            {session.track === "custom" && session.context && (
              <details className="mt-1 text-xs text-muted-foreground">
                <summary className="cursor-pointer hover:text-foreground">
                  Show role context
                </summary>
                <div className="mt-2 space-y-2 rounded-md border border-border bg-muted/40 p-3 whitespace-pre-wrap">
                  {session.context.jobDescription && (
                    <div>
                      <span className="font-medium text-foreground">
                        Job description
                      </span>
                      <p className="mt-0.5">{session.context.jobDescription}</p>
                    </div>
                  )}
                  {session.context.notes && (
                    <div>
                      <span className="font-medium text-foreground">Notes</span>
                      <p className="mt-0.5">{session.context.notes}</p>
                    </div>
                  )}
                </div>
              </details>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-2 text-sm">
            {ttsSupported && !session.endedAt && (
              <Button
                type="button"
                variant={autoSpeak ? "default" : "outline"}
                size="sm"
                onClick={() => persistAutoSpeak(!autoSpeak)}
                title={
                  autoSpeak
                    ? "Auto-speak on — click to disable"
                    : "Auto-speak off — click to enable"
                }
              >
                {autoSpeak ? (
                  <Volume2 className="size-4" />
                ) : (
                  <VolumeOff className="size-4" />
                )}
                <span className="hidden sm:inline">Auto-speak</span>
              </Button>
            )}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={exportMarkdown}
              title="Export transcript as Markdown"
              disabled={session.messages.length === 0}
            >
              <Download className="size-4" />
              <span className="hidden sm:inline">Export</span>
            </Button>
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
          <Message
            key={i}
            message={m}
            ttsSupported={ttsSupported}
            isSpeaking={speakingIdx === i}
            isCopied={copiedIdx === i}
            canRegenerate={i === lastAssistantIdx && !isStreaming && !session.endedAt}
            onToggleSpeak={() => speakMessage(m.content, i)}
            onCopy={() => copyMessage(m.content, i)}
            onRegenerate={regenerateLast}
          />
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
            placeholder={
              listening ? "Listening — speak your answer…" : "Type your answer…"
            }
            className="min-h-24 max-h-64 resize-none overflow-y-auto"
            disabled={isStreaming}
          />
          {listening && interim && (
            <p className="text-xs italic text-muted-foreground">
              <span className="mr-1 inline-block size-1.5 animate-pulse rounded-full bg-destructive align-middle" />
              {interim}
            </p>
          )}
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs text-muted-foreground">⌘/Ctrl + Enter to send</p>
            <div className="flex items-center gap-2">
              {sttSupported && (
                <Button
                  type="button"
                  variant={listening ? "default" : "outline"}
                  size="sm"
                  onClick={listening ? stopListening : startListening}
                  disabled={isStreaming}
                  title={listening ? "Stop listening" : "Speak your answer"}
                >
                  {listening ? (
                    <MicOff className="size-4" />
                  ) : (
                    <Mic className="size-4" />
                  )}
                  <span className="hidden sm:inline">
                    {listening ? "Stop" : "Speak"}
                  </span>
                </Button>
              )}
              <Button type="submit" disabled={!input.trim() || isStreaming}>
                {isStreaming ? "Streaming…" : "Send"}
              </Button>
            </div>
          </div>
        </form>
      )}
    </div>
  );
}

function Message({
  message,
  ttsSupported,
  isSpeaking,
  isCopied,
  canRegenerate,
  onToggleSpeak,
  onCopy,
  onRegenerate,
}: {
  message: InterviewMessage;
  ttsSupported: boolean;
  isSpeaking: boolean;
  isCopied: boolean;
  canRegenerate: boolean;
  onToggleSpeak: () => void;
  onCopy: () => void;
  onRegenerate: () => void;
}) {
  const isUser = message.role === "user";
  const hasContent = message.content.trim().length > 0;
  const showSpeaker = !isUser && ttsSupported && hasContent;
  const showCopy = hasContent;
  const showRetry = !isUser && canRegenerate;
  const actionBtnClass =
    "rounded p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50";
  return (
    <div
      className={`group/message flex flex-col ${
        isUser ? "items-end" : "items-start"
      }`}
    >
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
              pre: ({ children }) => <>{children}</>,
              code: ({ className, children, ...props }) => {
                const isBlock = className?.startsWith("language-");
                if (className === "language-mermaid") {
                  return <MermaidBlock source={String(children).trim()} />;
                }
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
      {(showCopy || showSpeaker || showRetry) && (
        <div
          className={`mt-1 flex items-center gap-0.5 opacity-0 transition-opacity group-hover/message:opacity-100 focus-within:opacity-100 ${
            isCopied || isSpeaking ? "opacity-100" : ""
          }`}
        >
          {showCopy && (
            <button
              type="button"
              onClick={onCopy}
              className={actionBtnClass}
              title={isCopied ? "Copied!" : "Copy as Markdown"}
              aria-label={isCopied ? "Copied" : "Copy as Markdown"}
            >
              {isCopied ? (
                <Check className="size-3.5" />
              ) : (
                <Copy className="size-3.5" />
              )}
            </button>
          )}
          {showSpeaker && (
            <button
              type="button"
              onClick={onToggleSpeak}
              className={`${actionBtnClass} ${isSpeaking ? "text-primary" : ""}`}
              title={isSpeaking ? "Stop speaking" : "Read aloud"}
              aria-label={isSpeaking ? "Stop speaking" : "Read aloud"}
            >
              {isSpeaking ? (
                <VolumeOff className="size-3.5" />
              ) : (
                <Volume2 className="size-3.5" />
              )}
            </button>
          )}
          {showRetry && (
            <button
              type="button"
              onClick={onRegenerate}
              className={actionBtnClass}
              title="Regenerate response"
              aria-label="Regenerate response"
            >
              <RotateCcw className="size-3.5" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
