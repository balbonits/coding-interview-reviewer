export interface RssItem {
  title: string;
  link: string;
  description: string;
  pubDate: string;
  source: string;
}

export interface FeedConfig {
  name: string;
  url: string;
  tags: string[];
}

export const FEEDS: FeedConfig[] = [
  {
    name: "JavaScript Weekly",
    url: "https://javascriptweekly.com/rss/",
    tags: ["javascript"],
  },
  {
    name: "CSS Weekly",
    url: "https://css-weekly.com/feed/",
    tags: ["css", "html"],
  },
  {
    name: "Smashing Magazine",
    url: "https://www.smashingmagazine.com/feed/",
    tags: ["css", "html", "ux-ui"],
  },
  {
    name: "Dev.to",
    url: "https://dev.to/feed",
    tags: ["javascript", "react", "typescript"],
  },
];

function extractTag(xml: string, tag: string): string {
  const re = new RegExp(
    `<${tag}[^>]*>(?:<!\[CDATA\[)?([\\s\\S]*?)(?:\\]\\]>)?<\\/${tag}>`,
    "i",
  );
  const m = xml.match(re);
  if (!m) return "";
  return m[1].trim().replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"');
}

function extractLinkAtom(xml: string): string {
  const m = xml.match(/<link[^>]+href="([^"]+)"/i);
  return m ? m[1] : "";
}

export function parseRss(xml: string, sourceName: string): RssItem[] {
  const items: RssItem[] = [];

  // RSS 2.0: <item>...</item>
  const rssRe = /<item[^>]*>([\s\S]*?)<\/item>/gi;
  let match;
  while ((match = rssRe.exec(xml))) {
    const block = match[1];
    const title = extractTag(block, "title");
    const link = extractTag(block, "link") || extractLinkAtom(block);
    const description = extractTag(block, "description") || extractTag(block, "summary");
    const pubDate = extractTag(block, "pubDate") || extractTag(block, "dc:date") || extractTag(block, "published");
    if (title && link) {
      items.push({ title, link, description, pubDate, source: sourceName });
    }
  }

  // Atom: <entry>...</entry>
  const atomRe = /<entry[^>]*>([\s\S]*?)<\/entry>/gi;
  while ((match = atomRe.exec(xml))) {
    const block = match[1];
    const title = extractTag(block, "title");
    const link = extractLinkAtom(block) || extractTag(block, "id");
    const description = extractTag(block, "summary") || extractTag(block, "content");
    const pubDate = extractTag(block, "published") || extractTag(block, "updated");
    if (title && link) {
      items.push({ title, link, description, pubDate, source: sourceName });
    }
  }

  return items;
}
