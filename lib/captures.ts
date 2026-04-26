export type CaptureType = "note" | "exercise-idea";

export interface Capture {
  id: string;
  type: CaptureType;
  title: string;
  tags: string;
  content: string;
  createdAt: string; // ISO timestamp
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

/** Generate MDX file content ready to drop into content/notes/ */
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
