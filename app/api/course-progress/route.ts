import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import type { CourseProgress, CourseStep } from "@/lib/courses";
import { makeFresh, type ReviewItem } from "@/lib/spaced-repetition";
import { getNote } from "@/lib/notes";
import { getExercise } from "@/lib/exercises";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const COL = "course_progress";

interface ProgressDoc extends CourseProgress {
  _id: string;
}
interface ReviewDoc extends ReviewItem {
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
    const { courseSlug, stepId, step } = (await req.json()) as {
      courseSlug?: string;
      stepId?: string;
      step?: CourseStep;
    };
    if (!courseSlug || !stepId) {
      return NextResponse.json(
        { error: "courseSlug and stepId required" },
        { status: 400 },
      );
    }
    const db = await getDb();
    const doc: ProgressDoc = {
      _id: stepId,
      stepId,
      courseSlug,
      completedAt: Date.now(),
    };
    await db
      .collection<ProgressDoc>(COL)
      .replaceOne({ _id: stepId }, doc, { upsert: true });

    // Phase 3: when a note/exercise step is marked done, seed a fresh entry
    // into the SM-2 review queue (only if it doesn't already exist — we
    // never overwrite an in-progress review item's schedule).
    let reviewSeeded = false;
    if (step?.kind === "note" || step?.kind === "exercise") {
      reviewSeeded = await maybeSeedReview(step);
    }

    return NextResponse.json({ ...doc, reviewSeeded }, { status: 201 });
  } catch (e) {
    return err500(e);
  }
}

async function maybeSeedReview(
  step: Extract<CourseStep, { kind: "note" | "exercise" }>,
): Promise<boolean> {
  const id = `${step.kind}:${step.slug}`;
  const db = await getDb();
  const existing = await db
    .collection<ReviewDoc>("review_items")
    .findOne({ _id: id });
  if (existing) return false;

  let title = step.title ?? step.slug;
  if (step.kind === "note") {
    const note = await getNote(step.slug);
    if (note) title = note.title;
  } else {
    const ex = await getExercise(step.slug);
    if (ex) title = ex.meta.title;
  }

  const fresh = makeFresh({ type: step.kind, slug: step.slug, title });
  await db
    .collection<ReviewDoc>("review_items")
    .insertOne({ _id: fresh.id, ...fresh });
  return true;
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
