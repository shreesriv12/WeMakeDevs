import { searchWeb, type SearchResult } from "./serpapi";

export type ResourcePurpose = "curriculum" | "prerequisites" | "safety" | "practice";
const purposePrompt: Record<ResourcePurpose, string> = {
  curriculum: "official syllabus curriculum learning outcomes",
  prerequisites: "official foundational prerequisites concepts guide",
  safety: "official safety guidance advisory",
  practice: "official learner practice examples guide"
};
export async function discoverOfficialResources(topic: string, purpose: ResourcePurpose): Promise<SearchResult[]> {
  return searchWeb(`${topic.trim().slice(0, 180)} ${purposePrompt[purpose]}`);
}
