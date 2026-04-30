import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import type { AiCourse } from "@/lib/aiCourses";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const COL = "ai_courses";

interface CourseDoc extends AiCourse {
  _id: string;
}

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  try {
    const db = await getDb();
    const doc = await db.collection<CourseDoc>(COL).findOne({ _id: id });
    if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const { _id, ...course } = doc;
    void _id;
    return NextResponse.json(course);
  } catch (e) {
    return err500(e);
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  try {
    const db = await getDb();
    await db.collection<CourseDoc>(COL).deleteOne({ _id: id });
    return new NextResponse(null, { status: 204 });
  } catch (e) {
    return err500(e);
  }
}

function err500(e: unknown) {
  const msg = e instanceof Error ? e.message : String(e);
  return NextResponse.json({ error: msg }, { status: 500 });
}
