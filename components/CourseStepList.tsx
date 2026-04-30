"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Check, Circle, ExternalLink } from "lucide-react";
import {
  countSteps,
  listProgress,
  markStepDone,
  markStepUndone,
  stepId,
  type CourseManifest,
  type CourseStep,
} from "@/lib/courses";
import { Button } from "@/components/ui/button";

const STEP_ICON: Record<CourseStep["kind"], string> = {
  note: "📖",
  exercise: "💻",
  quiz: "📝",
  interview: "🎙️",
  external: "🔗",
};

function stepHref(step: CourseStep): string | null {
  switch (step.kind) {
    case "note":
      return `/notes/${step.slug}`;
    case "exercise":
      return `/exercises/${step.slug}`;
    case "quiz": {
      const params = new URLSearchParams({
        source: "topic",
        topic: step.topic,
      });
      return `/quiz?${params.toString()}`;
    }
    case "interview":
      // Sends user to the /interview landing — they pick this track from there.
      // The interview track field hints which preset card to click.
      return `/interview`;
    case "external":
      return step.url;
  }
}

function stepTitle(step: CourseStep): string {
  if (step.title) return step.title;
  switch (step.kind) {
    case "note":
      return `Note: ${step.slug}`;
    case "exercise":
      return `Exercise: ${step.slug}`;
    case "quiz":
      return `Quiz: ${step.topic}`;
    case "interview":
      return `Mock interview (${step.track})`;
    case "external":
      return step.url;
  }
}

function stepKindLabel(step: CourseStep): string {
  return {
    note: "Note",
    exercise: "Exercise",
    quiz: "AI quiz",
    interview: "Mock interview",
    external: "External",
  }[step.kind];
}

export function CourseStepList({ course }: { course: CourseManifest }) {
  const [completed, setCompleted] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listProgress(course.slug)
      .then((progress) => {
        setCompleted(new Set(progress.map((p) => p.stepId)));
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [course.slug]);

  const total = useMemo(() => countSteps(course), [course]);
  const done = completed.size;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;

  async function toggle(id: string) {
    if (completed.has(id)) {
      setCompleted((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      await markStepUndone(id);
    } else {
      setCompleted((prev) => {
        const next = new Set(prev);
        next.add(id);
        return next;
      });
      await markStepDone(course.slug, id);
    }
  }

  return (
    <section className="space-y-6">
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium">Progress</span>
          <span className="text-muted-foreground">
            {loading ? "…" : `${done} of ${total} complete · ${pct}%`}
          </span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-muted">
          <div
            className={`h-full transition-all ${
              pct === 100 ? "bg-emerald-500" : "bg-primary"
            }`}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      <div className="space-y-8">
        {course.sections.map((section, sIdx) => {
          const sectionDone = section.steps.every((_, stepIdx) =>
            completed.has(stepId(course.slug, sIdx, stepIdx)),
          );
          return (
            <section key={sIdx} className="space-y-3">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold">{section.title}</h2>
                {sectionDone && (
                  <span className="text-xs text-emerald-600 dark:text-emerald-400">
                    ✓ section complete
                  </span>
                )}
              </div>
              <ol className="space-y-2">
                {section.steps.map((step, iIdx) => {
                  const id = stepId(course.slug, sIdx, iIdx);
                  const isDone = completed.has(id);
                  const href = stepHref(step);
                  const title = stepTitle(step);
                  const isExternal =
                    step.kind === "external" && href?.startsWith("http");
                  return (
                    <li
                      key={iIdx}
                      className={`flex items-start gap-3 rounded-lg border p-3 transition-colors ${
                        isDone
                          ? "border-emerald-500/40 bg-emerald-500/5"
                          : "border-border bg-card"
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => void toggle(id)}
                        aria-label={
                          isDone ? "Mark as not done" : "Mark as done"
                        }
                        className="mt-0.5 shrink-0 text-muted-foreground transition-colors hover:text-foreground"
                      >
                        {isDone ? (
                          <Check className="size-5 text-emerald-600 dark:text-emerald-400" />
                        ) : (
                          <Circle className="size-5" />
                        )}
                      </button>

                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                          <span className="text-base">{STEP_ICON[step.kind]}</span>
                          {href ? (
                            <Link
                              href={href}
                              target={isExternal ? "_blank" : undefined}
                              rel={isExternal ? "noopener noreferrer" : undefined}
                              className="text-sm font-medium hover:underline"
                            >
                              {title}
                              {isExternal && (
                                <ExternalLink className="ml-1 inline size-3" />
                              )}
                            </Link>
                          ) : (
                            <span className="text-sm font-medium">{title}</span>
                          )}
                          <span className="text-xs text-muted-foreground">
                            · {stepKindLabel(step)}
                          </span>
                        </div>
                        {step.note && (
                          <p className="text-sm text-muted-foreground">
                            {step.note}
                          </p>
                        )}
                        {!isDone && href && (
                          <div className="pt-1">
                            <Link href={href}>
                              <Button variant="ghost" size="sm">
                                Open →
                              </Button>
                            </Link>
                          </div>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ol>
            </section>
          );
        })}
      </div>
    </section>
  );
}
