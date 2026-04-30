import type {
  InterviewContext,
  InterviewTrack,
} from "@/lib/interviewSessions";

export type InterviewNote = {
  // 1:1 with session — `id` and `sessionId` are intentionally identical so a
  // session has at most one note. Saving again updates the existing note.
  id: string;
  sessionId: string;
  title: string;
  track: InterviewTrack;
  context?: InterviewContext;
  tags: string[];
  content: string;
  createdAt: number;
  updatedAt?: number;
};

export async function listInterviewNotes(): Promise<InterviewNote[]> {
  const res = await fetch("/api/interview-notes");
  if (!res.ok) return [];
  return res.json() as Promise<InterviewNote[]>;
}

export async function getInterviewNote(
  id: string,
): Promise<InterviewNote | null> {
  const res = await fetch(`/api/interview-notes/${id}`);
  if (!res.ok) return null;
  return res.json() as Promise<InterviewNote>;
}

export async function createInterviewNoteFromSession(
  sessionId: string,
): Promise<InterviewNote | null> {
  const res = await fetch("/api/interview-notes", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sessionId }),
  });
  if (!res.ok) return null;
  return res.json() as Promise<InterviewNote>;
}

export async function updateInterviewNote(
  id: string,
  patch: Partial<Pick<InterviewNote, "title" | "content" | "tags">>,
): Promise<InterviewNote | null> {
  const res = await fetch(`/api/interview-notes/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });
  if (!res.ok) return null;
  return res.json() as Promise<InterviewNote>;
}

export async function deleteInterviewNote(id: string): Promise<void> {
  await fetch(`/api/interview-notes/${id}`, { method: "DELETE" });
}

/** Pull `**Tags:** a, b, c` line out of AI-generated markdown. */
export function parseTagsFromMarkdown(md: string): string[] {
  const m = md.match(/^\s*\*\*Tags:\*\*\s*(.+)$/m);
  if (!m) return [];
  return m[1]
    .split(/[,;]/)
    .map((t) => t.trim().toLowerCase().replace(/\s+/g, "-"))
    .filter(Boolean);
}

/** Pull `# Title` heading out of AI-generated markdown. */
export function parseTitleFromMarkdown(md: string): string | null {
  const m = md.match(/^\s*#\s+(.+?)\s*$/m);
  return m ? m[1].trim() : null;
}
