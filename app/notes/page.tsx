import Link from "next/link";
import { listNotes } from "@/lib/notes";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const metadata = {
  title: "Notes · Coding Interview Reviewer",
};

export default async function NotesPage() {
  const notes = await listNotes();
  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Notes</h1>
        <p className="text-muted-foreground">
          Personal review notes on front-end interview topics. Click a tag to
          see all related notes and exercises.
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2">
        {notes.map((note) => (
          <Link
            key={note.slug}
            href={`/notes/${note.slug}`}
            className="group"
          >
            <Card className="h-full transition-colors group-hover:border-foreground/40">
              <CardHeader>
                <CardTitle>{note.title}</CardTitle>
                <CardDescription>{note.tags.length} tags</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                {note.tags.map((tag) => (
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
