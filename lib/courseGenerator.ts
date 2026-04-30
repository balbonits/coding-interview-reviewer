import "server-only";
import { chat, type OllamaMessage } from "@/lib/ollama";
import { listNotes } from "@/lib/notes";
import { listExercises } from "@/lib/exercises";
import type {
  CourseFrontmatter,
  CourseSection,
  CourseStep,
} from "@/lib/courses";

const MODEL = process.env.OLLAMA_INTERVIEW_MODEL ?? "qwen2.5:14b";
const NUM_CTX = Number(process.env.OLLAMA_COURSE_NUM_CTX ?? 12288);

export type GeneratedCourse = CourseFrontmatter & {
  intro: string;
};

export async function generateValidatedCourse(opts: {
  topic: string;
  level: "beginner" | "intermediate" | "advanced";
  estimatedHours: number;
}): Promise<GeneratedCourse> {
  const notes = await listNotes();
  const exercises = await listExercises();

  const noteCatalog = notes
    .map(
      (n) =>
        `  - slug: "${n.slug}"  title: "${n.title}"  tags: [${n.tags.join(", ")}]`,
    )
    .join("\n");
  const exerciseCatalog = exercises
    .map(
      (e) =>
        `  - slug: "${e.slug}"  title: "${e.title}"  difficulty: ${e.difficulty}  tags: [${e.tags.join(", ")}]`,
    )
    .join("\n");

  const validNoteSlugs = new Set(notes.map((n) => n.slug));
  const validExerciseSlugs = new Set(exercises.map((e) => e.slug));
  const validInterviewTracks = new Set([
    "javascript",
    "dsa",
    "react",
    "typescript",
    "html-css",
    "system-design",
    "general",
  ]);

  const SYSTEM_PROMPT = `You are an expert curriculum designer. Build a focused, coherent learning course on the requested topic by selecting from the available content below and weaving in AI-generated quizzes and mock interviews.

AVAILABLE CONTENT:

Notes (use these exact slugs):
${noteCatalog}

Exercises (use these exact slugs):
${exerciseCatalog}

Interview tracks (use these exact values for the "track" field):
${[...validInterviewTracks].map((t) => `  - "${t}"`).join("\n")}

OUTPUT: a single JSON object matching this exact schema. No prose, no Markdown fences — just the JSON.

{
  "title": "<short course title — not 'Course on X', something tighter>",
  "description": "<one-sentence description of what the course covers>",
  "level": "<beginner|intermediate|advanced>",
  "estimatedHours": <number>,
  "tags": ["<5–8 short kebab-case topic tags>"],
  "intro": "<2–4 sentences of plain text introducing the course; this is rendered as Markdown above the lesson tree>",
  "sections": [
    {
      "title": "<section title>",
      "steps": [
        { "kind": "note", "slug": "<must match a slug from the Notes catalog>", "note": "<optional one-line context>" },
        { "kind": "exercise", "slug": "<must match a slug from the Exercises catalog>", "note": "<optional>" },
        { "kind": "quiz", "topic": "<short topic prompt the AI will use to generate questions>", "count": 5, "title": "<short quiz title>" },
        { "kind": "interview", "track": "<must match one of the interview track values>", "title": "<optional>" }
      ]
    }
  ]
}

RULES:
- 4–6 sections total. 2–4 steps per section.
- Sequence sections from foundational to advanced.
- Mix step kinds within sections — don't make a section that's only quizzes or only notes.
- Every "note" slug MUST come from the Notes catalog above. Same for exercises and interview tracks. DO NOT invent slugs.
- If the requested topic doesn't have a perfect note/exercise match, pick the closest available content and lean on AI quizzes for the gap.
- Keep estimatedHours realistic given the step count.
- Do not output any text before or after the JSON object.`;

  const messages: OllamaMessage[] = [
    { role: "system", content: SYSTEM_PROMPT },
    {
      role: "user",
      content: `Topic: ${opts.topic}\nTarget level: ${opts.level}\nTarget length: ~${opts.estimatedHours} hours\n\nGenerate the course JSON now.`,
    },
  ];

  let lastError = "";
  for (let attempt = 0; attempt < 3; attempt++) {
    let raw: string;
    try {
      raw = await chat({
        model: MODEL,
        messages,
        numCtx: NUM_CTX,
        keepAlive: "2m",
      });
    } catch (e) {
      lastError = e instanceof Error ? e.message : String(e);
      continue;
    }

    const parsed = parseJsonObject(raw);
    if (!parsed) {
      lastError = "Failed to parse course JSON from model output";
      messages.push({ role: "assistant", content: raw });
      messages.push({
        role: "user",
        content: "That wasn't valid JSON. Output ONLY the JSON object, no fences, no prose.",
      });
      continue;
    }

    const validation = validateCourse(parsed, validNoteSlugs, validExerciseSlugs, validInterviewTracks);
    if (validation.kind === "ok") {
      return validation.course;
    }

    lastError = validation.errors.join("; ");
    messages.push({ role: "assistant", content: raw });
    messages.push({
      role: "user",
      content: `That output had problems: ${lastError}. Fix and re-emit the entire JSON object. Remember to use ONLY slugs from the catalogs.`,
    });
  }

  throw new Error(`Course generation failed after retries: ${lastError}`);
}

function parseJsonObject(raw: string): unknown {
  let s = raw.trim();
  s = s.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/i, "");
  const start = s.indexOf("{");
  const end = s.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return null;
  try {
    return JSON.parse(s.slice(start, end + 1));
  } catch {
    return null;
  }
}

type ValidationResult =
  | { kind: "ok"; course: GeneratedCourse }
  | { kind: "error"; errors: string[] };

function validateCourse(
  raw: unknown,
  noteSlugs: Set<string>,
  exerciseSlugs: Set<string>,
  trackSet: Set<string>,
): ValidationResult {
  const errors: string[] = [];
  if (typeof raw !== "object" || !raw) {
    return { kind: "error", errors: ["Not an object"] };
  }
  const o = raw as Record<string, unknown>;

  const title = typeof o.title === "string" ? o.title.trim() : "";
  if (!title) errors.push("missing title");

  const description =
    typeof o.description === "string" ? o.description.trim() : "";
  if (!description) errors.push("missing description");

  const level = o.level as string;
  if (!["beginner", "intermediate", "advanced"].includes(level)) {
    errors.push("level must be beginner|intermediate|advanced");
  }

  const estimatedHours = Number(o.estimatedHours);
  if (!Number.isFinite(estimatedHours) || estimatedHours <= 0) {
    errors.push("estimatedHours must be a positive number");
  }

  const tags = Array.isArray(o.tags)
    ? o.tags.filter((t): t is string => typeof t === "string")
    : [];
  if (tags.length === 0) errors.push("at least one tag required");

  const intro = typeof o.intro === "string" ? o.intro.trim() : "";

  const rawSections = Array.isArray(o.sections) ? o.sections : [];
  if (rawSections.length === 0) {
    errors.push("at least one section required");
  }

  const sections: CourseSection[] = [];
  rawSections.forEach((rs, sIdx) => {
    if (typeof rs !== "object" || !rs) {
      errors.push(`section ${sIdx} not an object`);
      return;
    }
    const sec = rs as Record<string, unknown>;
    const sTitle = typeof sec.title === "string" ? sec.title.trim() : "";
    if (!sTitle) errors.push(`section ${sIdx} missing title`);

    const rawSteps = Array.isArray(sec.steps) ? sec.steps : [];
    if (rawSteps.length === 0) errors.push(`section ${sIdx} has no steps`);

    const steps: CourseStep[] = [];
    rawSteps.forEach((rstep, stIdx) => {
      if (typeof rstep !== "object" || !rstep) return;
      const st = rstep as Record<string, unknown>;
      const kind = st.kind;
      if (kind === "note") {
        const slug = String(st.slug ?? "");
        if (!noteSlugs.has(slug)) {
          errors.push(`section ${sIdx} step ${stIdx}: unknown note slug "${slug}"`);
          return;
        }
        steps.push({
          kind: "note",
          slug,
          ...(typeof st.note === "string" ? { note: st.note } : {}),
          ...(typeof st.title === "string" ? { title: st.title } : {}),
        });
      } else if (kind === "exercise") {
        const slug = String(st.slug ?? "");
        if (!exerciseSlugs.has(slug)) {
          errors.push(`section ${sIdx} step ${stIdx}: unknown exercise slug "${slug}"`);
          return;
        }
        steps.push({
          kind: "exercise",
          slug,
          ...(typeof st.note === "string" ? { note: st.note } : {}),
          ...(typeof st.title === "string" ? { title: st.title } : {}),
        });
      } else if (kind === "quiz") {
        const topic = typeof st.topic === "string" ? st.topic.trim() : "";
        if (!topic) {
          errors.push(`section ${sIdx} step ${stIdx}: quiz missing topic`);
          return;
        }
        const count = Number(st.count ?? 5);
        steps.push({
          kind: "quiz",
          topic,
          count: Number.isFinite(count) && count > 0 ? Math.min(15, count) : 5,
          ...(typeof st.title === "string" ? { title: st.title } : {}),
          ...(typeof st.note === "string" ? { note: st.note } : {}),
        });
      } else if (kind === "interview") {
        const track = String(st.track ?? "");
        if (!trackSet.has(track)) {
          errors.push(`section ${sIdx} step ${stIdx}: unknown interview track "${track}"`);
          return;
        }
        steps.push({
          kind: "interview",
          track: track as CourseStep extends { kind: "interview"; track: infer T }
            ? T
            : never,
          ...(typeof st.title === "string" ? { title: st.title } : {}),
          ...(typeof st.note === "string" ? { note: st.note } : {}),
        });
      } else {
        errors.push(`section ${sIdx} step ${stIdx}: unknown kind "${String(kind)}"`);
      }
    });

    if (steps.length > 0) {
      sections.push({ title: sTitle, steps });
    }
  });

  if (errors.length > 0) {
    return { kind: "error", errors };
  }

  return {
    kind: "ok",
    course: {
      title,
      description,
      level: level as "beginner" | "intermediate" | "advanced",
      estimatedHours,
      tags,
      sections,
      intro,
    },
  };
}
