import { listExercises } from "@/lib/exercises";
import { ExercisesList } from "@/components/ExercisesList";

export const metadata = {
  title: "Exercises · Coding Interview Reviewer",
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

      <ExercisesList exercises={exercises} />
    </div>
  );
}
