const pii = /\b([\w.+-]+@[\w.-]+\.[A-Za-z]{2,}|\+?\d[\d\s-]{7,}\b|student[-\s]?\d+)\b/gi;

export type SearchResult = { title: string; url: string; snippet: string; source: "serpapi" };

export async function searchWeb(query: string): Promise<SearchResult[]> {
  const key = process.env.SERPAPI_API_KEY; const domains = (process.env.SERPAPI_ALLOWED_DOMAINS ?? "").split(",").map((d) => d.trim()).filter(Boolean);
  if (!key || domains.length === 0) return [];
  const cleanQuery = query.replace(pii, "[redacted]");
  const url = new URL("https://serpapi.com/search.json"); url.searchParams.set("q", `${cleanQuery} (${domains.map((d) => `site:${d}`).join(" OR ")})`); url.searchParams.set("engine", "google"); url.searchParams.set("api_key", key);
  const response = await fetch(url, { signal: AbortSignal.timeout(6000), next: { revalidate: 3600 } });
  if (!response.ok) throw new Error("External research provider unavailable");
  const body = await response.json() as { organic_results?: { title?: string; link?: string; snippet?: string }[] };
  return (body.organic_results ?? []).filter((r) => r.link && domains.some((d) => new URL(r.link!).hostname.endsWith(d))).slice(0, 5).map((r) => ({ title:r.title ?? "Untitled source", url:r.link!, snippet:r.snippet ?? "", source:"serpapi" }));
}
