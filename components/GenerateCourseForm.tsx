"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { generateAiCourse } from "@/lib/aiCourses";

export function GenerateCourseForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [topic, setTopic] = useState("");
  const [level, setLevel] = useState<"beginner" | "intermediate" | "advanced">(
    "intermediate",
  );
  const [hours, setHours] = useState(5);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!topic.trim() || generating) return;
    setError(null);
    setGenerating(true);
    try {
      const course = await generateAiCourse({
        topic: topic.trim(),
        level,
        estimatedHours: hours,
      });
      router.push(`/courses/ai/${course.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Generation failed.");
      setGenerating(false);
    }
  }

  if (!open) {
    return (
      <Button
        type="button"
        variant="default"
        onClick={() => setOpen(true)}
        className="gap-1.5"
      >
        <Sparkles className="size-4" />
        Generate a course
      </Button>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 rounded-xl border border-primary/40 bg-primary/5 p-5"
    >
      <div className="flex items-center gap-2">
        <Sparkles className="size-4 text-primary" />
        <h3 className="text-base font-semibold">Generate a course with AI</h3>
      </div>

      <p className="text-sm text-muted-foreground">
        The local AI will assemble a learning path from existing notes and
        exercises plus AI-generated quizzes. Slugs are validated against real
        content, so you won&apos;t get broken links.
      </p>

      <div className="space-y-3">
        <label className="block space-y-1 text-sm">
          <span className="font-medium">Topic / focus</span>
          <Input
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="e.g. async JavaScript, accessibility for React, or interview prep for senior front-end"
            required
          />
        </label>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block space-y-1 text-sm">
            <span className="font-medium">Level</span>
            <select
              value={level}
              onChange={(e) =>
                setLevel(e.target.value as typeof level)
              }
              className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
            >
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
            </select>
          </label>
          <label className="block space-y-1 text-sm">
            <span className="font-medium">Target hours</span>
            <Input
              type="number"
              min={1}
              max={20}
              value={hours}
              onChange={(e) => setHours(Number(e.target.value) || 5)}
            />
          </label>
        </div>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex flex-wrap items-center gap-2">
        <Button type="submit" disabled={!topic.trim() || generating}>
          {generating ? "Generating (~30–60s)…" : "Generate"}
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={() => {
            setOpen(false);
            setError(null);
          }}
          disabled={generating}
        >
          Cancel
        </Button>
        <p className="text-xs text-muted-foreground">
          Validates every slug against real content. If the AI hallucinates a
          slug, it retries up to 3 times.
        </p>
      </div>
    </form>
  );
}
