export type InterviewRole = "system" | "user" | "assistant";

export type InterviewMessage = {
  role: InterviewRole;
  content: string;
};

export type InterviewTrack = "javascript";

export type InterviewSession = {
  id: string;
  track: InterviewTrack;
  startedAt: number;
  endedAt: number | null;
  messages: InterviewMessage[];
};

export async function listSessions(): Promise<InterviewSession[]> {
  const res = await fetch("/api/sessions");
  if (!res.ok) return [];
  return res.json() as Promise<InterviewSession[]>;
}

export async function getSession(id: string): Promise<InterviewSession | null> {
  const res = await fetch(`/api/sessions/${id}`);
  if (!res.ok) return null;
  return res.json() as Promise<InterviewSession>;
}

export async function createSession(
  track: InterviewTrack,
): Promise<InterviewSession> {
  const res = await fetch("/api/sessions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ track }),
  });
  return res.json() as Promise<InterviewSession>;
}

export async function updateSession(
  id: string,
  patch: Partial<Omit<InterviewSession, "id">>,
): Promise<InterviewSession | null> {
  const res = await fetch(`/api/sessions/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });
  if (!res.ok) return null;
  return res.json() as Promise<InterviewSession>;
}

export async function endSession(id: string): Promise<InterviewSession | null> {
  return updateSession(id, { endedAt: Date.now() });
}

export async function deleteSession(id: string): Promise<void> {
  await fetch(`/api/sessions/${id}`, { method: "DELETE" });
}
