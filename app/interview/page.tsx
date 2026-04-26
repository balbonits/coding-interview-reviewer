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
import {
  listSessions,
  createSession,
  type InterviewSession,
} from "@/lib/interviewSessions";

export default function InterviewLandingPage() {
  const router = useRouter();
  const [sessions, setSessions] = useState<InterviewSession[] | null>(null);

  useEffect(() => {
    listSessions().then(setSessions).catch(() => setSessions([]));
  }, []);

  async function startNew() {
    const s = await createSession("javascript");
    router.push(`/interview/${s.id}`);
  }

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Mock Interview</h1>
        <p className="text-muted-foreground max-w-2xl">
          Practice a JavaScript interview against a local AI. The interviewer
          asks one question at a time and follows up on weak answers.
          Transcripts are saved to your local MongoDB database.
        </p>
      </header>

      <div className="space-y-2">
        <Button onClick={() => { void startNew(); }} size="lg">
          Start new JavaScript interview
        </Button>
        <p className="text-xs text-muted-foreground">
          Requires Ollama running locally with the{" "}
          <code className="rounded bg-muted px-1 py-0.5 font-mono">
            qwen2.5:14b
          </code>{" "}
          model.
        </p>
      </div>

      {sessions !== null && sessions.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-xl font-semibold">Past sessions</h2>
          <div className="grid gap-3">
            {sessions.map((s) => (
              <Link key={s.id} href={`/interview/${s.id}`} className="group">
                <Card className="transition-colors group-hover:border-foreground/40">
                  <CardHeader>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <CardTitle className="text-base capitalize">
                          {s.track} interview
                        </CardTitle>
                        <CardDescription>
                          Started {new Date(s.startedAt).toLocaleString()} ·{" "}
                          {visibleMessageCount(s)} messages
                        </CardDescription>
                      </div>
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          s.endedAt
                            ? "bg-muted text-muted-foreground"
                            : "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
                        }`}
                      >
                        {s.endedAt ? "Ended" : "In progress"}
                      </span>
                    </div>
                  </CardHeader>
                </Card>
              </Link>
            ))}
          </div>
        </section>
      )}

      {sessions !== null && sessions.length === 0 && (
        <p className="text-sm text-muted-foreground">
          No sessions yet — kick one off above.
        </p>
      )}
    </div>
  );
}

function visibleMessageCount(s: InterviewSession): number {
  return s.messages.filter((m) => m.role !== "system").length;
}
