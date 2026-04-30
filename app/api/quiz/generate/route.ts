import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { generateValidatedQuiz } from "@/lib/quizGenerator";
import { getNote } from "@/lib/notes";
import { getExercise } from "@/lib/exercises";
import type {
  QuizGenerateRequest,
  QuizGenerateResponse,
} from "@/lib/quiz";
import type { InterviewNote } from "@/lib/interviewNotes";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_COUNT = 15;

interface NoteDoc extends InterviewNote {
  _id: string;
}

export async function POST(req: NextRequest) {
  let body: QuizGenerateRequest;
  try {
    body = (await req.json()) as QuizGenerateRequest;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.source || !body.types || body.types.length === 0) {
    return NextResponse.json(
      { error: "Missing source or types" },
      { status: 400 },
    );
  }

  const count = Math.max(1, Math.min(MAX_COUNT, body.count ?? 5));
  const difficulty = body.difficulty ?? "any";

  let topic: string;
  let extraContext: string | undefined;

  try {
    if (body.source.kind === "topic") {
      topic = body.source.topic.trim();
      if (!topic) {
        return NextResponse.json(
          { error: "Topic cannot be empty" },
          { status: 400 },
        );
      }
    } else if (body.source.kind === "interview-note") {
      const db = await getDb();
      const note = await db
        .collection<NoteDoc>("interview_notes")
        .findOne({ _id: body.source.noteId });
      if (!note) {
        return NextResponse.json(
          { error: "Interview note not found" },
          { status: 404 },
        );
      }
      topic =
        note.tags.length > 0
          ? note.tags.slice(0, 3).join(", ")
          : note.title;
      extraContext = `Source: interview study note "${note.title}"\n\n${note.content}`;
    } else if (body.source.kind === "note") {
      const note = await getNote(body.source.slug);
      if (!note) {
        return NextResponse.json(
          { error: "Note not found" },
          { status: 404 },
        );
      }
      topic =
        note.tags.length > 0 ? note.tags.slice(0, 3).join(", ") : note.title;
      extraContext = `Source: note "${note.title}" (tags: ${note.tags.join(", ")})\n\n${note.content}`;
    } else if (body.source.kind === "exercise") {
      const ex = await getExercise(body.source.slug);
      if (!ex) {
        return NextResponse.json(
          { error: "Exercise not found" },
          { status: 404 },
        );
      }
      const m = ex.meta;
      topic = m.tags.length > 0 ? m.tags.slice(0, 3).join(", ") : m.title;
      extraContext = `Source: coding exercise "${m.title}" (${m.difficulty}, tags: ${m.tags.join(", ")})\n\nProblem statement:\n${ex.problemContent}\n\nConcepts: ${m.concepts?.join(", ") ?? "(none)"}`;
    } else {
      return NextResponse.json(
        { error: "Unknown source kind" },
        { status: 400 },
      );
    }

    const result = await generateValidatedQuiz({
      topic,
      count,
      types: body.types,
      difficulty,
      extraContext,
    });

    const response: QuizGenerateResponse = {
      questions: result.questions,
      requested: count,
      delivered: result.questions.length,
      rejected: result.rejected,
    };
    return NextResponse.json(response);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
