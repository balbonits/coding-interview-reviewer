import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { chat, type OllamaMessage } from "@/lib/ollama";
import {
  INTERVIEW_TRACKS,
  trackLabel,
  type InterviewMessage,
  type InterviewSession,
} from "@/lib/interviewSessions";
import {
  parseTagsFromMarkdown,
  parseTitleFromMarkdown,
  type InterviewNote,
} from "@/lib/interviewNotes";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NOTES_COL = "interview_notes";
const SESSIONS_COL = "interview_sessions";

const MODEL = process.env.OLLAMA_INTERVIEW_MODEL ?? "qwen2.5:14b";
const NUM_CTX = Number(process.env.OLLAMA_NOTES_NUM_CTX ?? 8192);

const SUMMARIZER_SYSTEM_PROMPT = `You are an expert study-note compiler. Given an interview transcript, produce a concise Markdown study note that helps the candidate review and improve.

Output EXACTLY this structure (no preamble, no closing remarks, no fences):

# {short topic-based title — not "Interview transcript"}

**Tags:** tag1, tag2, tag3

## Topics covered
- bullet list of distinct concepts/questions explored

## Key questions and answers
For each substantive question:
- **Q:** one-sentence summary of the question
- **A:** one-or-two-sentence summary of the candidate's answer

## Strengths
- bullet list of things the candidate handled well

## Gaps / things to revisit
- bullet list of weaknesses, vague answers, or topics they should review more

## Worth remembering
- specific syntax, formulas, definitions, or trade-offs that came up

Rules:
- Tags must be 3–8 lowercase kebab-case items (e.g. react, state-management, zustand, react-context).
- Skip greetings, small talk, and filler.
- Don't quote the transcript verbatim — paraphrase tightly.
- If the transcript is short or thin, still produce all sections; just keep them brief.`;

interface SessionDoc extends InterviewSession {
  _id: string;
}
interface NoteDoc extends InterviewNote {
  _id: string;
}

export async function GET() {
  try {
    const db = await getDb();
    const docs = await db
      .collection<NoteDoc>(NOTES_COL)
      .find({})
      .sort({ createdAt: -1 })
      .toArray();
    return NextResponse.json(docs.map(({ _id, ...rest }) => rest));
  } catch (e) {
    return err500(e);
  }
}

export async function POST(req: NextRequest) {
  try {
    const { sessionId } = (await req.json()) as { sessionId?: string };
    if (!sessionId) {
      return NextResponse.json(
        { error: "Missing sessionId" },
        { status: 400 },
      );
    }

    const db = await getDb();
    const session = await db
      .collection<SessionDoc>(SESSIONS_COL)
      .findOne({ _id: sessionId });
    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    const kickoff = INTERVIEW_TRACKS[session.track]?.kickoffPrompt ?? "";
    const visible = session.messages.filter(
      (m) => m.role !== "system" && m.content !== kickoff,
    );
    if (visible.length === 0) {
      return NextResponse.json(
        { error: "Session has no content to summarize" },
        { status: 400 },
      );
    }

    const transcript = formatTranscript(visible);
    const contextHeader = buildContextHeader(session);

    const messages: OllamaMessage[] = [
      { role: "system", content: SUMMARIZER_SYSTEM_PROMPT },
      {
        role: "user",
        content: `${contextHeader}\n\n--- TRANSCRIPT ---\n${transcript}`,
      },
    ];

    const summaryMd = await chat({
      model: MODEL,
      messages,
      numCtx: NUM_CTX,
      keepAlive: "2m",
    });

    const title =
      parseTitleFromMarkdown(summaryMd) ||
      `${trackLabel(session.track)} interview — ${new Date(session.startedAt).toLocaleDateString()}`;
    const tags = parseTagsFromMarkdown(summaryMd);

    const existing = await db
      .collection<NoteDoc>(NOTES_COL)
      .findOne({ _id: sessionId });

    const note: InterviewNote = {
      id: sessionId,
      sessionId,
      title,
      track: session.track,
      ...(session.context ? { context: session.context } : {}),
      tags,
      content: summaryMd,
      createdAt: existing?.createdAt ?? Date.now(),
      updatedAt: Date.now(),
    };

    await db
      .collection<NoteDoc>(NOTES_COL)
      .replaceOne({ _id: sessionId }, note as NoteDoc, { upsert: true });

    return NextResponse.json(note, { status: existing ? 200 : 201 });
  } catch (e) {
    return err500(e);
  }
}

function formatTranscript(messages: InterviewMessage[]): string {
  return messages
    .map((m) => {
      const role = m.role === "assistant" ? "Interviewer" : "Candidate";
      return `**${role}:**\n${m.content}`;
    })
    .join("\n\n");
}

function buildContextHeader(session: InterviewSession): string {
  const lines: string[] = [];
  lines.push(`Track: ${trackLabel(session.track)}`);
  if (session.track === "custom" && session.context) {
    const c = session.context;
    if (c.roleTitle) lines.push(`Role: ${c.roleTitle}`);
    if (c.companyName) lines.push(`Company: ${c.companyName}`);
    if (c.jobDescription)
      lines.push(`Job description:\n${c.jobDescription}`);
    if (c.notes) lines.push(`Candidate notes: ${c.notes}`);
  }
  return lines.join("\n");
}

function err500(e: unknown) {
  const msg = e instanceof Error ? e.message : String(e);
  return NextResponse.json({ error: msg }, { status: 500 });
}
