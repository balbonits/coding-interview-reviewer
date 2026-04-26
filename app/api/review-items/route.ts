import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import type { ReviewItem } from "@/lib/spaced-repetition";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const COL = "review_items";

interface ReviewDoc extends ReviewItem {
  _id: string;
}

export async function GET() {
  try {
    const db = await getDb();
    const docs = await db.collection<ReviewDoc>(COL).find({}).toArray();
    return NextResponse.json(docs.map(({ _id, ...rest }) => rest));
  } catch (e) {
    return err500(e);
  }
}

/** Upsert a single review item (called after grading) */
export async function POST(req: NextRequest) {
  try {
    const item = (await req.json()) as ReviewItem;
    const doc: ReviewDoc = { _id: item.id, ...item };
    const db = await getDb();
    await db.collection<ReviewDoc>(COL).replaceOne(
      { _id: item.id },
      doc,
      { upsert: true },
    );
    return NextResponse.json(item);
  } catch (e) {
    return err500(e);
  }
}

/** Bulk upsert — used to seed new items that don't exist yet */
export async function PUT(req: NextRequest) {
  try {
    const items = (await req.json()) as ReviewItem[];
    if (!items.length) return NextResponse.json({ upserted: 0 });
    const db = await getDb();
    const ops = items.map((item) => ({
      replaceOne: {
        filter: { _id: item.id } as { _id: string },
        replacement: { _id: item.id, ...item } as ReviewDoc,
        upsert: true,
      },
    }));
    const result = await db.collection<ReviewDoc>(COL).bulkWrite(ops);
    return NextResponse.json({ upserted: result.upsertedCount });
  } catch (e) {
    return err500(e);
  }
}

function err500(e: unknown) {
  const msg = e instanceof Error ? e.message : String(e);
  return NextResponse.json({ error: msg }, { status: 500 });
}
