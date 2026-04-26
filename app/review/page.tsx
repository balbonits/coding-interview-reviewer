import { listNotes } from "@/lib/notes";
import { listExercises } from "@/lib/exercises";
import { ReviewQueue } from "@/components/ReviewQueue";
import type { ContentItem } from "@/lib/spaced-repetition";

export const metadata = {
  title: "Daily Review · Coding Interview Reviewer",
};

export default async function ReviewPage() {
  const [notes, exercises] = await Promise.all([listNotes(), listExercises()]);

  const contentItems: ContentItem[] = [
    ...notes.map((n) => ({ type: "note" as const, slug: n.slug, title: n.title })),
    ...exercises.map((e) => ({ type: "exercise" as const, slug: e.slug, title: e.title })),
  ];

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Daily Review</h1>
        <p className="mt-2 text-muted-foreground">
          Items are scheduled using SM-2 spaced repetition. Grade how well you recalled each one and it will resurface at the right interval.
        </p>
      </header>
      <ReviewQueue contentItems={contentItems} />
    </div>
  );
}
