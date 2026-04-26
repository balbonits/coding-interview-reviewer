import { NewsFeed } from "@/components/NewsFeed";
import { FEEDS } from "@/lib/rss";

export const metadata = {
  title: "News · Coding Interview Reviewer",
};

export default function NewsPage() {
  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Tech News</h1>
        <p className="mt-2 text-muted-foreground">
          Latest from{" "}
          {FEEDS.map((f, i) => (
            <span key={f.name}>
              {i > 0 && i < FEEDS.length - 1 && ", "}
              {i > 0 && i === FEEDS.length - 1 && " and "}
              <span className="font-medium text-foreground">{f.name}</span>
            </span>
          ))}
          . Click{" "}
          <span className="font-medium text-foreground">Summarize</span> to get
          an Ollama-powered summary.
        </p>
      </header>
      <NewsFeed />
    </div>
  );
}
