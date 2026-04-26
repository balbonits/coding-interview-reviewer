import { NextRequest, NextResponse } from "next/server";
import { FEEDS, parseRss, type RssItem } from "@/lib/rss";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ITEM_LIMIT = 10;

export async function GET(_req: NextRequest) {
  const errors: string[] = [];
  const results = await Promise.all(
    FEEDS.map(async (f) => {
      try {
        const res = await fetch(f.url, {
          headers: {
            "User-Agent": "coding-interview-reviewer/1.0",
            "Accept": "application/rss+xml, application/atom+xml, text/xml, */*",
            "Accept-Encoding": "identity",
          },
          cache: "no-store",
          redirect: "follow",
          signal: AbortSignal.timeout(10000),
        });
        if (!res.ok) {
          errors.push(`${f.name}: HTTP ${res.status}`);
          return [] as RssItem[];
        }
        const xml = await res.text();
        const items = parseRss(xml, f.name).slice(0, ITEM_LIMIT);
        if (items.length === 0) errors.push(`${f.name}: parsed 0 items`);
        return items;
      } catch (e) {
        errors.push(`${f.name}: ${e instanceof Error ? e.message : String(e)}`);
        return [] as RssItem[];
      }
    }),
  );

  const allItems = results.flat().sort((a, b) => {
    const ta = a.pubDate ? new Date(a.pubDate).getTime() : 0;
    const tb = b.pubDate ? new Date(b.pubDate).getTime() : 0;
    return tb - ta;
  });

  if (errors.length) console.error("[news] errors:", errors);

  return NextResponse.json(allItems, {
    headers: {
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
