"use client";

import {
  Suspense,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  generateQuiz,
  recordAttempt,
  type MCQQuestion,
  type PredictOutputQuestion,
  type QuizAttempt,
  type QuizDifficulty,
  type QuizQuestion,
  type QuizQuestionType,
  type QuizSource,
} from "@/lib/quiz";
import {
  listInterviewNotes,
  type InterviewNote,
} from "@/lib/interviewNotes";

type Phase =
  | { kind: "idle" }
  | { kind: "generating" }
  | { kind: "active"; questions: QuizQuestion[]; idx: number }
  | { kind: "summary"; questions: QuizQuestion[]; attempts: QuizAttempt[] };

type AnswerState =
  | { status: "unanswered" }
  | {
      status: "answered";
      userAnswer: string;
      isCorrect: boolean;
    };

const DEFAULT_TYPES: QuizQuestionType[] = ["mcq", "predict-output"];

export default function QuizPage() {
  return (
    <Suspense fallback={<p className="text-muted-foreground">Loading…</p>}>
      <QuizPageInner />
    </Suspense>
  );
}

function QuizPageInner() {
  const searchParams = useSearchParams();
  const autoTriggeredRef = useRef(false);
  const [phase, setPhase] = useState<Phase>({ kind: "idle" });
  const [attempts, setAttempts] = useState<QuizAttempt[]>([]);
  const [answer, setAnswer] = useState<AnswerState>({ status: "unanswered" });
  const [error, setError] = useState<string | null>(null);
  const [savedNotes, setSavedNotes] = useState<InterviewNote[]>([]);

  // form state
  const [sourceKind, setSourceKind] = useState<"topic" | "interview-note">(
    "topic",
  );
  const [topic, setTopic] = useState("");
  const [selectedNoteId, setSelectedNoteId] = useState<string>("");
  const [count, setCount] = useState(5);
  const [enabledTypes, setEnabledTypes] =
    useState<QuizQuestionType[]>(DEFAULT_TYPES);
  const [difficulty, setDifficulty] = useState<QuizDifficulty>("any");
  const [rejectedNotice, setRejectedNotice] = useState<{
    delivered: number;
    requested: number;
    rejected: number;
  } | null>(null);

  useEffect(() => {
    listInterviewNotes().then(setSavedNotes).catch(() => setSavedNotes([]));
  }, []);

  function toggleType(t: QuizQuestionType) {
    setEnabledTypes((prev) =>
      prev.includes(t)
        ? prev.filter((x) => x !== t)
        : [...prev, t],
    );
  }

  async function runGeneration(source: QuizSource) {
    setError(null);
    setRejectedNotice(null);
    setPhase({ kind: "generating" });
    try {
      const res = await generateQuiz({
        source,
        count,
        types: enabledTypes,
        difficulty,
      });
      if (res.questions.length === 0) {
        setError(
          `Couldn't generate any valid questions (rejected ${res.rejected}). Try a different topic or fewer types.`,
        );
        setPhase({ kind: "idle" });
        return;
      }
      if (res.delivered < res.requested) {
        setRejectedNotice({
          delivered: res.delivered,
          requested: res.requested,
          rejected: res.rejected,
        });
      }
      setAttempts([]);
      setAnswer({ status: "unanswered" });
      setPhase({ kind: "active", questions: res.questions, idx: 0 });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Generation failed.");
      setPhase({ kind: "idle" });
    }
  }

  async function handleGenerate(e: FormEvent) {
    e.preventDefault();
    if (enabledTypes.length === 0) {
      setError("Pick at least one question type.");
      return;
    }
    let source: QuizSource;
    if (sourceKind === "topic") {
      if (!topic.trim()) {
        setError("Enter a topic.");
        return;
      }
      source = { kind: "topic", topic: topic.trim() };
    } else {
      if (!selectedNoteId) {
        setError("Pick a saved interview note.");
        return;
      }
      source = { kind: "interview-note", noteId: selectedNoteId };
    }
    await runGeneration(source);
  }

  // Auto-trigger generation when URL contains source params
  // (from "Quiz me" buttons across the app).
  useEffect(() => {
    if (autoTriggeredRef.current) return;
    if (phase.kind !== "idle") return;
    const sourceParam = searchParams.get("source");
    const id = searchParams.get("id");
    const slug = searchParams.get("slug");
    const topicParam = searchParams.get("topic");

    let source: QuizSource | null = null;
    if (sourceParam === "topic" && topicParam) {
      source = { kind: "topic", topic: topicParam };
      setSourceKind("topic");
      setTopic(topicParam);
    } else if (sourceParam === "interview-note" && id) {
      source = { kind: "interview-note", noteId: id };
      setSourceKind("interview-note");
      setSelectedNoteId(id);
    } else if (sourceParam === "note" && slug) {
      source = { kind: "note", slug };
    } else if (sourceParam === "exercise" && slug) {
      source = { kind: "exercise", slug };
    }

    if (source) {
      autoTriggeredRef.current = true;
      void runGeneration(source);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, phase.kind]);

  function submitAnswer(userAnswer: string, isCorrect: boolean) {
    if (phase.kind !== "active") return;
    const q = phase.questions[phase.idx];
    setAnswer({ status: "answered", userAnswer, isCorrect });
    const attempt: QuizAttempt = {
      id: crypto.randomUUID(),
      questionId: q.id,
      questionType: q.type,
      topic: q.topic,
      difficulty: q.difficulty,
      isCorrect,
      userAnswer,
      answeredAt: Date.now(),
    };
    setAttempts((prev) => [...prev, attempt]);
    void recordAttempt(attempt);
  }

  function nextQuestion() {
    if (phase.kind !== "active") return;
    const nextIdx = phase.idx + 1;
    if (nextIdx >= phase.questions.length) {
      setPhase({
        kind: "summary",
        questions: phase.questions,
        attempts,
      });
      return;
    }
    setAnswer({ status: "unanswered" });
    setPhase({ ...phase, idx: nextIdx });
  }

  function reset() {
    setPhase({ kind: "idle" });
    setAttempts([]);
    setAnswer({ status: "unanswered" });
    setError(null);
  }

  // ---- Render ----

  if (phase.kind === "active") {
    const q = phase.questions[phase.idx];
    return (
      <QuizActive
        question={q}
        questionNumber={phase.idx + 1}
        total={phase.questions.length}
        answer={answer}
        onSubmit={submitAnswer}
        onNext={nextQuestion}
      />
    );
  }

  if (phase.kind === "summary") {
    return (
      <QuizSummary
        questions={phase.questions}
        attempts={phase.attempts}
        onReset={reset}
      />
    );
  }

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Quiz</h1>
        <p className="text-muted-foreground max-w-2xl">
          Drill yourself on a topic. The local AI generates questions, then{" "}
          <strong>every question is validated</strong> before you see it —
          schema-checked, and predict-output snippets are actually executed
          to confirm the expected output is correct.
        </p>
      </header>

      <form
        onSubmit={handleGenerate}
        className="space-y-5 rounded-xl border border-border bg-card p-5"
      >
        <fieldset className="space-y-3">
          <legend className="text-sm font-semibold">Source</legend>
          <div className="flex gap-2">
            <SourcePill
              active={sourceKind === "topic"}
              onClick={() => setSourceKind("topic")}
            >
              Topic prompt
            </SourcePill>
            <SourcePill
              active={sourceKind === "interview-note"}
              onClick={() => setSourceKind("interview-note")}
              disabled={savedNotes.length === 0}
            >
              From a saved interview note
              {savedNotes.length === 0 && " (none yet)"}
            </SourcePill>
          </div>
          {sourceKind === "topic" ? (
            <Input
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g. closures, useEffect, CSS specificity, event loop"
            />
          ) : (
            <select
              value={selectedNoteId}
              onChange={(e) => setSelectedNoteId(e.target.value)}
              className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
            >
              <option value="">Select a note…</option>
              {savedNotes.map((n) => (
                <option key={n.id} value={n.id}>
                  {n.title}
                </option>
              ))}
            </select>
          )}
        </fieldset>

        <div className="grid gap-5 sm:grid-cols-3">
          <fieldset className="space-y-2">
            <legend className="text-sm font-semibold">Question types</legend>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={enabledTypes.includes("mcq")}
                onChange={() => toggleType("mcq")}
              />
              Multiple choice
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={enabledTypes.includes("predict-output")}
                onChange={() => toggleType("predict-output")}
              />
              Predict the output
            </label>
          </fieldset>

          <fieldset className="space-y-2">
            <legend className="text-sm font-semibold">Difficulty</legend>
            <select
              value={difficulty}
              onChange={(e) =>
                setDifficulty(e.target.value as QuizDifficulty)
              }
              className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
            >
              <option value="any">Any (interleaved)</option>
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>
          </fieldset>

          <fieldset className="space-y-2">
            <legend className="text-sm font-semibold">Count</legend>
            <Input
              type="number"
              min={1}
              max={15}
              value={count}
              onChange={(e) => setCount(Number(e.target.value) || 1)}
            />
          </fieldset>
        </div>

        {error && (
          <p className="text-sm text-destructive">{error}</p>
        )}

        <div className="flex items-center gap-3">
          <Button type="submit">Generate quiz</Button>
          <p className="text-xs text-muted-foreground">
            Generation typically takes 30–90 seconds — the AI writes,
            validates, and (for code questions) runs each snippet.
          </p>
        </div>
      </form>

      {phase.kind === "generating" && (
        <div className="rounded-lg border border-foreground/20 bg-muted/60 p-4 text-sm">
          <span className="mr-2 inline-block size-2 animate-pulse rounded-full bg-primary align-middle" />
          Generating and validating questions… (predict-output snippets are
          executed in a sandbox to verify the expected output)
        </div>
      )}

      {rejectedNotice && (
        <div className="rounded-lg border border-amber-500/50 bg-amber-500/10 p-3 text-sm">
          Delivered <strong>{rejectedNotice.delivered}</strong> of{" "}
          {rejectedNotice.requested} requested — rejected{" "}
          {rejectedNotice.rejected} that failed validation.
        </div>
      )}
    </div>
  );
}

// ---------- Subcomponents ----------

function SourcePill({
  active,
  disabled,
  onClick,
  children,
}: {
  active: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`rounded-full px-3 py-1.5 text-xs transition-colors ${
        active
          ? "bg-primary text-primary-foreground"
          : "border border-border hover:bg-muted"
      } disabled:cursor-not-allowed disabled:opacity-50`}
    >
      {children}
    </button>
  );
}

function QuizActive({
  question,
  questionNumber,
  total,
  answer,
  onSubmit,
  onNext,
}: {
  question: QuizQuestion;
  questionNumber: number;
  total: number;
  answer: AnswerState;
  onSubmit: (userAnswer: string, isCorrect: boolean) => void;
  onNext: () => void;
}) {
  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">
            Question {questionNumber} of {total}
          </p>
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary">{question.topic}</Badge>
            <Badge variant="secondary">{question.difficulty}</Badge>
            <Badge variant="secondary">
              {question.type === "mcq" ? "Multiple choice" : "Predict output"}
            </Badge>
          </div>
        </div>
        <div className="h-1.5 w-32 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full bg-primary transition-all"
            style={{
              width: `${((questionNumber - 1) / total) * 100}%`,
            }}
          />
        </div>
      </header>

      {question.type === "mcq" ? (
        <MCQPlayer
          question={question}
          answer={answer}
          onSubmit={onSubmit}
        />
      ) : (
        <PredictOutputPlayer
          question={question}
          answer={answer}
          onSubmit={onSubmit}
        />
      )}

      {answer.status === "answered" && (
        <div className="flex justify-end">
          <Button onClick={onNext}>
            {questionNumber === total ? "See summary" : "Next question →"}
          </Button>
        </div>
      )}
    </div>
  );
}

function MCQPlayer({
  question,
  answer,
  onSubmit,
}: {
  question: MCQQuestion;
  answer: AnswerState;
  onSubmit: (userAnswer: string, isCorrect: boolean) => void;
}) {
  const answered = answer.status === "answered";
  const userIdx = answered
    ? question.options.findIndex((o) => o === answer.userAnswer)
    : -1;
  const handlePick = (idx: number) => {
    if (answered) return;
    onSubmit(question.options[idx], idx === question.correctIndex);
  };
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-medium leading-7">{question.stem}</h2>
      <div className="space-y-2">
        {question.options.map((opt, i) => {
          const isCorrect = i === question.correctIndex;
          const isUserPick = i === userIdx;
          let stateClass = "border-border hover:bg-muted";
          if (answered) {
            if (isCorrect) {
              stateClass = "border-green-500/60 bg-green-500/10";
            } else if (isUserPick) {
              stateClass = "border-destructive/60 bg-destructive/10";
            } else {
              stateClass = "border-border opacity-60";
            }
          }
          return (
            <button
              key={i}
              type="button"
              onClick={() => handlePick(i)}
              disabled={answered}
              className={`group/opt flex w-full items-start gap-3 rounded-lg border p-3 text-left transition-colors ${stateClass}`}
            >
              <span className="mt-0.5 inline-flex size-5 shrink-0 items-center justify-center rounded-full border border-border text-xs font-mono">
                {String.fromCharCode(65 + i)}
              </span>
              <div className="flex-1">
                <p className="text-sm">{opt}</p>
                {answered && (
                  <p
                    className={`mt-1 text-xs ${
                      isCorrect
                        ? "text-green-600 dark:text-green-400"
                        : "text-muted-foreground"
                    }`}
                  >
                    {question.rationale[i]}
                  </p>
                )}
              </div>
              {answered && isCorrect && (
                <Check className="size-4 shrink-0 text-green-600 dark:text-green-400" />
              )}
              {answered && isUserPick && !isCorrect && (
                <X className="size-4 shrink-0 text-destructive" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function PredictOutputPlayer({
  question,
  answer,
  onSubmit,
}: {
  question: PredictOutputQuestion;
  answer: AnswerState;
  onSubmit: (userAnswer: string, isCorrect: boolean) => void;
}) {
  const [input, setInput] = useState("");
  const answered = answer.status === "answered";
  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (answered) return;
    const norm = (s: string) => s.replace(/\s+/g, " ").trim();
    const isCorrect = norm(input) === norm(question.expectedOutput);
    onSubmit(input, isCorrect);
  }
  return (
    <div className="space-y-4">
      {question.stem && (
        <h2 className="text-lg font-medium leading-7">{question.stem}</h2>
      )}
      <pre className="overflow-x-auto rounded-lg bg-zinc-950 p-4 text-xs text-zinc-100">
        <code>{question.code}</code>
      </pre>
      <form onSubmit={handleSubmit} className="space-y-2">
        <label className="block space-y-1 text-sm">
          <span className="font-medium">What does this print?</span>
          <textarea
            value={answered ? answer.userAnswer : input}
            onChange={(e) => setInput(e.target.value)}
            disabled={answered}
            placeholder="Type the exact console output…"
            rows={3}
            className="w-full resize-none rounded-md border border-input bg-transparent px-3 py-2 font-mono text-sm focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-70"
          />
        </label>
        {!answered && (
          <Button type="submit" disabled={!input.trim()}>
            Submit answer
          </Button>
        )}
      </form>
      {answered && (
        <div className="space-y-3 rounded-lg border border-border bg-muted/40 p-4">
          <div className="flex items-center gap-2">
            {answer.isCorrect ? (
              <span className="inline-flex items-center gap-1 text-sm font-medium text-green-600 dark:text-green-400">
                <Check className="size-4" /> Correct
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-sm font-medium text-destructive">
                <X className="size-4" /> Not quite
              </span>
            )}
          </div>
          {!answer.isCorrect && (
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">
                Expected output
              </p>
              <pre className="overflow-x-auto rounded bg-background p-2 text-xs">
                <code>{question.expectedOutput}</code>
              </pre>
            </div>
          )}
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground">
              Why
            </p>
            <p className="text-sm leading-6">{question.rationale}</p>
          </div>
        </div>
      )}
    </div>
  );
}

function QuizSummary({
  questions,
  attempts,
  onReset,
}: {
  questions: QuizQuestion[];
  attempts: QuizAttempt[];
  onReset: () => void;
}) {
  const correct = attempts.filter((a) => a.isCorrect).length;
  const total = questions.length;
  const pct = total > 0 ? Math.round((correct / total) * 100) : 0;

  // Per-topic breakdown
  const byTopic = new Map<string, { correct: number; total: number }>();
  for (const a of attempts) {
    const slot = byTopic.get(a.topic) ?? { correct: 0, total: 0 };
    slot.total += 1;
    if (a.isCorrect) slot.correct += 1;
    byTopic.set(a.topic, slot);
  }

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Quiz complete</h1>
        <p className="text-muted-foreground">
          {correct} of {total} correct ({pct}%)
        </p>
      </header>

      <section className="space-y-3 rounded-xl border border-border bg-card p-5">
        <h2 className="text-base font-semibold">By topic</h2>
        <div className="space-y-1">
          {[...byTopic.entries()]
            .sort((a, b) => a[1].correct / a[1].total - b[1].correct / b[1].total)
            .map(([topic, s]) => {
              const pct = Math.round((s.correct / s.total) * 100);
              return (
                <div
                  key={topic}
                  className="flex items-center justify-between gap-3 text-sm"
                >
                  <span className="font-mono text-xs">{topic}</span>
                  <div className="flex items-center gap-3">
                    <div className="h-1.5 w-24 overflow-hidden rounded-full bg-muted">
                      <div
                        className={`h-full transition-all ${pct >= 70 ? "bg-green-500" : pct >= 40 ? "bg-amber-500" : "bg-destructive"}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="w-16 text-right text-muted-foreground">
                      {s.correct}/{s.total}
                    </span>
                  </div>
                </div>
              );
            })}
        </div>
      </section>

      <div className="flex flex-wrap items-center gap-2">
        <Button onClick={onReset}>Start another quiz</Button>
        <Link href="/notes">
          <Button variant="outline">Browse notes</Button>
        </Link>
      </div>
    </div>
  );
}
