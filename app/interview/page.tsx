"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { InlineRename } from "@/components/ui/inline-rename";
import { StatusPill } from "@/components/ui/status-pill";
import {
  listSessions,
  createSession,
  renameSession,
  deleteSession,
  sessionDisplayTitle,
  trackLabel,
  INTERVIEW_TRACKS,
  type InterviewSession,
  type InterviewTrack,
} from "@/lib/interviewSessions";

const TRACK_ORDER: InterviewTrack[] = [
  "javascript",
  "dsa",
  "react",
  "typescript",
  "html-css",
  "system-design",
  "general",
];

export default function InterviewLandingPage() {
  const router = useRouter();
  const [sessions, setSessions] = useState<InterviewSession[] | null>(null);
  const [starting, setStarting] = useState<InterviewTrack | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);

  useEffect(() => {
    listSessions().then(setSessions).catch(() => setSessions([]));
  }, []);

  async function startNew(track: InterviewTrack) {
    setStarting(track);
    try {
      const s = await createSession(track);
      router.push(`/interview/${s.id}`);
    } finally {
      setStarting(null);
    }
  }

  async function commitRename(id: string, next: string) {
    setRenamingId(null);
    const updated = await renameSession(id, next);
    if (updated) {
      setSessions((prev) =>
        prev ? prev.map((s) => (s.id === id ? updated : s)) : prev,
      );
    }
  }

  async function handleDelete(s: InterviewSession) {
    const label = sessionDisplayTitle(s);
    if (!window.confirm(`Delete "${label}"? This can't be undone.`)) return;
    await deleteSession(s.id);
    setSessions((prev) => (prev ? prev.filter((x) => x.id !== s.id) : prev));
  }

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Mock Interview</h1>
        <p className="text-muted-foreground max-w-2xl">
          Pick a topic to start a focused practice session against a local AI.
          Each topic has its own interviewer prompt. Transcripts are saved to
          your local MongoDB database.
        </p>
      </header>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Start a new session</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {TRACK_ORDER.map((id) => {
            const preset = INTERVIEW_TRACKS[id];
            const isStarting = starting === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => { void startNew(id); }}
                disabled={starting !== null}
                className="text-left rounded-lg border border-border bg-card p-4 transition-colors hover:border-foreground/40 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="font-semibold">{preset.label}</div>
                <p className="mt-1 text-sm text-muted-foreground">
                  {preset.description}
                </p>
                {isStarting && (
                  <p className="mt-2 text-xs text-muted-foreground">
                    Starting…
                  </p>
                )}
              </button>
            );
          })}
        </div>
        <p className="text-xs text-muted-foreground">
          Requires Ollama running locally with the{" "}
          <code className="rounded bg-muted px-1 py-0.5 font-mono">
            qwen2.5:14b
          </code>{" "}
          model.
        </p>
      </section>

      {sessions !== null && sessions.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-xl font-semibold">Past sessions</h2>
          <div className="grid gap-3">
            {sessions.map((s) => (
              <Card
                key={s.id}
                className="transition-colors hover:border-foreground/40"
              >
                <CardHeader>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      {renamingId === s.id ? (
                        <InlineRename
                          value={s.title ?? ""}
                          placeholder={`${trackLabel(s.track)} interview`}
                          onSubmit={(next) => commitRename(s.id, next)}
                          onCancel={() => setRenamingId(null)}
                        />
                      ) : (
                        <Link href={`/interview/${s.id}`} className="block group">
                          <CardTitle className="text-base group-hover:underline">
                            {sessionDisplayTitle(s)}
                          </CardTitle>
                          <CardDescription>
                            {trackLabel(s.track)} ·{" "}
                            Started {new Date(s.startedAt).toLocaleString()} ·{" "}
                            {visibleMessageCount(s)} messages
                          </CardDescription>
                        </Link>
                      )}
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <StatusPill tone={s.endedAt ? "neutral" : "success"}>
                        {s.endedAt ? "Ended" : "In progress"}
                      </StatusPill>
                      {renamingId !== s.id && (
                        <>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setRenamingId(s.id)}
                          >
                            Rename
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => { void handleDelete(s); }}
                            className="text-destructive hover:text-destructive"
                          >
                            Delete
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </CardHeader>
              </Card>
            ))}
          </div>
        </section>
      )}

      {sessions !== null && sessions.length === 0 && (
        <p className="text-sm text-muted-foreground">
          No sessions yet — pick a topic above to start one.
        </p>
      )}
    </div>
  );
}

function visibleMessageCount(s: InterviewSession): number {
  return s.messages.filter((m) => m.role !== "system").length;
}
