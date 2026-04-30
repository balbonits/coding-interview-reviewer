"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Markdown from "react-markdown";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CourseStepList } from "@/components/CourseStepList";
import {
  deleteAiCourse,
  getAiCourse,
  type AiCourse,
} from "@/lib/aiCourses";
import { countSteps, type CourseManifest } from "@/lib/courses";

const LEVEL_COLOR: Record<string, string> = {
  beginner: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
  intermediate: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  advanced: "bg-rose-500/15 text-rose-700 dark:text-rose-400",
};

export default function AiCoursePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [course, setCourse] = useState<AiCourse | null | "loading">("loading");

  useEffect(() => {
    getAiCourse(id).then(setCourse);
  }, [id]);

  async function handleDelete() {
    if (!course || course === "loading") return;
    if (
      !window.confirm(
        `Delete "${course.title}"? This can't be undone (your progress on it will also be lost).`,
      )
    )
      return;
    await deleteAiCourse(course.id);
    router.push("/courses");
  }

  if (course === "loading") {
    return <p className="text-muted-foreground">Loading course…</p>;
  }
  if (!course) {
    return (
      <div className="space-y-4">
        <Link
          href="/courses"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← All courses
        </Link>
        <p className="text-muted-foreground">Course not found.</p>
      </div>
    );
  }

  // Adapt the AiCourse to a CourseManifest for the shared step list.
  const asManifest: CourseManifest = {
    slug: `ai:${course.id}`,
    title: course.title,
    description: course.description,
    level: course.level,
    estimatedHours: course.estimatedHours,
    tags: course.tags,
    prerequisites: course.prerequisites,
    sections: course.sections,
    intro: course.intro,
  };

  const total = countSteps(asManifest);

  return (
    <article className="space-y-8">
      <Link
        href="/courses"
        className="text-sm text-muted-foreground hover:text-foreground"
      >
        ← All courses
      </Link>

      <header className="space-y-3">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="inline-flex items-center gap-1 rounded-full bg-primary/15 px-2 py-0.5 font-medium text-primary">
            <Sparkles className="size-3" /> AI-generated
          </span>
          <span
            className={`rounded-full px-2 py-0.5 font-medium capitalize ${LEVEL_COLOR[course.level] ?? ""}`}
          >
            {course.level}
          </span>
          <span className="text-muted-foreground">
            ~{course.estimatedHours} hours · {total} steps · saved{" "}
            {new Date(course.createdAt).toLocaleDateString()}
          </span>
        </div>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold tracking-tight">{course.title}</h1>
            <p className="text-sm text-muted-foreground">
              <span className="font-medium">Generated from:</span>{" "}
              <em>&ldquo;{course.prompt}&rdquo;</em>
            </p>
          </div>
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
        <p className="text-lg text-muted-foreground">{course.description}</p>
        <div className="flex flex-wrap gap-2">
          {course.tags.map((tag) => (
            <Link key={tag} href={`/tags/${encodeURIComponent(tag)}`}>
              <Badge variant="secondary" className="hover:opacity-80">
                {tag}
              </Badge>
            </Link>
          ))}
        </div>
      </header>

      {course.intro.trim() && (
        <section className="prose prose-sm max-w-none dark:prose-invert">
          <Markdown>{course.intro}</Markdown>
        </section>
      )}

      <CourseStepList course={asManifest} />
    </article>
  );
}
