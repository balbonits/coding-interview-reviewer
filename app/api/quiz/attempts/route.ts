import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import type { QuizAttempt } from "@/lib/quiz";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const COL = "quiz_attempts";

interface AttemptDoc extends QuizAttempt {
  _id: string;
}

export async function GET() {
  try {
    const db = await getDb();
    const docs = await db
      .collection<AttemptDoc>(COL)
      .find({})
      .sort({ answeredAt: -1 })
      .limit(500)
      .toArray();
    return NextResponse.json(docs.map(({ _id, ...rest }) => rest));
  } catch (e) {
    return err500(e);
  }
}

export async function POST(req: NextRequest) {
  try {
    const attempt = (await req.json()) as QuizAttempt;
    if (!attempt.id || !attempt.questionId) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }
    const doc: AttemptDoc = { _id: attempt.id, ...attempt };
    const db = await getDb();
    await db.collection<AttemptDoc>(COL).insertOne(doc);
    return NextResponse.json(attempt, { status: 201 });
  } catch (e) {
    return err500(e);
  }
}

function err500(e: unknown) {
  const msg = e instanceof Error ? e.message : String(e);
  return NextResponse.json({ error: msg }, { status: 500 });
}
