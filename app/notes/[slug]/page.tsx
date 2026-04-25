import Link from "next/link";
import { notFound } from "next/navigation";
import { MDXRemote } from "next-mdx-remote/rsc";
import rehypePrism from "rehype-prism-plus";
import { getNote, listNoteSlugs } from "@/lib/notes";
import { mdxComponents } from "@/components/MdxComponents";
import { Badge } from "@/components/ui/badge";

export async function generateStaticParams() {
  const slugs = await listNoteSlugs();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const note = await getNote(slug);
  return {
    title: note ? `${note.title} · Notes` : "Note · Coding Interview Reviewer",
  };
}

export default async function NotePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const note = await getNote(slug);
  if (!note) notFound();

  return (
    <article className="space-y-8">
      <Link
        href="/notes"
        className="text-sm text-muted-foreground hover:text-foreground"
      >
        ← All notes
      </Link>

      <header className="space-y-3">
        <h1 className="text-3xl font-bold tracking-tight">{note.title}</h1>
        <div className="flex flex-wrap gap-2">
          {note.tags.map((tag) => (
            <Link key={tag} href={`/tags/${encodeURIComponent(tag)}`}>
              <Badge variant="secondary" className="hover:opacity-80">
                {tag}
              </Badge>
            </Link>
          ))}
        </div>
      </header>

      <section>
        <MDXRemote
          source={note.content}
          components={mdxComponents}
          options={{
            mdxOptions: {
              rehypePlugins: [[rehypePrism, { ignoreMissing: true }]],
            },
          }}
        />
      </section>
    </article>
  );
}
