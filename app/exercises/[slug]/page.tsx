import { notFound } from "next/navigation";
import Link from "next/link";
import { MDXRemote } from "next-mdx-remote/rsc";
import rehypePrism from "rehype-prism-plus";
import remarkGfm from "remark-gfm";
import {
  getExercise,
  listExerciseSlugs,
} from "@/lib/exercises";
import { ExerciseSandbox } from "@/components/ExerciseSandbox";
import { mdxComponents } from "@/components/MdxComponents";
import { SetPageContext } from "@/components/SetPageContext";
import { Badge } from "@/components/ui/badge";

const difficultyColor: Record<string, string> = {
  easy: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
  medium: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  hard: "bg-rose-500/15 text-rose-700 dark:text-rose-400",
};

export async function generateStaticParams() {
  const slugs = await listExerciseSlugs();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const ex = await getExercise(slug);
  return {
    title: ex
      ? `${ex.meta.title} · Exercises`
      : "Exercise · Coding Interview Reviewer",
  };
}

export default async function ExercisePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const exercise = await getExercise(slug);
  if (!exercise) notFound();

  return (
    <article className="space-y-8">
      <Link
        href="/exercises"
        className="text-sm text-muted-foreground hover:text-foreground"
      >
        ← All exercises
      </Link>

      <header className="space-y-3">
        <div className="flex items-center gap-3 text-sm">
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${difficultyColor[exercise.meta.difficulty] ?? ""}`}
          >
            {exercise.meta.difficulty}
          </span>
          <span className="text-muted-foreground">
            ~{exercise.meta.estimatedMinutes} min
          </span>
        </div>
        <h1 className="text-3xl font-bold tracking-tight">
          {exercise.meta.title}
        </h1>
        <div className="flex flex-wrap gap-2">
          {exercise.meta.tags.map((tag) => (
            <Badge key={tag} variant="secondary">
              {tag}
            </Badge>
          ))}
        </div>
      </header>

      <section>
        <SetPageContext
          title={`Exercise: ${exercise.meta.title}`}
          description={`${exercise.meta.difficulty} difficulty · Topics: ${exercise.meta.tags.join(", ")}`}
        />
        <MDXRemote
          source={exercise.problemContent}
          components={mdxComponents}
          options={{
            mdxOptions: {
              remarkPlugins: [remarkGfm],
              rehypePlugins: [[rehypePrism, { ignoreMissing: true }]],
            },
          }}
        />
      </section>

      <ExerciseSandbox
        starter={exercise.starter}
        tests={exercise.tests}
        solution={exercise.solution}
        template={exercise.template}
        problem={exercise.problemContent}
      />
    </article>
  );
}
