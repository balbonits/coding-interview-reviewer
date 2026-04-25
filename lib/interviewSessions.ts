"use client";

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

const STORAGE_KEY = "cir.interviewSessions";

function readAll(): InterviewSession[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as InterviewSession[]) : [];
  } catch {
    return [];
  }
}

function writeAll(sessions: InterviewSession[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
}

export function listSessions(): InterviewSession[] {
  return readAll().sort((a, b) => b.startedAt - a.startedAt);
}

export function getSession(id: string): InterviewSession | null {
  return readAll().find((s) => s.id === id) ?? null;
}

export function createSession(track: InterviewTrack): InterviewSession {
  const session: InterviewSession = {
    id:
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : String(Date.now()),
    track,
    startedAt: Date.now(),
    endedAt: null,
    messages: [],
  };
  writeAll([session, ...readAll()]);
  return session;
}

export function updateSession(
  id: string,
  patch: Partial<Omit<InterviewSession, "id">>,
): InterviewSession | null {
  const all = readAll();
  const i = all.findIndex((s) => s.id === id);
  if (i === -1) return null;
  const updated: InterviewSession = { ...all[i], ...patch };
  all[i] = updated;
  writeAll(all);
  return updated;
}

export function endSession(id: string): InterviewSession | null {
  return updateSession(id, { endedAt: Date.now() });
}

export function deleteSession(id: string): void {
  writeAll(readAll().filter((s) => s.id !== id));
}
