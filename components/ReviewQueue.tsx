"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  makeFresh,
  getDueItems,
  sm2,
  type ContentItem,
  type ReviewItem,
  type Quality,
} from "@/lib/spaced-repetition";

type GradeButton = { label: string; quality: Quality; className: string };

const GRADES: GradeButton[] = [
  { label: "Again", quality: 0, className: "bg-red-500/15 text-red-700 dark:text-red-400 hover:bg-red-500/25" },
  { label: "Hard", quality: 3, className: "bg-amber-500/15 text-amber-700 dark:text-amber-400 hover:bg-amber-500/25" },
  { label: "Good", quality: 4, className: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/25" },
  { label: "Easy", quality: 5, className: "bg-sky-500/15 text-sky-700 dark:text-sky-400 hover:bg-sky-500/25" },
];

function itemHref(item: ReviewItem) {
  return item.type === "note" ? `/notes/${item.slug}` : `/exercises/${item.slug}`;
}

async function fetchItems(): Promise<ReviewItem[]> {
  const res = await fetch("/api/review-items");
  if (!res.ok) return [];
  return res.json() as Promise<ReviewItem[]>;
}

async function upsertItem(item: ReviewItem): Promise<void> {
  await fetch("/api/review-items", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(item),
  });
}

async function seedNewItems(items: ReviewItem[]): Promise<void> {
  if (!items.length) return;
  await fetch("/api/review-items", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(items),
  });
}

export function ReviewQueue({ contentItems }: { contentItems: ContentItem[] }) {
  const [queue, setQueue] = useState<ReviewItem[]>([]);
  const [done, setDone] = useState<ReviewItem[]>([]);
  const [started, setStarted] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const stored = await fetchItems();
        const storedById = new Map(stored.map((r) => [r.id, r]));

        // Seed any content items not yet in the DB
        const fresh = contentItems
          .filter((ci) => !storedById.has(`${ci.type}:${ci.slug}`))
          .map(makeFresh);
        if (fresh.length) await seedNewItems(fresh);

        const all = [
          ...stored,
          ...fresh.filter((f) => !storedById.has(f.id)),
        ];
        setQueue(getDueItems(all));
        setStarted(true);
      } catch (e) {
        setError(`Could not load review items: ${e instanceof Error ? e.message : String(e)}`);
        setStarted(true);
      }
    })();
  }, [contentItems]);

  async function grade(quality: Quality) {
    const [current, ...rest] = queue;
    const updated = sm2(current, quality);
    await upsertItem(updated);
    setDone((prev) => [...prev, updated]);
    setQueue(rest);
  }

  if (!started) return null;

  if (error) {
    return (
      <div className="py-8 text-sm text-destructive">{error}</div>
    );
  }

  if (queue.length === 0) {
    return (
      <div className="mx-auto max-w-xl space-y-6 py-12 text-center">
        <div className="text-4xl">✓</div>
        <h2 className="text-xl font-semibold">All caught up!</h2>
        <p className="text-muted-foreground">
          {done.length > 0
            ? `You reviewed ${done.length} item${done.length === 1 ? "" : "s"} today.`
            : "Nothing is due for review yet."}
        </p>
        {done.length > 0 && (
          <ul className="space-y-1 text-left text-sm">
            {done.map((item) => (
              <li key={item.id} className="flex items-center gap-2">
                <span className="text-muted-foreground capitalize">{item.type}</span>
                <Link href={itemHref(item)} className="font-medium hover:underline">
                  {item.title}
                </Link>
                <span className="ml-auto text-xs text-muted-foreground">
                  next in {item.interval}d
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  }

  const current = queue[0];
  const total = queue.length + done.length;
  const progress = done.length;

  return (
    <div className="mx-auto max-w-xl space-y-6 py-8">
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>{progress + 1} / {total}</span>
        <div className="h-2 w-48 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{ width: `${(progress / total) * 100}%` }}
          />
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-8 space-y-4">
        <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
          <span>{current.type}</span>
          {current.lastReviewed
            ? <span>· last reviewed {current.lastReviewed}</span>
            : <span>· new</span>}
        </div>
        <h2 className="text-2xl font-bold">{current.title}</h2>
        <Link
          href={itemHref(current)}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block text-sm text-muted-foreground underline hover:text-foreground"
        >
          Open {current.type} →
        </Link>
      </div>

      <div>
        <p className="mb-3 text-xs text-muted-foreground">How well did you recall this?</p>
        <div className="grid grid-cols-4 gap-2">
          {GRADES.map(({ label, quality, className }) => (
            <button
              key={label}
              type="button"
              onClick={() => { void grade(quality); }}
              className={`rounded-lg border border-transparent px-3 py-2 text-sm font-medium transition-colors ${className}`}
            >
              {label}
            </button>
          ))}
        </div>
        <p className="mt-2 text-center text-xs text-muted-foreground">
          Again = forgot · Hard = difficult · Good = recalled · Easy = instant
        </p>
      </div>
    </div>
  );
}
