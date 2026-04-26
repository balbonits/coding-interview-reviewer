export type ReviewItemType = "note" | "exercise";

export type Quality = 0 | 1 | 2 | 3 | 4 | 5;

export interface ReviewItem {
  id: string; // `${type}:${slug}`
  type: ReviewItemType;
  slug: string;
  title: string;
  interval: number;
  repetitions: number;
  efactor: number;
  dueDate: string; // YYYY-MM-DD
  lastReviewed: string | null;
}

export type ContentItem = { type: ReviewItemType; slug: string; title: string };

export function today(): string {
  return new Date().toISOString().split("T")[0];
}

export function makeFresh(item: ContentItem): ReviewItem {
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

export function getDueItems(items: ReviewItem[]): ReviewItem[] {
  const t = today();
  return items.filter((i) => i.dueDate <= t);
}
