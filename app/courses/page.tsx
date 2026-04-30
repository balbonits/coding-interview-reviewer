import Link from "next/link";
import { listCourses } from "@/lib/courses-server";
import { countSteps } from "@/lib/courses";
import { getDb } from "@/lib/mongodb";
import type { CourseProgress } from "@/lib/courses";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

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

export default async function CoursesPage() {
  const [courses, allProgress] = await Promise.all([
    listCourses(),
    fetchAllProgress(),
  ]);

  // Group progress by course
  const byCourse = new Map<string, number>();
  for (const p of allProgress) {
    byCourse.set(p.courseSlug, (byCourse.get(p.courseSlug) ?? 0) + 1);
  }

  // Find a "continue where you left off" candidate — most recently progressed
  // course that isn't fully complete.
  let resume: { slug: string; updatedAt: number } | null = null;
  const latestPerCourse = new Map<string, number>();
  for (const p of allProgress) {
    const cur = latestPerCourse.get(p.courseSlug) ?? 0;
    if (p.completedAt > cur) latestPerCourse.set(p.courseSlug, p.completedAt);
  }
  for (const [slug, ts] of latestPerCourse) {
    const course = courses.find((c) => c.slug === slug);
    if (!course) continue;
    const total = countSteps(course);
    const done = byCourse.get(slug) ?? 0;
    if (done < total && (!resume || ts > resume.updatedAt)) {
      resume = { slug, updatedAt: ts };
    }
  }
  const resumeCourse = resume ? courses.find((c) => c.slug === resume.slug) : null;

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

      {resumeCourse && (
        <section className="rounded-xl border border-primary/30 bg-primary/5 p-5">
          <p className="text-xs font-medium uppercase tracking-wider text-primary">
            Continue where you left off
          </p>
          <Link
            href={`/courses/${resumeCourse.slug}`}
            className="mt-1 block text-xl font-semibold hover:underline"
          >
            {resumeCourse.title}
          </Link>
          <p className="mt-1 text-sm text-muted-foreground">
            {byCourse.get(resumeCourse.slug) ?? 0} of {countSteps(resumeCourse)} steps complete
          </p>
        </section>
      )}

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">All courses</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {courses.map((course) => {
            const total = countSteps(course);
            const done = byCourse.get(course.slug) ?? 0;
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
