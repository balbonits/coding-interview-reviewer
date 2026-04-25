import fs from "node:fs/promises";
import path from "node:path";
import matter from "gray-matter";

const EXERCISES_DIR = path.join(process.cwd(), "content", "exercises");

export type Difficulty = "easy" | "medium" | "hard";

export type SandpackTemplate =
  | "vanilla"
  | "vanilla-ts"
  | "react"
  | "react-ts"
  | "node";

export const TEMPLATE_EXT: Record<SandpackTemplate, string> = {
  vanilla: "js",
  "vanilla-ts": "ts",
  react: "jsx",
  "react-ts": "tsx",
  node: "js",
};

export type ExerciseMeta = {
  slug: string;
  title: string;
  tags: string[];
  difficulty: Difficulty;
  estimatedMinutes: number;
  concepts: string[];
  template?: SandpackTemplate;
};

export type Exercise = {
  meta: ExerciseMeta;
  template: SandpackTemplate;
  problemContent: string;
  starter: string;
  solution: string;
  tests: string;
};

async function loadMeta(slug: string): Promise<ExerciseMeta> {
  const raw = await fs.readFile(
    path.join(EXERCISES_DIR, slug, "meta.json"),
    "utf8",
  );
  return JSON.parse(raw) as ExerciseMeta;
}

export async function listExerciseSlugs(): Promise<string[]> {
  const entries = await fs.readdir(EXERCISES_DIR, { withFileTypes: true });
  return entries.filter((e) => e.isDirectory()).map((e) => e.name);
}

export async function listExercises(): Promise<ExerciseMeta[]> {
  const slugs = await listExerciseSlugs();
  const metas = await Promise.all(slugs.map(loadMeta));
  return metas.sort((a, b) => a.title.localeCompare(b.title));
}

export async function getExercise(slug: string): Promise<Exercise | null> {
  const dir = path.join(EXERCISES_DIR, slug);
  try {
    const meta = await loadMeta(slug);
    const template: SandpackTemplate = meta.template ?? "vanilla";
    const ext = TEMPLATE_EXT[template];
    const [problemRaw, starter, solution, tests] = await Promise.all([
      fs.readFile(path.join(dir, "problem.mdx"), "utf8"),
      fs.readFile(path.join(dir, `starter.${ext}`), "utf8"),
      fs.readFile(path.join(dir, `solution.${ext}`), "utf8"),
      fs.readFile(path.join(dir, `tests.${ext}`), "utf8"),
    ]);
    const { content } = matter(problemRaw);
    return { meta, template, problemContent: content, starter, solution, tests };
  } catch {
    return null;
  }
}
