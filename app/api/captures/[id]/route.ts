import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import type { Capture } from "@/lib/captures";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const COL = "captures";

interface CaptureDoc extends Capture {
  _id: string;
}

type Params = { params: Promise<{ id: string }> };

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  try {
    const db = await getDb();
    await db.collection<CaptureDoc>(COL).deleteOne({ _id: id });
    return new NextResponse(null, { status: 204 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
