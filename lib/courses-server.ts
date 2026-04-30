// Server-only fs reading for course manifests. Don't import from client code.
import "server-only";
import fs from "node:fs/promises";
import path from "node:path";
import matter from "gray-matter";
import type { CourseFrontmatter, CourseManifest } from "@/lib/courses";

const COURSES_DIR = path.join(process.cwd(), "content", "courses");

export async function listCourseSlugs(): Promise<string[]> {
  try {
    const entries = await fs.readdir(COURSES_DIR, { withFileTypes: true });
    return entries
      .filter((e) => e.isFile() && e.name.endsWith(".mdx"))
      .map((e) => e.name.replace(/\.mdx$/, ""));
  } catch {
    return [];
  }
}

export async function getCourse(slug: string): Promise<CourseManifest | null> {
  try {
    const raw = await fs.readFile(
      path.join(COURSES_DIR, `${slug}.mdx`),
      "utf8",
    );
    const { data, content } = matter(raw);
    const fm = data as CourseFrontmatter;
    return { slug, ...fm, intro: content };
  } catch {
    return null;
  }
}

export async function listCourses(): Promise<CourseManifest[]> {
  const slugs = await listCourseSlugs();
  const courses = await Promise.all(slugs.map(getCourse));
  return courses
    .filter((c): c is CourseManifest => c !== null)
    .sort((a, b) => a.title.localeCompare(b.title));
}
