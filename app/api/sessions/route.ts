import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import type {
  InterviewContext,
  InterviewSession,
  InterviewTrack,
} from "@/lib/interviewSessions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const COL = "interview_sessions";

interface SessionDoc extends InterviewSession {
  _id: string;
}

export async function GET() {
  try {
    const db = await getDb();
    const docs = await db
      .collection<SessionDoc>(COL)
      .find({})
      .sort({ startedAt: -1 })
      .toArray();
    return NextResponse.json(docs.map(({ _id, ...rest }) => rest));
  } catch (e) {
    return err500(e);
  }
}

export async function POST(req: NextRequest) {
  try {
    const { track, context } = (await req.json()) as {
      track: InterviewTrack;
      context?: InterviewContext;
    };
    const resolvedTrack: InterviewTrack = track ?? "javascript";
    const session: InterviewSession = {
      id: crypto.randomUUID(),
      track: resolvedTrack,
      ...(resolvedTrack === "custom" && context ? { context } : {}),
      startedAt: Date.now(),
      endedAt: null,
      messages: [],
    };
    const doc: SessionDoc = { _id: session.id, ...session };
    const db = await getDb();
    await db.collection<SessionDoc>(COL).insertOne(doc);
    return NextResponse.json(session, { status: 201 });
  } catch (e) {
    return err500(e);
  }
}

function err500(e: unknown) {
  const msg = e instanceof Error ? e.message : String(e);
  return NextResponse.json({ error: msg }, { status: 500 });
}
