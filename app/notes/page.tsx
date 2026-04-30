import Link from "next/link";
import { listNotes } from "@/lib/notes";
import { getDb } from "@/lib/mongodb";
import { trackLabel } from "@/lib/interviewSessions";
import type { InterviewNote } from "@/lib/interviewNotes";
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

export const dynamic = "force-dynamic";

interface NoteDoc extends InterviewNote {
  _id: string;
}

async function listSavedInterviewNotes(): Promise<InterviewNote[]> {
  try {
    const db = await getDb();
    const docs = await db
      .collection<NoteDoc>("interview_notes")
      .find({})
      .sort({ createdAt: -1 })
      .toArray();
    return docs.map(({ _id, ...rest }) => rest);
  } catch {
    return [];
  }
}

export default async function NotesPage() {
  const [notes, savedNotes] = await Promise.all([
    listNotes(),
    listSavedInterviewNotes(),
  ]);
  return (
    <div className="space-y-10">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Notes</h1>
        <p className="text-muted-foreground">
          Personal review notes on front-end interview topics. Click a tag to
          see all related notes and exercises.
        </p>
      </header>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Library</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {notes.map((note) => (
            <Link key={note.slug} href={`/notes/${note.slug}`} className="group">
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
      </section>

      <section className="space-y-3">
        <div className="flex items-end justify-between gap-3">
          <h2 className="text-xl font-semibold">From your mock interviews</h2>
          {savedNotes.length > 0 && (
            <p className="text-xs text-muted-foreground">
              {savedNotes.length} saved
            </p>
          )}
        </div>
        {savedNotes.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No saved interview notes yet. From any{" "}
            <Link
              href="/interview"
              className="underline hover:text-foreground"
            >
              mock interview
            </Link>
            , click <span className="font-medium">Save to Notes</span> to have
            the local AI distill the conversation into a study note here.
          </p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {savedNotes.map((note) => (
              <Link
                key={note.id}
                href={`/notes/saved/${note.id}`}
                className="group"
              >
                <Card className="h-full transition-colors group-hover:border-foreground/40">
                  <CardHeader>
                    <CardTitle className="line-clamp-2">{note.title}</CardTitle>
                    <CardDescription>
                      {trackLabel(note.track)}
                      {note.context?.roleTitle
                        ? ` · ${note.context.roleTitle}`
                        : ""}
                      {note.context?.companyName
                        ? ` @ ${note.context.companyName}`
                        : ""}
                      {" · "}
                      {new Date(note.createdAt).toLocaleDateString()}
                    </CardDescription>
                  </CardHeader>
                  {note.tags.length > 0 && (
                    <CardContent className="flex flex-wrap gap-2">
                      {note.tags.slice(0, 6).map((tag) => (
                        <Badge key={tag} variant="secondary">
                          {tag}
                        </Badge>
                      ))}
                      {note.tags.length > 6 && (
                        <span className="text-xs text-muted-foreground">
                          +{note.tags.length - 6}
                        </span>
                      )}
                    </CardContent>
                  )}
                </Card>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
