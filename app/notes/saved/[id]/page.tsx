"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Markdown from "react-markdown";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MermaidBlock } from "@/components/MermaidBlock";
import { QuizMeButton } from "@/components/QuizMeButton";
import { SmartBackLink } from "@/components/SmartBackLink";
import {
  deleteInterviewNote,
  getInterviewNote,
  type InterviewNote,
} from "@/lib/interviewNotes";
import { trackLabel } from "@/lib/interviewSessions";

export default function SavedNotePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [note, setNote] = useState<InterviewNote | null | "loading">("loading");

  useEffect(() => {
    getInterviewNote(id).then(setNote);
  }, [id]);

  async function handleDelete() {
    if (!note || note === "loading") return;
    if (
      !window.confirm(
        `Delete "${note.title}"? This can't be undone. (The interview session itself stays.)`,
      )
    )
      return;
    await deleteInterviewNote(note.id);
    router.push("/notes");
  }

  if (note === "loading") {
    return <p className="text-muted-foreground">Loading note…</p>;
  }
  if (!note) {
    return (
      <div className="space-y-4">
        <SmartBackLink fallbackHref="/notes" fallbackLabel="All notes" />
        <p className="text-muted-foreground">Note not found.</p>
      </div>
    );
  }

  return (
    <article className="space-y-6">
      <SmartBackLink fallbackHref="/notes" fallbackLabel="All notes" />

      <header className="space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <h1 className="text-3xl font-bold tracking-tight">{note.title}</h1>
          <div className="flex gap-2">
            <QuizMeButton source="interview-note" id={note.id} />
            <Link href={`/interview/${note.sessionId}`}>
              <Button type="button" variant="outline" size="sm">
                Open source session
              </Button>
            </Link>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleDelete}
              className="text-destructive hover:text-destructive"
            >
              Delete
            </Button>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span>From {trackLabel(note.track)} mock interview</span>
          <span>·</span>
          <span>
            Saved {new Date(note.createdAt).toLocaleDateString()}
            {note.updatedAt && note.updatedAt > note.createdAt
              ? ` · updated ${new Date(note.updatedAt).toLocaleDateString()}`
              : ""}
          </span>
        </div>
        {note.tags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {note.tags.map((tag) => (
              <Link key={tag} href={`/tags/${encodeURIComponent(tag)}`}>
                <Badge variant="secondary" className="hover:opacity-80">
                  {tag}
                </Badge>
              </Link>
            ))}
          </div>
        )}
      </header>

      <section className="prose prose-sm max-w-none dark:prose-invert">
        <Markdown
          components={{
            h1: ({ children }) => (
              <h2 className="mt-6 mb-3 text-xl font-semibold">{children}</h2>
            ),
            h2: ({ children }) => (
              <h3 className="mt-5 mb-2 text-lg font-semibold">{children}</h3>
            ),
            h3: ({ children }) => (
              <h4 className="mt-4 mb-2 font-semibold">{children}</h4>
            ),
            p: ({ children }) => <p className="mb-3 leading-7">{children}</p>,
            strong: ({ children }) => (
              <strong className="font-semibold">{children}</strong>
            ),
            em: ({ children }) => <em className="italic">{children}</em>,
            ul: ({ children }) => (
              <ul className="mb-3 ml-5 list-disc space-y-1">{children}</ul>
            ),
            ol: ({ children }) => (
              <ol className="mb-3 ml-5 list-decimal space-y-1">{children}</ol>
            ),
            li: ({ children }) => <li className="leading-7">{children}</li>,
            blockquote: ({ children }) => (
              <blockquote className="my-3 border-l-2 border-border pl-4 italic opacity-80">
                {children}
              </blockquote>
            ),
            pre: ({ children }) => <>{children}</>,
            code: ({ className, children, ...props }) => {
              if (className === "language-mermaid") {
                return <MermaidBlock source={String(children).trim()} />;
              }
              const isBlock = className?.startsWith("language-");
              return isBlock ? (
                <pre className="my-3 overflow-x-auto rounded-md bg-muted p-3 text-xs">
                  <code className={className} {...props}>
                    {children}
                  </code>
                </pre>
              ) : (
                <code
                  className="rounded bg-muted px-1 py-0.5 font-mono text-xs"
                  {...props}
                >
                  {children}
                </code>
              );
            },
          }}
        >
          {note.content}
        </Markdown>
      </section>
    </article>
  );
}
