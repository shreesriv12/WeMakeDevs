import type { Actor } from "./auth";
import { retrieveKnowledge, type KnowledgeSource } from "./knowledge-retriever";
import { generateWithOpenRouter } from "./voice-providers";
import { database, postgresEnabled } from "./postgres";

export type XRayInputKind = "text" | "voice" | "code" | "canvas";
export type ConceptDiagnosis = { misconception: string; whyItBreaks: string; correctionBridge: string; recoveryChallenge: string; confidence: number; evidenceSource: string };

function keywords(text: string) {
  return [...new Set((text.toLowerCase().match(/[\p{L}\p{N}]{4,}/gu) ?? []).filter((word) => !new Set(["this", "that", "with", "from", "have", "your", "into", "they", "will", "then"]).has(word)))].slice(0, 8);
}

async function ensureActorScope(actor: Actor, classId: string) {
  const client = database();
  await client.query("INSERT INTO institutions (id, name) VALUES ($1,$2) ON CONFLICT (id) DO NOTHING", [actor.institutionId, actor.institutionId]);
  await client.query("INSERT INTO users (id,institution_id,role,display_name) VALUES ($1,$2,$3,$4) ON CONFLICT (id) DO UPDATE SET display_name=COALESCE(EXCLUDED.display_name, users.display_name)", [actor.id, actor.institutionId, actor.role, actor.displayName ?? null]);
  await client.query("INSERT INTO classes (id,institution_id,name) VALUES ($1,$2,$3) ON CONFLICT (institution_id,id) DO NOTHING", [classId, actor.institutionId, classId]);
  await client.query("INSERT INTO class_memberships (institution_id,class_id,user_id) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING", [actor.institutionId, classId, actor.id]);
}

function deterministicDiagnosis(evidence: string, sources: KnowledgeSource[]): ConceptDiagnosis {
  const source = sources[0];
  const sourceTerms = keywords(source?.text ?? "");
  const learnerTerms = new Set(keywords(evidence));
  const missing = sourceTerms.filter((term) => !learnerTerms.has(term)).slice(0, 3);
  const focus = missing.join(", ") || sourceTerms.slice(0, 3).join(", ") || "the course concept";
  return { misconception: `Your explanation does not yet connect the key course ideas: ${focus}.`, whyItBreaks: "A correct final answer needs the relationship between these ideas, not just their names.", correctionBridge: `Return to the note section on ${source?.title ?? "the selected topic"}. State what each key idea means, then explain how one causes or constrains the next.`, recoveryChallenge: `In two or three sentences, explain ${focus} in your own words and give one concrete example.`, confidence: 0.55, evidenceSource: source?.title ?? "No retrieved note" };
}

async function diagnose(focus: string, evidence: string, sources: KnowledgeSource[]) {
  const fallback = deterministicDiagnosis(evidence, sources);
  if (!process.env.OPENROUTER_API_KEY || !sources.length) return fallback;
  try {
    const notes = sources.map((source, index) => `[${index + 1}] ${source.title}\n${source.text}`).join("\n\n").slice(0, 12000);
    const text = await generateWithOpenRouter(`You are ShikshaMesh Concept X-Ray. Diagnose the earliest likely misconception in a student's reasoning using only the supplied notes. Be supportive; do not claim certainty. Return JSON only with misconception, whyItBreaks, correctionBridge, recoveryChallenge, confidence (0 to 1), evidenceSource. Focus: ${focus}\nStudent evidence: ${evidence}\nAuthorized notes:\n${notes}`);
    const parsed = JSON.parse(text.replace(/^```json\s*|\s*```$/g, "").trim()) as Partial<ConceptDiagnosis>;
    if (typeof parsed.misconception !== "string" || typeof parsed.whyItBreaks !== "string" || typeof parsed.correctionBridge !== "string" || typeof parsed.recoveryChallenge !== "string" || typeof parsed.confidence !== "number") return fallback;
    return { misconception: parsed.misconception.slice(0, 700), whyItBreaks: parsed.whyItBreaks.slice(0, 700), correctionBridge: parsed.correctionBridge.slice(0, 900), recoveryChallenge: parsed.recoveryChallenge.slice(0, 600), confidence: Math.max(0, Math.min(1, parsed.confidence)), evidenceSource: typeof parsed.evidenceSource === "string" ? parsed.evidenceSource.slice(0, 200) : sources[0].title };
  } catch { return fallback; }
}

export async function createConceptXRay(actor: Actor, input: { classId: string; focus: string; inputKind: XRayInputKind; evidence: string }) {
  if (!actor.classIds.includes(input.classId)) throw new Error("Not authorized for this class");
  const retrieval = await retrieveKnowledge({ institutionId: actor.institutionId, classId: input.classId, query: `${input.focus}\n${input.evidence}`, limit: 3 });
  if (!retrieval.sources.length) throw new Error("No authorized course notes were found for this diagnosis");
  const diagnosis = await diagnose(input.focus, input.evidence, retrieval.sources);
  const sessionId = crypto.randomUUID();
  if (postgresEnabled()) await ensureActorScope(actor, input.classId).then(() => database().query("INSERT INTO concept_xray_sessions (id,student_id,institution_id,class_id,focus,input_kind,evidence,diagnosis) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)", [sessionId, actor.id, actor.institutionId, input.classId, input.focus, input.inputKind, input.evidence, JSON.stringify(diagnosis)])).catch(() => undefined);
  return { sessionId, retrievalProvider: retrieval.provider, diagnosis, sources: retrieval.sources.map((source) => ({ title: source.title, sourceUrl: source.sourceUrl })) };
}

function deterministicRecoveryScore(response: string, diagnosis: ConceptDiagnosis) {
  const expected = keywords(`${diagnosis.correctionBridge} ${diagnosis.recoveryChallenge}`);
  const answer = new Set(keywords(response));
  const matched = expected.filter((term) => answer.has(term));
  const coverage = matched.length / Math.max(1, Math.min(6, expected.length));
  return Math.min(100, Math.round(coverage * 75) + Math.min(25, Math.floor(response.trim().length / 18)));
}

export async function explainItBack(actor: Actor, sessionId: string, response: string) {
  if (!postgresEnabled()) throw new Error("Explain It Back requires PostgreSQL");
  const session = await database().query<{ id: string; student_id: string; institution_id: string; class_id: string; focus:string; diagnosis: ConceptDiagnosis }>("SELECT id,student_id,institution_id,class_id,focus,diagnosis FROM concept_xray_sessions WHERE id=$1", [sessionId]);
  const row = session.rows[0];
  if (!row || row.student_id !== actor.id || row.institution_id !== actor.institutionId) throw new Error("Concept X-Ray session not found");
  const answer = response.trim();
  if (answer.length < 12 || answer.length > 5000) throw new Error("Your explanation must be between 12 and 5000 characters");
  let score = deterministicRecoveryScore(answer, row.diagnosis);
  let feedback = score >= 70 ? "Good recovery. Your explanation reconnects the central ideas. This recovery is now recorded in your mastery history; confirm it with a short adaptive question too." : "You are moving in the right direction, but restate the correction bridge in your own words and include one concrete example.";
  if (process.env.OPENROUTER_API_KEY) {
    try {
      const text = await generateWithOpenRouter(`Evaluate a student's Explain It Back response against this Concept X-Ray diagnosis. Return JSON only: {"score":number,"feedback":string}. Score correctness, causal reasoning, and whether the original misconception is repaired. Do not award mastery solely for fluent wording. Diagnosis: ${JSON.stringify(row.diagnosis)}\nStudent explanation: ${answer}`);
      const parsed = JSON.parse(text.replace(/^```json\s*|\s*```$/g, "").trim()) as { score?: unknown; feedback?: unknown };
      if (typeof parsed.score === "number" && parsed.score >= 0 && parsed.score <= 100 && typeof parsed.feedback === "string" && parsed.feedback.length > 5) { score = Math.round(parsed.score); feedback = parsed.feedback.slice(0, 900); }
    } catch { /* Deterministic rubric remains the safe fallback. */ }
  }
  const masteryEligible = score >= 70;
  await database().query("INSERT INTO concept_xray_recoveries (id,session_id,response,score,feedback) VALUES ($1,$2,$3,$4,$5)", [crypto.randomUUID(), row.id, answer, score, feedback]);
  let masteryRecorded=false;
  if(masteryEligible){try{await database().query("INSERT INTO assessment_attempts (id,student_id,institution_id,class_id,topic,question_id,difficulty,score) VALUES ($1,$2,$3,$4,$5,$6,'medium',$7)",[crypto.randomUUID(),actor.id,row.institution_id,row.class_id,row.focus,`xray-recovery-${row.id}`,score]);masteryRecorded=true;}catch{/* Recovery remains saved even if optional mastery-history storage is unavailable. */}}
  return { sessionId: row.id, score, feedback, masteryEligible, masteryRecorded, nextStep: masteryEligible ? "Take one targeted adaptive question to confirm the recovered concept under a new question." : row.diagnosis.recoveryChallenge };
}

export type MisconceptionCluster={focus:string;misconception:string;learners:number;attempts:number;averageConfidence:number;latestAt:string};
export async function misconceptionHeatmap(actor:Actor,classId:string){
  if((actor.role!=="teacher"&&actor.role!=="admin")||(actor.role!=="admin"&&!actor.classIds.includes(classId)))throw new Error("Not authorized to view class misconceptions");
  if(!postgresEnabled())return [] as MisconceptionCluster[];
  const result=await database().query<{focus:string;misconception:string;learners:string;attempts:string;average_confidence:string;latest_at:Date}>("SELECT focus, COALESCE(diagnosis->>'misconception','Unclassified misconception') AS misconception, COUNT(DISTINCT student_id)::text AS learners, COUNT(*)::text AS attempts, AVG(COALESCE((diagnosis->>'confidence')::numeric,0))::text AS average_confidence, MAX(created_at) AS latest_at FROM concept_xray_sessions WHERE institution_id=$1 AND class_id=$2 GROUP BY focus,diagnosis->>'misconception' ORDER BY COUNT(*) DESC, MAX(created_at) DESC LIMIT 20",[actor.institutionId,classId]);
  return result.rows.map(row=>({focus:row.focus,misconception:row.misconception,learners:Number(row.learners),attempts:Number(row.attempts),averageConfidence:Number(row.average_confidence),latestAt:row.latest_at.toISOString()}));
}
