import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import type { FloatingChatSession } from "@/lib/floatingChatSessions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const COL = "floating_chat_sessions";

interface SessionDoc extends FloatingChatSession {
  _id: string;
}

export async function GET() {
  try {
    const db = await getDb();
    const docs = await db
      .collection<SessionDoc>(COL)
      .find({})
      .sort({ updatedAt: -1 })
      .limit(50)
      .toArray();
    return NextResponse.json(docs.map(({ _id, ...rest }) => rest));
  } catch (e) {
    return err500(e);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = (await req.json()) as FloatingChatSession;
    if (!session.id || !Array.isArray(session.messages)) {
      return NextResponse.json(
        { error: "id and messages required" },
        { status: 400 },
      );
    }
    const doc: SessionDoc = { _id: session.id, ...session };
    const db = await getDb();
    await db
      .collection<SessionDoc>(COL)
      .replaceOne({ _id: session.id }, doc as SessionDoc, { upsert: true });
    return NextResponse.json(session);
  } catch (e) {
    return err500(e);
  }
}

function err500(e: unknown) {
  const msg = e instanceof Error ? e.message : String(e);
  return NextResponse.json({ error: msg }, { status: 500 });
}
