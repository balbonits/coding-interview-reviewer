import Link from "next/link";
import { listExercises } from "@/lib/exercises";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const metadata = {
  title: "Exercises · Coding Interview Reviewer",
};

const difficultyColor: Record<string, string> = {
  easy: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
  medium: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  hard: "bg-rose-500/15 text-rose-700 dark:text-rose-400",
};

export default async function ExercisesPage() {
  const exercises = await listExercises();
  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Exercises</h1>
        <p className="text-muted-foreground">
          Solve problems in-browser. Tests run live; reveal the reference
          solution after you pass.
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2">
        {exercises.map((ex) => (
          <Link
            key={ex.slug}
            href={`/exercises/${ex.slug}`}
            className="group"
          >
            <Card className="h-full transition-colors group-hover:border-foreground/40">
              <CardHeader>
                <div className="flex items-center justify-between gap-2">
                  <CardTitle>{ex.title}</CardTitle>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${difficultyColor[ex.difficulty] ?? ""}`}
                  >
                    {ex.difficulty}
                  </span>
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
