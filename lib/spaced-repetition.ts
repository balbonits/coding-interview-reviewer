export type ReviewItemType = "note" | "exercise";

export type Quality = 0 | 1 | 2 | 3 | 4 | 5;

export interface ReviewItem {
  id: string; // `${type}:${slug}`
  type: ReviewItemType;
  slug: string;
  title: string;
  interval: number;       // days until next review
  repetitions: number;    // consecutive successful reviews
  efactor: number;        // ease factor; starts at 2.5, floor 1.3
  dueDate: string;        // YYYY-MM-DD
  lastReviewed: string | null;
}

const STORAGE_KEY = "review_items";

export type ContentItem = { type: ReviewItemType; slug: string; title: string };

function today(): string {
  return new Date().toISOString().split("T")[0];
}

function makeFresh(item: ContentItem): ReviewItem {
  return {
    id: `${item.type}:${item.slug}`,
    type: item.type,
    slug: item.slug,
    title: item.title,
    interval: 0,
    repetitions: 0,
    efactor: 2.5,
    dueDate: today(),
    lastReviewed: null,
  };
}

/** SM-2 update: returns a new ReviewItem with updated schedule */
export function sm2(item: ReviewItem, quality: Quality): ReviewItem {
  const q = quality;
  let { interval, repetitions, efactor } = item;

  if (q >= 3) {
    if (repetitions === 0) interval = 1;
    else if (repetitions === 1) interval = 6;
    else interval = Math.round(interval * efactor);
    repetitions += 1;
  } else {
    interval = 1;
    repetitions = 0;
  }

  efactor = efactor + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02));
  if (efactor < 1.3) efactor = 1.3;

  const due = new Date();
  due.setDate(due.getDate() + interval);

  return {
    ...item,
    interval,
    repetitions,
    efactor,
    dueDate: due.toISOString().split("T")[0],
    lastReviewed: today(),
  };
}

export function loadAll(): Map<string, ReviewItem> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Map();
    const arr = JSON.parse(raw) as ReviewItem[];
    return new Map(arr.map((r) => [r.id, r]));
  } catch {
    return new Map();
  }
}

export function saveAll(items: Map<string, ReviewItem>): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...items.values()]));
  } catch {}
}

/**
 * Merge the canonical content list with localStorage state.
 * New items start due today; existing items keep their schedule.
 */
export function mergeWithContent(
  contentItems: ContentItem[],
): ReviewItem[] {
  const stored = loadAll();
  const merged: ReviewItem[] = contentItems.map((ci) => {
    const id = `${ci.type}:${ci.slug}`;
    return stored.get(id) ?? makeFresh(ci);
  });
  return merged;
}

/** Items due today or overdue */
export function getDueItems(items: ReviewItem[]): ReviewItem[] {
  const t = today();
  return items.filter((i) => i.dueDate <= t);
}
