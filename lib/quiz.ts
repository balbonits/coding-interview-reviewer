export type QuizDifficulty = "easy" | "medium" | "hard" | "any";

export type QuizQuestionType = "mcq" | "predict-output";

export type MCQQuestion = {
  id: string;
  type: "mcq";
  stem: string;
  options: string[]; // exactly 4
  correctIndex: number; // 0-3
  rationale: string[]; // exactly 4 — one per option
  topic: string;
  difficulty: Exclude<QuizDifficulty, "any">;
};

export type PredictOutputQuestion = {
  id: string;
  type: "predict-output";
  stem?: string;
  code: string;
  language: "js" | "ts";
  expectedOutput: string;
  rationale: string;
  topic: string;
  difficulty: Exclude<QuizDifficulty, "any">;
};

export type QuizQuestion = MCQQuestion | PredictOutputQuestion;

export type QuizSource =
  | { kind: "topic"; topic: string }
  | { kind: "interview-note"; noteId: string }
  | { kind: "note"; slug: string }
  | { kind: "exercise"; slug: string };

export type QuizGenerateRequest = {
  source: QuizSource;
  count: number;
  types: QuizQuestionType[];
  difficulty: QuizDifficulty;
};

export type QuizGenerateResponse = {
  questions: QuizQuestion[];
  requested: number;
  delivered: number;
  rejected: number;
};

export type QuizAttempt = {
  id: string;
  questionId: string;
  questionType: QuizQuestionType;
  topic: string;
  difficulty: Exclude<QuizDifficulty, "any">;
  isCorrect: boolean;
  userAnswer: string;
  answeredAt: number;
};

// ---------- Validators (also used server-side) ----------

const VALID_DIFFICULTY = new Set(["easy", "medium", "hard"]);

export function isValidMCQ(q: unknown): q is Omit<MCQQuestion, "id"> {
  if (typeof q !== "object" || !q) return false;
  const obj = q as Record<string, unknown>;
  if (obj.type !== "mcq") return false;
  if (typeof obj.stem !== "string" || obj.stem.trim().length < 6) return false;
  if (!Array.isArray(obj.options) || obj.options.length !== 4) return false;
  if (
    !obj.options.every(
      (o): o is string => typeof o === "string" && o.trim().length > 0,
    )
  )
    return false;
  if (new Set(obj.options.map((s) => (s as string).trim())).size !== 4)
    return false;
  if (
    typeof obj.correctIndex !== "number" ||
    !Number.isInteger(obj.correctIndex) ||
    obj.correctIndex < 0 ||
    obj.correctIndex > 3
  )
    return false;
  if (!Array.isArray(obj.rationale) || obj.rationale.length !== 4) return false;
  if (
    !obj.rationale.every(
      (r): r is string => typeof r === "string" && r.trim().length > 4,
    )
  )
    return false;
  if (typeof obj.topic !== "string" || obj.topic.trim().length === 0)
    return false;
  if (
    typeof obj.difficulty !== "string" ||
    !VALID_DIFFICULTY.has(obj.difficulty)
  )
    return false;
  return true;
}

export function isValidPredictOutput(
  q: unknown,
): q is Omit<PredictOutputQuestion, "id"> {
  if (typeof q !== "object" || !q) return false;
  const obj = q as Record<string, unknown>;
  if (obj.type !== "predict-output") return false;
  if (typeof obj.code !== "string" || obj.code.trim().length < 5) return false;
  if (
    typeof obj.expectedOutput !== "string" ||
    obj.expectedOutput.trim().length === 0
  )
    return false;
  if (typeof obj.rationale !== "string" || obj.rationale.trim().length < 5)
    return false;
  if (typeof obj.topic !== "string" || obj.topic.trim().length === 0)
    return false;
  if (
    typeof obj.difficulty !== "string" ||
    !VALID_DIFFICULTY.has(obj.difficulty)
  )
    return false;
  if (typeof obj.language !== "string" || !["js", "ts"].includes(obj.language))
    return false;
  if (obj.stem !== undefined && typeof obj.stem !== "string") return false;
  return true;
}

// ---------- Client API ----------

export async function generateQuiz(
  req: QuizGenerateRequest,
): Promise<QuizGenerateResponse> {
  const res = await fetch("/api/quiz/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(req),
  });
  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`Generate failed: ${res.status} ${errText.slice(0, 200)}`);
  }
  return res.json() as Promise<QuizGenerateResponse>;
}

export async function recordAttempt(attempt: QuizAttempt): Promise<void> {
  await fetch("/api/quiz/attempts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(attempt),
  });
}
