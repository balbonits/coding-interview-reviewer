import vm from "node:vm";
import { chat, type OllamaMessage } from "@/lib/ollama";
import {
  isValidMCQ,
  isValidPredictOutput,
  type MCQQuestion,
  type PredictOutputQuestion,
  type QuizDifficulty,
  type QuizQuestion,
  type QuizQuestionType,
} from "@/lib/quiz";

const MODEL = process.env.OLLAMA_INTERVIEW_MODEL ?? "qwen2.5:14b";
const NUM_CTX = Number(process.env.OLLAMA_QUIZ_NUM_CTX ?? 8192);

// Generator system prompt — strict JSON-only output. Detail enforced because
// qwen2.5:14b will happily wander into prose if you let it.
const SYSTEM_PROMPT = `You are an expert front-end interview question writer trained in pedagogical question design.

Output STRICT JSON: a single JSON array of question objects. NO preamble, NO closing remarks, NO Markdown fences. Just the array.

Each MCQ object MUST have:
- "type": "mcq"
- "stem": clear, focused question text ending in "?"
- "options": array of EXACTLY 4 distinct strings, similar in length and style
- "correctIndex": integer 0–3 (index of the correct option)
- "rationale": array of EXACTLY 4 strings; rationale[i] explains why options[i] is right or wrong (1–2 sentences)
- "topic": short kebab-case tag (e.g. "closures")
- "difficulty": "easy" | "medium" | "hard"

Each predict-output object MUST have:
- "type": "predict-output"
- "stem": (optional) one sentence of context
- "code": SHORT JavaScript snippet (3–15 lines) that uses console.log to produce its output. SYNCHRONOUS ONLY — no setTimeout, no Promises, no async, no await.
- "language": "js"
- "expectedOutput": EXACTLY what gets logged, line by line. No quotes around strings, no extras. For an object, use JSON.stringify-style output.
- "rationale": one paragraph explaining why
- "topic": short kebab-case tag
- "difficulty": "easy" | "medium" | "hard"

CRITICAL design rules:
- Distractors must reflect COMMON MISCONCEPTIONS, not random nonsense.
- Each distractor must be plausible to a learner who hasn't mastered the topic.
- All 4 options should be similar in form (all single words, or all short phrases — don't mix).
- Never use "all of the above" or "none of the above".
- Never include the answer in the question wording.
- For predict-output: trace the snippet yourself BEFORE writing expectedOutput. If you're unsure, write a simpler snippet.
- Output ONLY the JSON array. No prose around it. No \`\`\`json fences.`;

type RawQuestion =
  | Omit<MCQQuestion, "id">
  | Omit<PredictOutputQuestion, "id">;

export async function generateValidatedQuiz(opts: {
  topic: string;
  count: number;
  types: QuizQuestionType[];
  difficulty: QuizDifficulty;
  extraContext?: string;
}): Promise<{ questions: QuizQuestion[]; rejected: number }> {
  const valid: QuizQuestion[] = [];
  let rejected = 0;
  let attempt = 0;
  const maxAttempts = 3;

  while (valid.length < opts.count && attempt < maxAttempts) {
    const remaining = opts.count - valid.length;
    // Ask for a small surplus to absorb expected rejections.
    const ask = Math.min(remaining + 2, opts.count + 4);
    const candidates = await callGenerator({
      topic: opts.topic,
      count: ask,
      types: opts.types,
      difficulty: opts.difficulty,
      extraContext: opts.extraContext,
    });

    for (const c of candidates) {
      if (valid.length >= opts.count) break;
      const checked = await validateAndFinalize(c);
      if (!checked) {
        rejected++;
        continue;
      }
      valid.push(checked);
    }
    attempt++;
  }

  return { questions: valid, rejected };
}

async function callGenerator(opts: {
  topic: string;
  count: number;
  types: QuizQuestionType[];
  difficulty: QuizDifficulty;
  extraContext?: string;
}): Promise<RawQuestion[]> {
  const typeList = opts.types.join(", ");
  const difficultyClause =
    opts.difficulty === "any"
      ? "Mix easy, medium, and hard difficulties."
      : `Target difficulty: ${opts.difficulty}.`;

  const userPrompt = [
    `Generate ${opts.count} quiz questions on the topic: "${opts.topic}".`,
    `Question types to include: ${typeList}.`,
    difficultyClause,
    opts.extraContext ? `\nAdditional context to draw from:\n${opts.extraContext}` : "",
    `\nRespond with ONLY the JSON array.`,
  ].join("\n");

  const messages: OllamaMessage[] = [
    { role: "system", content: SYSTEM_PROMPT },
    { role: "user", content: userPrompt },
  ];

  const raw = await chat({
    model: MODEL,
    messages,
    numCtx: NUM_CTX,
    keepAlive: "2m",
  });

  return parseJsonArray(raw);
}

/** Salvage a JSON array from model output that might have stray prose / fences. */
function parseJsonArray(raw: string): RawQuestion[] {
  // Strip ```json fences if present
  let s = raw.trim();
  s = s.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/i, "");
  // If there's prose around, find the first `[` and last `]`
  const start = s.indexOf("[");
  const end = s.lastIndexOf("]");
  if (start === -1 || end === -1 || end <= start) return [];
  const slice = s.slice(start, end + 1);
  try {
    const parsed = JSON.parse(slice);
    if (Array.isArray(parsed)) return parsed as RawQuestion[];
    return [];
  } catch {
    return [];
  }
}

async function validateAndFinalize(
  raw: RawQuestion,
): Promise<QuizQuestion | null> {
  if (isValidMCQ(raw)) {
    return { ...raw, id: cryptoUUID() };
  }
  if (isValidPredictOutput(raw)) {
    if (raw.language === "ts") {
      // We don't transpile TS in v1 — only execute JS. Fall back to trust.
      return { ...raw, id: cryptoUUID() };
    }
    const verified = await verifyPredictOutput(raw);
    if (!verified) return null;
    return { ...raw, id: cryptoUUID() };
  }
  return null;
}

function cryptoUUID(): string {
  return globalThis.crypto.randomUUID();
}

/**
 * Run the AI's snippet in a fresh vm context, capture console.log output,
 * compare against the AI's claimed `expectedOutput`. Discard on mismatch
 * or any thrown error. This catches the bulk of AI hallucinations.
 */
async function verifyPredictOutput(
  q: Omit<PredictOutputQuestion, "id">,
): Promise<boolean> {
  const logs: string[] = [];
  const sandbox: Record<string, unknown> = {
    console: {
      log: (...args: unknown[]) => {
        logs.push(args.map(formatForLog).join(" "));
      },
      error: (...args: unknown[]) => {
        logs.push(args.map(formatForLog).join(" "));
      },
      warn: (...args: unknown[]) => {
        logs.push(args.map(formatForLog).join(" "));
      },
    },
  };

  try {
    vm.runInNewContext(q.code, sandbox, { timeout: 1000 });
  } catch {
    return false;
  }

  const actual = logs.join("\n").trim();
  const expected = q.expectedOutput.trim();
  return normalizeOutput(actual) === normalizeOutput(expected);
}

function normalizeOutput(s: string): string {
  // Collapse trailing whitespace per line + flatten extra blank lines.
  return s
    .split("\n")
    .map((l) => l.trimEnd())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n");
}

function formatForLog(v: unknown): string {
  if (v === null) return "null";
  if (v === undefined) return "undefined";
  if (typeof v === "function") return "[Function]";
  if (typeof v === "object") {
    try {
      return JSON.stringify(v);
    } catch {
      return String(v);
    }
  }
  return String(v);
}
