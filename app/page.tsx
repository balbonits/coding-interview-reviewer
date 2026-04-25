import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const cores = [
  {
    href: "/exercises",
    title: "Code Sandbox",
    description:
      "Solve coding exercises in-browser with auto-graded tests. Reveal the reference solution after you pass.",
    badge: "Practice",
  },
  {
    href: "/notes",
    title: "Review Notes",
    description:
      "Your personal library of front-end concepts — JS, React, CSS — searchable by tag.",
    badge: "Study",
  },
  {
    href: "/interview",
    title: "AI Mock Interviewer",
    description:
      "Practice JS interviews against a local LLM. It asks one question at a time, follows up on weak answers, and saves the transcript.",
    badge: "Drill",
  },
];

export default function Home() {
  return (
    <div className="space-y-10">
      <section className="space-y-3">
        <h1 className="text-4xl font-bold tracking-tight">
          Front-end interview prep, all in one place.
        </h1>
        <p className="max-w-2xl text-lg text-muted-foreground">
          Three things you can&apos;t find together anywhere else: live coding
          exercises with real tests, your own notes library, and an AI
          interviewer that runs entirely on your machine.
        </p>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cores.map((core) => (
          <Link key={core.href} href={core.href} className="group">
            <Card className="h-full transition-colors group-hover:border-foreground/40">
              <CardHeader>
                <div className="mb-2 inline-flex w-fit rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium text-secondary-foreground">
                  {core.badge}
                </div>
                <CardTitle>{core.title}</CardTitle>
                <CardDescription>{core.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <span className="text-sm font-medium text-foreground">
                  Open →
                </span>
              </CardContent>
            </Card>
          </Link>
        ))}
      </section>
    </div>
  );
}
