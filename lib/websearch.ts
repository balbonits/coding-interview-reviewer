// SearXNG client for on-demand web search inside the floating study assistant.
// SearXNG runs locally as a Docker container; if it's not running this module
// gracefully reports unavailable and the caller falls back to non-search mode.

const SEARXNG_URL = process.env.SEARXNG_URL ?? "http://localhost:8888";
const HEALTH_TIMEOUT_MS = 1500;
const SEARCH_TIMEOUT_MS = 8000;

export type SearchResult = {
  title: string;
  url: string;
  snippet: string;
};

/**
 * Quick health check — returns true if SearXNG is reachable. Used to decide
 * whether to attach the web_search tool to a chat call.
 */
export async function isSearchAvailable(): Promise<boolean> {
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), HEALTH_TIMEOUT_MS);
    const res = await fetch(`${SEARXNG_URL}/healthz`, {
      signal: ctrl.signal,
    });
    clearTimeout(timer);
    return res.ok;
  } catch {
    return false;
  }
}

export async function webSearch(
  query: string,
  limit = 5,
): Promise<SearchResult[]> {
  const params = new URLSearchParams({
    q: query,
    format: "json",
    safesearch: "0",
    pageno: "1",
  });

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), SEARCH_TIMEOUT_MS);
  let json: unknown;
  try {
    const res = await fetch(`${SEARXNG_URL}/search?${params.toString()}`, {
      headers: { Accept: "application/json" },
      signal: ctrl.signal,
    });
    if (!res.ok) {
      throw new Error(`SearXNG ${res.status}`);
    }
    json = await res.json();
  } finally {
    clearTimeout(timer);
  }

  const data = json as {
    results?: Array<{ title?: string; url?: string; content?: string }>;
  };
  const raw = data.results ?? [];
  return raw
    .slice(0, limit)
    .map((r) => ({
      title: (r.title ?? "").trim(),
      url: (r.url ?? "").trim(),
      snippet: (r.content ?? "").trim(),
    }))
    .filter((r) => r.title && r.url);
}

/** Format results for inclusion in a chat tool-result message. */
export function formatResultsForModel(results: SearchResult[]): string {
  if (results.length === 0) return "No results found.";
  return results
    .map((r, i) => `[${i + 1}] ${r.title}\n${r.url}\n${r.snippet}`)
    .join("\n\n");
}
