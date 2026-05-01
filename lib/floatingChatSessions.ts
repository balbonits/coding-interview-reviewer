// Client-safe types + fetch wrappers for the floating-chat session history.
// Sessions auto-save as the user chats so they can resume later.

export type FloatingChatMessage = {
  role: "user" | "assistant";
  content: string;
};

export type FloatingChatSession = {
  id: string;
  title: string;
  pagePath?: string;
  pageTitle?: string;
  messages: FloatingChatMessage[];
  createdAt: number;
  updatedAt: number;
};

export async function listFloatingChatSessions(): Promise<
  FloatingChatSession[]
> {
  const res = await fetch("/api/floating-chat-sessions");
  if (!res.ok) return [];
  return res.json() as Promise<FloatingChatSession[]>;
}

export async function getFloatingChatSession(
  id: string,
): Promise<FloatingChatSession | null> {
  const res = await fetch(`/api/floating-chat-sessions/${id}`);
  if (!res.ok) return null;
  return res.json() as Promise<FloatingChatSession>;
}

export async function saveFloatingChatSession(
  session: FloatingChatSession,
): Promise<void> {
  await fetch("/api/floating-chat-sessions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(session),
  });
}

export async function deleteFloatingChatSession(id: string): Promise<void> {
  await fetch(`/api/floating-chat-sessions/${id}`, { method: "DELETE" });
}

/** First user message, truncated, used as a default session title. */
export function deriveTitle(messages: FloatingChatMessage[]): string {
  const firstUser = messages.find((m) => m.role === "user");
  if (!firstUser) return "New chat";
  const trimmed = firstUser.content.trim().replace(/\s+/g, " ");
  return trimmed.length > 60 ? `${trimmed.slice(0, 60)}…` : trimmed;
}
