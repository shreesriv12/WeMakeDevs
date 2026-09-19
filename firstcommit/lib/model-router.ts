export type ModelRoute = { model: string; confidence: number; reason: string; fallback: string };
export function selectModelRoute(input: { language: string; hasEvidence: boolean; evidenceCount: number; offline?: boolean }) : ModelRoute {
  if (input.offline) return { model:"Offline Knowledge Mode", confidence:0.68, reason:"Connectivity is unavailable, so cached course context is preferred over cloud inference.", fallback:"Queue cloud enrichment when connectivity returns" };
  if (!input.hasEvidence) return { model:"Deterministic course-first tutor", confidence:0.42, reason:"No authorized course evidence was retrieved; avoid unsupported cloud claims.", fallback:"Ask the learner to upload or select relevant notes" };
  if (input.language !== "English") return { model:"Grounded multilingual tutor", confidence:Math.min(0.97, 0.78 + input.evidenceCount * 0.06), reason:"Authorized evidence and a multilingual request favor a grounded translation-aware route.", fallback:"Deterministic bilingual explanation" };
  return { model:"Grounded tutor", confidence:Math.min(0.97, 0.78 + input.evidenceCount * 0.06), reason:"Authorized evidence is available with acceptable expected cost and latency.", fallback:"Deterministic course-first response" };
}
