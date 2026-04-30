import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { generateValidatedCourse } from "@/lib/courseGenerator";
import type { AiCourse } from "@/lib/aiCourses";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const COL = "ai_courses";

interface CourseDoc extends AiCourse {
  _id: string;
}

export async function GET() {
  try {
    const db = await getDb();
    const docs = await db
      .collection<CourseDoc>(COL)
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
    const { topic, level, estimatedHours } = (await req.json()) as {
      topic?: string;
      level?: "beginner" | "intermediate" | "advanced";
      estimatedHours?: number;
    };

    const cleanTopic = topic?.trim();
    if (!cleanTopic) {
      return NextResponse.json({ error: "Missing topic" }, { status: 400 });
    }

    const generated = await generateValidatedCourse({
      topic: cleanTopic,
      level: level ?? "intermediate",
      estimatedHours: estimatedHours ?? 5,
    });

    const course: AiCourse = {
      id: crypto.randomUUID(),
      ...generated,
      prompt: cleanTopic,
      createdAt: Date.now(),
    };

    const db = await getDb();
    await db
      .collection<CourseDoc>(COL)
      .insertOne({ _id: course.id, ...course });

    return NextResponse.json(course, { status: 201 });
  } catch (e) {
    return err500(e);
  }
}

function err500(e: unknown) {
  const msg = e instanceof Error ? e.message : String(e);
  return NextResponse.json({ error: msg }, { status: 500 });
}
