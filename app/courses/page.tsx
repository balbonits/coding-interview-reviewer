import Link from "next/link";
import { Sparkles } from "lucide-react";
import { listCourses } from "@/lib/courses-server";
import { countSteps } from "@/lib/courses";
import { getDb } from "@/lib/mongodb";
import type { CourseProgress } from "@/lib/courses";
import type { AiCourse } from "@/lib/aiCourses";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { GenerateCourseForm } from "@/components/GenerateCourseForm";

export const metadata = {
  title: "Courses · Coding Interview Reviewer",
};

export const dynamic = "force-dynamic";

const LEVEL_COLOR: Record<string, string> = {
  beginner: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
  intermediate: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  advanced: "bg-rose-500/15 text-rose-700 dark:text-rose-400",
};

interface ProgressDoc extends CourseProgress {
  _id: string;
}
interface AiCourseDoc extends AiCourse {
  _id: string;
}

async function fetchAllProgress(): Promise<CourseProgress[]> {
  try {
    const db = await getDb();
    const docs = await db
      .collection<ProgressDoc>("course_progress")
      .find({})
      .toArray();
    return docs.map(({ _id, ...rest }) => rest);
  } catch {
    return [];
  }
}

async function fetchAiCourses(): Promise<AiCourse[]> {
  try {
    const db = await getDb();
    const docs = await db
      .collection<AiCourseDoc>("ai_courses")
      .find({})
      .sort({ createdAt: -1 })
      .toArray();
    return docs.map(({ _id, ...rest }) => rest);
  } catch {
    return [];
  }
}

export default async function CoursesPage() {
  const [courses, allProgress, aiCourses] = await Promise.all([
    listCourses(),
    fetchAllProgress(),
    fetchAiCourses(),
  ]);

  // Group progress by course — count of done steps + most recent activity.
  const byCourse = new Map<string, { count: number; lastAt: number }>();
  for (const p of allProgress) {
    const cur = byCourse.get(p.courseSlug) ?? { count: 0, lastAt: 0 };
    cur.count += 1;
    if (p.completedAt > cur.lastAt) cur.lastAt = p.completedAt;
    byCourse.set(p.courseSlug, cur);
  }

  // Build the "In progress" list — partial-progress courses sorted by recency.
  // Includes both hand-authored and AI courses.
  type InProgressCard = {
    type: "manual" | "ai";
    href: string;
    title: string;
    description: string;
    level: "beginner" | "intermediate" | "advanced";
    estimatedHours: number;
    tags: string[];
    total: number;
    done: number;
    lastAt: number;
    prompt?: string;
  };
  const inProgress: InProgressCard[] = [];
  for (const c of courses) {
    const total = countSteps(c);
    const slot = byCourse.get(c.slug);
    if (!slot || slot.count === 0 || slot.count >= total) continue;
    inProgress.push({
      type: "manual",
      href: `/courses/${c.slug}`,
      title: c.title,
      description: c.description,
      level: c.level,
      estimatedHours: c.estimatedHours,
      tags: c.tags,
      total,
      done: slot.count,
      lastAt: slot.lastAt,
    });
  }
  for (const a of aiCourses) {
    const total = a.sections.reduce(
      (sum, sec) => sum + sec.steps.length,
      0,
    );
    const slug = `ai:${a.id}`;
    const slot = byCourse.get(slug);
    if (!slot || slot.count === 0 || slot.count >= total) continue;
    inProgress.push({
      type: "ai",
      href: `/courses/ai/${a.id}`,
      title: a.title,
      description: a.description,
      level: a.level,
      estimatedHours: a.estimatedHours,
      tags: a.tags,
      total,
      done: slot.count,
      lastAt: slot.lastAt,
      prompt: a.prompt,
    });
  }
  inProgress.sort((a, b) => b.lastAt - a.lastAt);

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Courses</h1>
        <p className="text-muted-foreground max-w-2xl">
          Curated learning paths through the notes, exercises, quizzes, and
          mock interviews on this site. Steps are open — jump in wherever
          makes sense for your background. Mark steps done to track progress.
        </p>
      </header>

      <section>
        <GenerateCourseForm />
      </section>

      {inProgress.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-end justify-between gap-3">
            <h2 className="text-xl font-semibold">In progress</h2>
            <p className="text-xs text-muted-foreground">
              {inProgress.length}{" "}
              {inProgress.length === 1 ? "course" : "courses"}
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {inProgress.map((c) => {
              const pct = Math.round((c.done / c.total) * 100);
              return (
                <Link key={c.href} href={c.href} className="group">
                  <Card className="flex h-full flex-col border-primary/40 transition-colors group-hover:border-primary/70">
                    <CardHeader className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        {c.type === "ai" && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-primary/15 px-2 py-0.5 font-medium text-primary">
                            <Sparkles className="size-3" />
                            AI
                          </span>
                        )}
                        <span
                          className={`rounded-full px-2 py-0.5 font-medium capitalize ${LEVEL_COLOR[c.level] ?? ""}`}
                        >
                          {c.level}
                        </span>
                        <span className="text-muted-foreground">
                          ~{c.estimatedHours}h · {c.total} steps
                        </span>
                      </div>
                      <CardTitle className="leading-snug line-clamp-2">
                        {c.title}
                      </CardTitle>
                      <CardDescription className="line-clamp-2">
                        {c.description}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="mt-auto space-y-2 pt-0">
                      <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full bg-primary transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>
                          {c.done}/{c.total} ·{" "}
                          {relativeTime(c.lastAt)}
                        </span>
                        <span className="font-medium text-primary">
                          Continue →
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {aiCourses.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-end justify-between gap-3">
            <h2 className="flex items-center gap-2 text-xl font-semibold">
              <Sparkles className="size-4 text-primary" />
              AI-generated for you
            </h2>
            <p className="text-xs text-muted-foreground">
              {aiCourses.length} saved
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {aiCourses.map((course) => {
              const total = course.sections.reduce(
                (sum, s) => sum + s.steps.length,
                0,
              );
              const slug = `ai:${course.id}`;
              const done = byCourse.get(slug)?.count ?? 0;
              const pct = total > 0 ? Math.round((done / total) * 100) : 0;
              return (
                <Link
                  key={course.id}
                  href={`/courses/ai/${course.id}`}
                  className="group"
                >
                  <Card className="flex h-full flex-col transition-colors group-hover:border-foreground/40">
                    <CardHeader className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        <span className="inline-flex items-center gap-1 rounded-full bg-primary/15 px-2 py-0.5 font-medium text-primary">
                          <Sparkles className="size-3" />
                          AI
                        </span>
                        <span
                          className={`rounded-full px-2 py-0.5 font-medium capitalize ${LEVEL_COLOR[course.level] ?? ""}`}
                        >
                          {course.level}
                        </span>
                        <span className="text-muted-foreground">
                          ~{course.estimatedHours}h · {total} steps
                        </span>
                      </div>
                      <CardTitle className="leading-snug line-clamp-2">
                        {course.title}
                      </CardTitle>
                      <CardDescription className="line-clamp-2">
                        {course.description}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="mt-auto space-y-2 pt-0">
                      <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                        <div
                          className={`h-full transition-all ${
                            pct === 100
                              ? "bg-emerald-500"
                              : pct > 0
                                ? "bg-primary"
                                : "bg-muted"
                          }`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span className="line-clamp-1">
                          From: <em>&ldquo;{course.prompt}&rdquo;</em>
                        </span>
                        <span className="ml-2 shrink-0">
                          {pct === 100 ? "✓ done" : `${done}/${total}`}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">All courses</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {courses.map((course) => {
            const total = countSteps(course);
            const done = byCourse.get(course.slug)?.count ?? 0;
            const pct = total > 0 ? Math.round((done / total) * 100) : 0;
            return (
              <Link
                key={course.slug}
                href={`/courses/${course.slug}`}
                className="group"
              >
                <Card className="flex h-full flex-col transition-colors group-hover:border-foreground/40">
                  <CardHeader className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span
                        className={`rounded-full px-2 py-0.5 font-medium capitalize ${LEVEL_COLOR[course.level] ?? ""}`}
                      >
                        {course.level}
                      </span>
                      <span className="text-muted-foreground">
                        ~{course.estimatedHours}h · {total} steps
                      </span>
                    </div>
                    <CardTitle className="leading-snug">{course.title}</CardTitle>
                    <CardDescription className="line-clamp-3">
                      {course.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="mt-auto space-y-2 pt-0">
                    <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                      <div
                        className={`h-full transition-all ${
                          pct === 100
                            ? "bg-emerald-500"
                            : pct > 0
                              ? "bg-primary"
                              : "bg-muted"
                        }`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <div className="flex flex-wrap gap-1.5">
                        {course.tags.slice(0, 3).map((t) => (
                          <Badge key={t} variant="secondary" className="text-[10px]">
                            {t}
                          </Badge>
                        ))}
                      </div>
                      <span>{pct === 100 ? "✓ done" : `${done}/${total}`}</span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function relativeTime(ts: number): string {
  const diff = Date.now() - ts;
  const min = 60_000;
  const hr = 60 * min;
  const day = 24 * hr;
  if (diff < min) return "just now";
  if (diff < hr) return `${Math.floor(diff / min)}m ago`;
  if (diff < day) return `${Math.floor(diff / hr)}h ago`;
  if (diff < 7 * day) return `${Math.floor(diff / day)}d ago`;
  return new Date(ts).toLocaleDateString();
}
