import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import type { CourseProgress } from "@/lib/courses";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const COL = "course_progress";

interface ProgressDoc extends CourseProgress {
  _id: string;
}

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const course = url.searchParams.get("course");
    const filter = course ? { courseSlug: course } : {};
    const db = await getDb();
    const docs = await db
      .collection<ProgressDoc>(COL)
      .find(filter)
      .toArray();
    return NextResponse.json(docs.map(({ _id, ...rest }) => rest));
  } catch (e) {
    return err500(e);
  }
}

export async function POST(req: NextRequest) {
  try {
    const { courseSlug, stepId } = (await req.json()) as {
      courseSlug?: string;
      stepId?: string;
    };
    if (!courseSlug || !stepId) {
      return NextResponse.json(
        { error: "courseSlug and stepId required" },
        { status: 400 },
      );
    }
    const doc: ProgressDoc = {
      _id: stepId,
      stepId,
      courseSlug,
      completedAt: Date.now(),
    };
    const db = await getDb();
    // Upsert so re-marking is idempotent
    await db
      .collection<ProgressDoc>(COL)
      .replaceOne({ _id: stepId }, doc, { upsert: true });
    return NextResponse.json(doc, { status: 201 });
  } catch (e) {
    return err500(e);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const stepId = url.searchParams.get("stepId");
    if (!stepId) {
      return NextResponse.json({ error: "stepId required" }, { status: 400 });
    }
    const db = await getDb();
    await db.collection<ProgressDoc>(COL).deleteOne({ _id: stepId });
    return new NextResponse(null, { status: 204 });
  } catch (e) {
    return err500(e);
  }
}

function err500(e: unknown) {
  const msg = e instanceof Error ? e.message : String(e);
  return NextResponse.json({ error: msg }, { status: 500 });
}
