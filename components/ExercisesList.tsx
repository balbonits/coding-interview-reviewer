"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StatusPill } from "@/components/ui/status-pill";
import type { ExerciseMeta } from "@/lib/exercises";

const difficultyTone: Record<string, "success" | "warning" | "danger"> = {
  easy: "success",
  medium: "warning",
  hard: "danger",
};

const difficultyRank: Record<string, number> = {
  easy: 0,
  medium: 1,
  hard: 2,
};

type SortKey =
  | "title-asc"
  | "difficulty-asc"
  | "difficulty-desc"
  | "time-asc"
  | "time-desc";

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "title-asc", label: "Title (A → Z)" },
  { value: "difficulty-asc", label: "Difficulty (easy → hard)" },
  { value: "difficulty-desc", label: "Difficulty (hard → easy)" },
  { value: "time-asc", label: "Time (short → long)" },
  { value: "time-desc", label: "Time (long → short)" },
];

function sortExercises(
  exercises: ExerciseMeta[],
  sort: SortKey,
): ExerciseMeta[] {
  const copy = [...exercises];
  switch (sort) {
    case "title-asc":
      return copy.sort((a, b) => a.title.localeCompare(b.title));
    case "difficulty-asc":
      return copy.sort(
        (a, b) =>
          difficultyRank[a.difficulty] - difficultyRank[b.difficulty] ||
          a.title.localeCompare(b.title),
      );
    case "difficulty-desc":
      return copy.sort(
        (a, b) =>
          difficultyRank[b.difficulty] - difficultyRank[a.difficulty] ||
          a.title.localeCompare(b.title),
      );
    case "time-asc":
      return copy.sort(
        (a, b) =>
          a.estimatedMinutes - b.estimatedMinutes ||
          a.title.localeCompare(b.title),
      );
    case "time-desc":
      return copy.sort(
        (a, b) =>
          b.estimatedMinutes - a.estimatedMinutes ||
          a.title.localeCompare(b.title),
      );
  }
}

export function ExercisesList({ exercises }: { exercises: ExerciseMeta[] }) {
  const [sort, setSort] = useState<SortKey>("title-asc");
  const sorted = useMemo(() => sortExercises(exercises, sort), [exercises, sort]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {exercises.length} {exercises.length === 1 ? "exercise" : "exercises"}
        </p>
        <label className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">Sort by</span>
          <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
            <SelectTrigger className="w-56" size="sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SORT_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </label>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {sorted.map((ex) => (
          <Link key={ex.slug} href={`/exercises/${ex.slug}`} className="group">
            <Card className="h-full transition-colors group-hover:border-foreground/40">
              <CardHeader>
                <div className="flex items-center justify-between gap-2">
                  <CardTitle>{ex.title}</CardTitle>
                  <StatusPill
                    tone={difficultyTone[ex.difficulty] ?? "neutral"}
                    className="capitalize"
                  >
                    {ex.difficulty}
                  </StatusPill>
                </div>
                <CardDescription>~{ex.estimatedMinutes} min</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                {ex.tags.map((tag) => (
                  <Badge key={tag} variant="secondary">
                    {tag}
                  </Badge>
                ))}
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
