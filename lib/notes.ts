import fs from "node:fs/promises";
import path from "node:path";
import matter from "gray-matter";

const NOTES_DIR = path.join(process.cwd(), "content", "notes");

export type NoteFrontmatter = {
  title: string;
  tags: string[];
  related?: string[];
};

export type NoteMeta = NoteFrontmatter & { slug: string };

export type Note = NoteMeta & { content: string };

export async function listNoteSlugs(): Promise<string[]> {
  const entries = await fs.readdir(NOTES_DIR, { withFileTypes: true });
  return entries
    .filter((e) => e.isFile() && e.name.endsWith(".mdx"))
    .map((e) => e.name.replace(/\.mdx$/, ""));
}

export async function listNotes(): Promise<NoteMeta[]> {
  const slugs = await listNoteSlugs();
  const notes = await Promise.all(slugs.map(loadMeta));
  return notes.sort((a, b) => a.title.localeCompare(b.title));
}

async function loadMeta(slug: string): Promise<NoteMeta> {
  const raw = await fs.readFile(path.join(NOTES_DIR, `${slug}.mdx`), "utf8");
  const { data } = matter(raw);
  const fm = data as NoteFrontmatter;
  return { slug, ...fm };
}

export async function getNote(slug: string): Promise<Note | null> {
  try {
    const raw = await fs.readFile(path.join(NOTES_DIR, `${slug}.mdx`), "utf8");
    const { data, content } = matter(raw);
    const fm = data as NoteFrontmatter;
    return { slug, ...fm, content };
  } catch {
    return null;
  }
}
