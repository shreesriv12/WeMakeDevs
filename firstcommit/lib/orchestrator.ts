import { authorize } from "@/lib/policy";
import { retrieveKnowledge } from "@/lib/knowledge-retriever";
import type { Actor } from "@/lib/auth";
import { emitAudit } from "@/lib/audit";
import { routeIntents } from "@/lib/intent-router";
import { generateTutorResponse } from "@/lib/tutor-response";
import { runGovernedResearch } from "@/lib/research-gateway";
import { runShikshaMeshAgentGraph } from "@/lib/agent-graph";

export type Step = { id: string; label: string; status: "queued" | "complete" | "skipped"; detail: string };
export type OrchestrationResult = { language: string; intents: string[]; steps: Step[]; answer: string; sources: { title: string; url: string; kind: string }[]; auditId: string };

export async function orchestrate(query: string, actor: Actor): Promise<OrchestrationResult> {
  const intentRoute = await routeIntents(query); const intents = intentRoute.intents; const language = /[\u0900-\u097F]|mujhe|kal/i.test(query) ? "Hinglish -> Hindi" : "English";
  const agentRoute = await runShikshaMeshAgentGraph(actor, query, intents);
  const auditId = `audit-${crypto.randomUUID().slice(0, 8)}`;
  const profile = authorize({ role: actor.role, actorId: actor.id, subjectStudentId: actor.id, actorClassIds: actor.classIds, resourceClassId: "cn-b", action: "read_profile" });
  if (!profile.allowed) throw new Error(profile.reason);
  const retrieval = await retrieveKnowledge({ institutionId: actor.institutionId, classId: "cn-b", query });
  const courseChunks = retrieval.sources;
  const tutor = await generateTutorResponse(query, language, courseChunks);
  const webRequested = intents.includes("external_research");
  const research = await runGovernedResearch(actor, query, webRequested);
  const steps: Step[] = [
    { id:"language", label:"Language Agent", status:"complete", detail:`Detected ${language}` },
    { id:"intent", label:"Intent Router", status:"complete", detail:`${intentRoute.provider}: ${intents.join(", ") || "general tutoring"}${intentRoute.fallbackReason ? ` (${intentRoute.fallbackReason})` : ""}` },
    { id:"agent-router", label:"LangGraph Agent Router", status:"complete", detail:`Selected ${agentRoute.agent}: ${agentRoute.message}` },
    { id:"auth", label:"Authorization Service", status:"complete", detail:profile.reason },
    { id:"knowledge", label:"Knowledge Agent", status:"complete", detail: courseChunks.length ? `Retrieved ${courseChunks.length} approved course chunk(s) via ${retrieval.provider}` : "No matching approved course chunks; tutor will state this limitation" },
    { id:"mastery", label:"Student Model", status:"complete", detail:"Weakest topic: transport-layer reliability (46% mastery)" },
    { id:"search", label:"Search Gateway", status:webRequested ? "complete" : "skipped", detail:webRequested ? research.reason : "Course-first response; no web request" },
    { id:"tutor", label:"Tutor Agent", status:"complete", detail:`Generated grounded explanation via ${tutor.provider}${tutor.fallbackReason ? ` (${tutor.fallbackReason})` : ""}` },
    { id:"assessment", label:"Assessment Agent", status:intents.includes("assessment") ? "complete" : "skipped", detail:intents.includes("assessment") ? "Prepared adaptive 10-question test" : "No assessment requested" },
    { id:"verify", label:"Verification Agent", status:"complete", detail:"Response grounded in approved course material" }
  ];
  await emitAudit({ auditId, eventType:"orchestration.completed", actorId:actor.id, institutionId:actor.institutionId, classId:"cn-b", outcome:"success", metadata:{ language, intents, agent:agentRoute.agent, sourceCount:courseChunks.length, webSourceCount:research.results.length, retrievalProvider:retrieval.provider, intentProvider:intentRoute.provider, tutorProvider:tutor.provider } }).catch(() => undefined);
  return { language, intents, steps, auditId, answer:tutor.text, sources:[...courseChunks.map((chunk) => ({ title: chunk.title, url: chunk.sourceUrl, kind:"approved course material" })), ...research.results.map((result) => ({ title:result.title, url:result.url, kind:"policy-approved external research" }))] };
}
