export type CaptureType = "note" | "exercise-idea";

export interface Capture {
  id: string;
  type: CaptureType;
  title: string;
  tags: string;
  content: string;
  createdAt: string; // ISO timestamp
}

const STORAGE_KEY = "quick_captures";

export function loadCaptures(): Capture[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Capture[]) : [];
  } catch {
    return [];
  }
}

export function saveCapture(capture: Capture): void {
  const all = loadCaptures().filter((c) => c.id !== capture.id);
  all.unshift(capture);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  } catch {}
}

export function deleteCapture(id: string): void {
  const all = loadCaptures().filter((c) => c.id !== id);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  } catch {}
}

export function newCapture(): Capture {
  return {
    id: `cap_${Date.now()}`,
    type: "note",
    title: "",
    tags: "",
    content: "",
    createdAt: new Date().toISOString(),
  };
}

/** Generate MDX file content ready to drop into content/notes/ or content/exercises/ */
export function toMdx(capture: Capture): string {
  const tags = capture.tags
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);

  return [
    "---",
    `title: "${capture.title.replace(/"/g, '\\"')}"`,
    `tags: [${tags.map((t) => `"${t}"`).join(", ")}]`,
    "---",
    "",
    capture.content,
    "",
  ].join("\n");
}

export function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}
