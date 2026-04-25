import Link from "next/link";
import { notFound } from "next/navigation";
import { listNotes } from "@/lib/notes";
import { listExercises } from "@/lib/exercises";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export async function generateStaticParams() {
  const [notes, exercises] = await Promise.all([
    listNotes(),
    listExercises(),
  ]);
  const tags = new Set<string>();
  for (const n of notes) n.tags.forEach((t) => tags.add(t));
  for (const e of exercises) e.tags.forEach((t) => tags.add(t));
  return Array.from(tags).map((tag) => ({ tag }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ tag: string }>;
}) {
  const { tag } = await params;
  return { title: `#${decodeURIComponent(tag)} · Coding Interview Reviewer` };
}

export default async function TagPage({
  params,
}: {
  params: Promise<{ tag: string }>;
}) {
  const { tag } = await params;
  const decoded = decodeURIComponent(tag);

  const [allNotes, allExercises] = await Promise.all([
    listNotes(),
    listExercises(),
  ]);

  const matchingNotes = allNotes.filter((n) => n.tags.includes(decoded));
  const matchingExercises = allExercises.filter((e) =>
    e.tags.includes(decoded),
  );

  if (matchingNotes.length === 0 && matchingExercises.length === 0) {
    notFound();
  }

  return (
    <div className="space-y-10">
      <header className="space-y-2">
        <p className="text-sm text-muted-foreground">Tag</p>
        <h1 className="text-3xl font-bold tracking-tight">#{decoded}</h1>
        <p className="text-muted-foreground">
          {matchingNotes.length} note{matchingNotes.length === 1 ? "" : "s"} ·{" "}
          {matchingExercises.length} exercise
          {matchingExercises.length === 1 ? "" : "s"}
        </p>
      </header>

      {matchingNotes.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Notes</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {matchingNotes.map((note) => (
              <Link
                key={note.slug}
                href={`/notes/${note.slug}`}
                className="group"
              >
                <Card className="h-full transition-colors group-hover:border-foreground/40">
                  <CardHeader>
                    <CardTitle>{note.title}</CardTitle>
                  </CardHeader>
                  <CardContent className="flex flex-wrap gap-2">
                    {note.tags.map((t) => (
                      <Badge key={t} variant="secondary">
                        {t}
                      </Badge>
                    ))}
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </section>
      )}

      {matchingExercises.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Exercises</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {matchingExercises.map((ex) => (
              <Link
                key={ex.slug}
                href={`/exercises/${ex.slug}`}
                className="group"
              >
                <Card className="h-full transition-colors group-hover:border-foreground/40">
                  <CardHeader>
                    <CardTitle>{ex.title}</CardTitle>
                    <CardDescription className="capitalize">
                      {ex.difficulty} · ~{ex.estimatedMinutes} min
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="flex flex-wrap gap-2">
                    {ex.tags.map((t) => (
                      <Badge key={t} variant="secondary">
                        {t}
                      </Badge>
                    ))}
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
