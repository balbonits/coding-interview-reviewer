// Pure types + client-safe utilities. Importable from client components.
// Server-side fs reading lives in `lib/courses-server.ts`.

import type { InterviewTrack } from "@/lib/interviewSessions";

export type CourseStep =
  | { kind: "note"; slug: string; title?: string; note?: string }
  | { kind: "exercise"; slug: string; title?: string; note?: string }
  | {
      kind: "quiz";
      topic: string;
      count?: number;
      types?: ("mcq" | "predict-output")[];
      title?: string;
      note?: string;
    }
  | {
      kind: "interview";
      track: InterviewTrack;
      title?: string;
      note?: string;
    }
  | { kind: "external"; url: string; title: string; note?: string };

export type CourseSection = {
  title: string;
  steps: CourseStep[];
};

export type CourseFrontmatter = {
  title: string;
  description: string;
  level: "beginner" | "intermediate" | "advanced";
  estimatedHours: number;
  tags: string[];
  prerequisites?: string[];
  sections: CourseSection[];
};

export type CourseManifest = CourseFrontmatter & {
  slug: string;
  intro: string;
};

export type CourseProgress = {
  stepId: string;
  courseSlug: string;
  completedAt: number;
};

export function countSteps(course: CourseManifest): number {
  return course.sections.reduce((sum, s) => sum + s.steps.length, 0);
}

export function stepId(
  courseSlug: string,
  sectionIdx: number,
  stepIdx: number,
): string {
  return `${courseSlug}:${sectionIdx}:${stepIdx}`;
}

// ---------- Client API ----------

export async function listProgress(
  courseSlug: string,
): Promise<CourseProgress[]> {
  const res = await fetch(`/api/course-progress?course=${courseSlug}`);
  if (!res.ok) return [];
  return res.json() as Promise<CourseProgress[]>;
}

export async function listAllProgress(): Promise<CourseProgress[]> {
  const res = await fetch(`/api/course-progress`);
  if (!res.ok) return [];
  return res.json() as Promise<CourseProgress[]>;
}

export async function markStepDone(
  courseSlug: string,
  stepIdValue: string,
  step?: CourseStep,
): Promise<{ reviewSeeded?: boolean }> {
  const res = await fetch("/api/course-progress", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ courseSlug, stepId: stepIdValue, step }),
  });
  if (!res.ok) return {};
  return res.json() as Promise<{ reviewSeeded?: boolean }>;
}

export async function markStepUndone(stepIdValue: string): Promise<void> {
  await fetch(
    `/api/course-progress?stepId=${encodeURIComponent(stepIdValue)}`,
    { method: "DELETE" },
  );
}
