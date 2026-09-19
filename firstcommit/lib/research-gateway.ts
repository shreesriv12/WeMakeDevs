import { searchWeb, type SearchResult } from "./serpapi";
import type { Actor } from "./auth";
import { authorize } from "./policy";

export async function runGovernedResearch(actor: Actor, query: string, requested: boolean): Promise<{ provider: "disabled" | "serpapi"; results: SearchResult[]; reason: string }> {
  if (!requested) return { provider:"disabled", results:[], reason:"No external research intent" };
  const decision = authorize({ role:actor.role, actorId:actor.id, actorClassIds:actor.classIds, action:"search_web" });
  if (!decision.allowed) return { provider:"disabled", results:[], reason:decision.reason };
  try {
    const results = await searchWeb(query);
    return { provider: results.length ? "serpapi" : "disabled", results, reason: results.length ? "Approved external research completed" : "SerpAPI or domain allowlist is not configured" };
  } catch { return { provider:"disabled", results:[], reason:"External research provider unavailable" }; }
}
