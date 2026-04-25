import type { MDXComponents } from "mdx/types";

export const mdxComponents: MDXComponents = {
  h1: (props) => (
    <h1
      className="mt-8 mb-4 text-3xl font-bold tracking-tight first:mt-0"
      {...props}
    />
  ),
  h2: (props) => (
    <h2
      className="mt-8 mb-3 text-2xl font-semibold tracking-tight"
      {...props}
    />
  ),
  h3: (props) => (
    <h3 className="mt-6 mb-2 text-xl font-semibold" {...props} />
  ),
  p: (props) => (
    <p className="my-4 leading-7 text-foreground" {...props} />
  ),
  ul: (props) => (
    <ul className="my-4 list-disc space-y-1 pl-6" {...props} />
  ),
  ol: (props) => (
    <ol className="my-4 list-decimal space-y-1 pl-6" {...props} />
  ),
  li: (props) => <li className="text-foreground" {...props} />,
  code: (props) => (
    <code
      className="rounded bg-muted px-1.5 py-0.5 font-mono text-sm"
      {...props}
    />
  ),
  pre: (props) => (
    <pre
      className="my-4 overflow-x-auto rounded-lg border border-border bg-zinc-950 p-4 text-sm text-zinc-100"
      {...props}
    />
  ),
  a: (props) => (
    <a className="underline underline-offset-4 hover:opacity-80" {...props} />
  ),
  strong: (props) => (
    <strong className="font-semibold text-foreground" {...props} />
  ),
  blockquote: (props) => (
    <blockquote
      className="my-4 border-l-2 border-border pl-4 italic text-muted-foreground"
      {...props}
    />
  ),
  hr: (props) => <hr className="my-8 border-border" {...props} />,
};
