// Client-safe types + fetch wrappers for AI-generated courses.
import type { CourseFrontmatter } from "@/lib/courses";

export type AiCourse = CourseFrontmatter & {
  id: string;
  intro: string;
  prompt: string;
  createdAt: number;
};

export async function listAiCourses(): Promise<AiCourse[]> {
  const res = await fetch("/api/ai-courses");
  if (!res.ok) return [];
  return res.json() as Promise<AiCourse[]>;
}

export async function getAiCourse(id: string): Promise<AiCourse | null> {
  const res = await fetch(`/api/ai-courses/${id}`);
  if (!res.ok) return null;
  return res.json() as Promise<AiCourse>;
}

export async function generateAiCourse(opts: {
  topic: string;
  level: "beginner" | "intermediate" | "advanced";
  estimatedHours: number;
}): Promise<AiCourse> {
  const res = await fetch("/api/ai-courses", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(opts),
  });
  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`Generate failed: ${res.status} ${errText.slice(0, 200)}`);
  }
  return res.json() as Promise<AiCourse>;
}

export async function deleteAiCourse(id: string): Promise<void> {
  await fetch(`/api/ai-courses/${id}`, { method: "DELETE" });
}
