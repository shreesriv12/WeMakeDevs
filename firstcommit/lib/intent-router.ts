import { classifyIntentWithSageMaker } from "./aws/sagemaker-intent-router";

export type IntentRoute = { intents: string[]; provider: "heuristic" | "sagemaker"; fallbackReason?: string };

export function heuristicIntents(query: string) {
  const q = query.toLowerCase();
  return [
    q.match(/quiz|test|questions?|mcq|sawal|सवाल|प्रश्न|टेस्ट/) && "assessment",
    q.match(/weak|last.*quiz|history|analy[sz]e|progress|marks|performance/) && "personalization",
    q.match(/notes|professor|lecture|syllabus|pdf|document|खोजो|ढूंढ|नोट्स/) && "knowledge_retrieval",
    q.match(/hindi|hinglish|smjhao|samjhao|अनुवाद|अंग्रेज़ी|हिंदी|हिन्दी|translate|translation/) && "language_support",
    q.match(/web|latest|research|search|current|official|guidelines|abhi|आज|अब/) && "external_research"
  ].filter(Boolean) as string[];
}

export async function routeIntents(query: string): Promise<IntentRoute> {
  if (!process.env.SAGEMAKER_INTENT_ENDPOINT) return { intents: heuristicIntents(query), provider: "heuristic" };
  try {
    const response = await classifyIntentWithSageMaker(query);
    return { intents: response.labels, provider: response.provider };
  } catch {
    return { intents: heuristicIntents(query), provider: "heuristic", fallbackReason: "SageMaker endpoint unavailable" };
  }
}
