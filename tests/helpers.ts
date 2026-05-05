import { type APIRequestContext, expect } from "@playwright/test";

/**
 * Create an interview session and seed it with a fake assistant message so
 * the auto-kickoff (which would stream from Ollama) is short-circuited. This
 * makes tests deterministic and fast — the input toolbar is enabled
 * immediately rather than after a 5–15s LLM round trip.
 */
export async function createReadySession(
  request: APIRequestContext,
  track: string = "general",
): Promise<string> {
  const created = await request.post("/api/sessions", { data: { track } });
  expect(created.status(), `POST /api/sessions failed`).toBeLessThan(400);
  const session = await created.json();
  expect(session.id).toBeTruthy();

  const seeded = await request.patch(`/api/sessions/${session.id}`, {
    data: {
      messages: [
        { role: "assistant", content: "Ready. (seeded for tests)" },
      ],
    },
  });
  expect(seeded.status(), `PATCH /api/sessions/[id] failed`).toBeLessThan(400);

  return session.id as string;
}
