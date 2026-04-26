import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import type { Capture } from "@/lib/captures";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const COL = "captures";

interface CaptureDoc extends Capture {
  _id: string;
}

export async function GET() {
  try {
    const db = await getDb();
    const docs = await db
      .collection<CaptureDoc>(COL)
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
    const capture = (await req.json()) as Capture;
    const doc: CaptureDoc = { _id: capture.id, ...capture };
    const db = await getDb();
    await db.collection<CaptureDoc>(COL).insertOne(doc);
    return NextResponse.json(capture, { status: 201 });
  } catch (e) {
    return err500(e);
  }
}

function err500(e: unknown) {
  const msg = e instanceof Error ? e.message : String(e);
  return NextResponse.json({ error: msg }, { status: 500 });
}
