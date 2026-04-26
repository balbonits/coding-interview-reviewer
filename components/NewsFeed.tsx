"use client";

import { useEffect, useRef, useState } from "react";
import type { RssItem } from "@/lib/rss";

const CACHE_KEY = "news_cache";
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

interface CachedNews {
  items: RssItem[];
  fetchedAt: number;
}

function loadCache(): CachedNews | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const c = JSON.parse(raw) as CachedNews;
    if (Date.now() - c.fetchedAt > CACHE_TTL_MS) return null;
    return c;
  } catch {
    return null;
  }
}

function saveCache(items: RssItem[]) {
  try {
    localStorage.setItem(
      CACHE_KEY,
      JSON.stringify({ items, fetchedAt: Date.now() }),
    );
  } catch {}
}

function formatDate(str: string): string {
  try {
    return new Date(str).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
    });
  } catch {
    return "";
  }
}

export function NewsFeed() {
  const [items, setItems] = useState<RssItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [summaries, setSummaries] = useState<Record<string, string>>({});
  const [summarizing, setSummarizing] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  async function fetchNews(force = false) {
    if (!force) {
      const cached = loadCache();
      if (cached) {
        setItems(cached.items);
        return;
      }
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/news");
      if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
      const data = (await res.json()) as RssItem[];
      setItems(data);
      saveCache(data);
    } catch (e) {
      setError(
        `Failed to load feed: ${e instanceof Error ? e.message : String(e)}`,
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchNews();
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  async function summarize(item: RssItem) {
    const key = item.link;
    if (summaries[key]) return; // already done

    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setSummarizing(key);

    const text = `Title: ${item.title}\n\n${item.description.slice(0, 800)}`;

    try {
      const res = await fetch("/api/ai/exercise", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "explain",
          code: "",
          problem: text,
        }),
        signal: ctrl.signal,
      });

      if (!res.ok || !res.body) {
        setSummaries((prev) => ({ ...prev, [key]: "Summary unavailable." }));
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      let result = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const chunk = JSON.parse(line);
            result += chunk?.message?.content ?? "";
            setSummaries((prev) => ({ ...prev, [key]: result }));
          } catch {}
        }
      }
    } catch (e) {
      if ((e as { name?: string }).name !== "AbortError") {
        setSummaries((prev) => ({ ...prev, [key]: "Summarization failed." }));
      }
    } finally {
      setSummarizing(null);
    }
  }

  if (loading) {
    return (
      <div className="py-12 text-center text-muted-foreground">
        Fetching feeds…
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-2 py-8">
        <p className="text-sm text-destructive">{error}</p>
        <button
          type="button"
          onClick={() => fetchNews(true)}
          className="rounded border border-border px-3 py-1.5 text-xs hover:bg-muted"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {items.length} items · cached for 1 hour
        </p>
        <button
          type="button"
          onClick={() => fetchNews(true)}
          className="rounded border border-border px-3 py-1.5 text-xs hover:bg-muted"
        >
          Refresh
        </button>
      </div>

      <ul className="space-y-4">
        {items.map((item) => (
          <li
            key={item.link}
            className="rounded-lg border border-border bg-card p-4 space-y-2"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1 min-w-0">
                <a
                  href={item.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium hover:underline line-clamp-2"
                >
                  {item.title}
                </a>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>{item.source}</span>
                  {item.pubDate && (
                    <>
                      <span>·</span>
                      <span>{formatDate(item.pubDate)}</span>
                    </>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={() => summarize(item)}
                disabled={summarizing !== null}
                className="shrink-0 rounded border border-border px-2 py-1 text-xs hover:bg-muted disabled:opacity-50"
              >
                {summarizing === item.link
                  ? "…"
                  : summaries[item.link]
                    ? "Re-summarize"
                    : "Summarize"}
              </button>
            </div>

            {summaries[item.link] && (
              <p className="text-sm text-muted-foreground border-t border-border pt-2 leading-relaxed">
                {summaries[item.link]}
              </p>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
