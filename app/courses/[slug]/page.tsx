import Link from "next/link";
import { notFound } from "next/navigation";
import { MDXRemote } from "next-mdx-remote/rsc";
import remarkGfm from "remark-gfm";
import { getCourse, listCourseSlugs } from "@/lib/courses-server";
import { countSteps } from "@/lib/courses";
import { mdxComponents } from "@/components/MdxComponents";
import { Badge } from "@/components/ui/badge";
import { CourseStepList } from "@/components/CourseStepList";

export async function generateStaticParams() {
  const slugs = await listCourseSlugs();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const course = await getCourse(slug);
  return {
    title: course
      ? `${course.title} · Courses`
      : "Course · Coding Interview Reviewer",
  };
}

const LEVEL_COLOR: Record<string, string> = {
  beginner: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
  intermediate: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  advanced: "bg-rose-500/15 text-rose-700 dark:text-rose-400",
};

export default async function CoursePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const course = await getCourse(slug);
  if (!course) notFound();

  const total = countSteps(course);

  return (
    <article className="space-y-8">
      <Link
        href="/courses"
        className="text-sm text-muted-foreground hover:text-foreground"
      >
        ← All courses
      </Link>

      <header className="space-y-3">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span
            className={`rounded-full px-2 py-0.5 font-medium capitalize ${LEVEL_COLOR[course.level] ?? ""}`}
          >
            {course.level}
          </span>
          <span className="text-muted-foreground">
            ~{course.estimatedHours} hours · {total} steps
          </span>
        </div>
        <h1 className="text-3xl font-bold tracking-tight">{course.title}</h1>
        <p className="text-lg text-muted-foreground">{course.description}</p>
        <div className="flex flex-wrap gap-2">
          {course.tags.map((tag) => (
            <Link key={tag} href={`/tags/${encodeURIComponent(tag)}`}>
              <Badge variant="secondary" className="hover:opacity-80">
                {tag}
              </Badge>
            </Link>
          ))}
        </div>
      </header>

      {course.intro.trim() && (
        <section className="prose prose-sm max-w-none dark:prose-invert">
          <MDXRemote
            source={course.intro}
            components={mdxComponents}
            options={{
              mdxOptions: {
                remarkPlugins: [remarkGfm],
              },
            }}
          />
        </section>
      )}

      <CourseStepList course={course} />
    </article>
  );
}
