import { NextRequest, NextResponse } from "next/server";
import { FEEDS, parseRss, type RssItem } from "@/lib/rss";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ITEM_LIMIT = 10; // items per feed

async function fetchFeed(url: string, name: string): Promise<RssItem[]> {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "coding-interview-reviewer/1.0" },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return [];
    const xml = await res.text();
    return parseRss(xml, name).slice(0, ITEM_LIMIT);
  } catch {
    return [];
  }
}

export async function GET(_req: NextRequest) {
  const results = await Promise.all(
    FEEDS.map((f) => fetchFeed(f.url, f.name)),
  );

  const allItems = results.flat().sort((a, b) => {
    const ta = a.pubDate ? new Date(a.pubDate).getTime() : 0;
    const tb = b.pubDate ? new Date(b.pubDate).getTime() : 0;
    return tb - ta;
  });

  return NextResponse.json(allItems, {
    headers: {
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
