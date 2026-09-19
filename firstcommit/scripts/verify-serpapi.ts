import { searchWeb } from "../lib/serpapi";

async function main() {
  const results = await searchWeb("latest UGC education guidelines");
  if (!results.length) throw new Error("SerpAPI returned no allowlisted official sources");
  console.log(JSON.stringify({ provider: "serpapi", resultCount: results.length, domains: [...new Set(results.map((result) => new URL(result.url).hostname))] }, null, 2));
}

void main();
