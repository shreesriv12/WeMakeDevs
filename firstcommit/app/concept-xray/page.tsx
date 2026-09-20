"use client";

import { DEMO_TOPIC, DEMO_MISCONCEPTION, DEMO_RECOVERY } from "@/lib/demo-content";
import { FormEvent, useState } from "react";
import { useSearchParams } from "next/navigation";
import { SignInPanel, useAuthSession } from "@/components/auth-session";

type Result = { sessionId: string; retrievalProvider: string; diagnosis: { misconception: string; whyItBreaks: string; correctionBridge: string; recoveryChallenge: string; confidence: number; evidenceSource: string }; sources: { title: string; sourceUrl: string }[] };
type Recovery = { score: number; feedback: string; masteryEligible: boolean; nextStep: string };

export default function ConceptXRayPage() {
  const params = useSearchParams();
  const { idToken, loading, apiFetch } = useAuthSession();
  const [focus, setFocus] = useState(() => params.get("topic") ?? DEMO_TOPIC);
  const [kind, setKind] = useState<"text" | "voice" | "code" | "canvas">("text");
  const [evidence, setEvidence] = useState(DEMO_MISCONCEPTION);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [recovery, setRecovery] = useState("");
  const [recoveryResult, setRecoveryResult] = useState<Recovery | null>(null);

  async function inspect(event: FormEvent) {
    event.preventDefault(); setSubmitting(true); setError(""); setResult(null); setRecovery(""); setRecoveryResult(null);
    try {
      const response = await apiFetch("/api/concept-xray", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ classId: "cn-b", focus, inputKind: kind, evidence }) });
      const body = await response.json(); if (!response.ok) throw new Error(body.error ?? "Could not inspect this reasoning"); setResult(body);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not inspect this reasoning"); }
    finally { setSubmitting(false); }
  }
  async function explain(event: FormEvent) {
    event.preventDefault(); if (!result) return; setSubmitting(true); setError("");
    try { const response = await apiFetch(`/api/concept-xray/${result.sessionId}/recovery`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ response: recovery }) }); const body = await response.json(); if (!response.ok) throw new Error(body.error ?? "Could not evaluate your explanation"); setRecoveryResult(body); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Could not evaluate your explanation"); }
    finally { setSubmitting(false); }
  }

  if (loading) return <main><p>Checking sign-in session…</p></main>;
  if (!idToken) return <main><section className="hero"><span className="eyebrow">CONCEPT X-RAY</span><h1>Show where your understanding broke.</h1><p>Sign in to inspect an explanation against your authorized course notes.</p></section><SignInPanel /></main>;
  return <main><section className="hero"><span className="eyebrow">CONCEPT X-RAY</span><h1>Find the first wrong assumption.</h1><p>Paste an explanation, transcript, code reasoning, or canvas description. ShikshaMesh compares it with your course notes and gives one small recovery challenge.</p></section><form className="composer" onSubmit={inspect}><label htmlFor="xray-focus">Topic</label><input id="xray-focus" value={focus} onChange={(event) => setFocus(event.target.value)} /><label htmlFor="xray-kind">Evidence type</label><select id="xray-kind" value={kind} onChange={(event) => setKind(event.target.value as typeof kind)}><option value="text">Written explanation</option><option value="voice">Voice transcript</option><option value="code">Code reasoning</option><option value="canvas">Canvas explanation</option></select><label htmlFor="xray-evidence">Your reasoning</label><textarea id="xray-evidence" rows={7} value={evidence} onChange={(event) => setEvidence(event.target.value)} /><button disabled={submitting}>{submitting ? "Inspecting reasoning…" : "Run Concept X-Ray"}</button></form>{error && <p className="error">{error}</p>}{result && <section className="result xray-result"><span className="eyebrow">MISCONCEPTION PATH · {Math.round(result.diagnosis.confidence * 100)}% CONFIDENCE</span><h2>First likely misconception</h2><p>{result.diagnosis.misconception}</p><h3>Why it breaks the solution</h3><p>{result.diagnosis.whyItBreaks}</p><h3>Correction bridge</h3><p>{result.diagnosis.correctionBridge}</p><div className="recovery-card"><span>2-MINUTE RECOVERY</span><p>{result.diagnosis.recoveryChallenge}</p></div><form className="explain-back-form" onSubmit={explain}><label htmlFor="explain-back">Explain it back</label><button type="button" onClick={() => setRecovery(DEMO_RECOVERY)}>Load sample library explanation</button><textarea id="explain-back" rows={5} value={recovery} onChange={(event) => setRecovery(event.target.value)} placeholder="Teach the corrected idea back in your own words…" /><button disabled={submitting || recovery.trim().length < 12}>{submitting ? "Checking…" : "Check my explanation"}</button></form>{recoveryResult && <div className={recoveryResult.masteryEligible ? "recovery-result passed" : "recovery-result"}><b>{recoveryResult.masteryEligible ? "Recovery looks strong" : "Try one more time"}</b><p>Score: {recoveryResult.score}% · {recoveryResult.feedback}</p><small>{recoveryResult.nextStep}</small></div>}<p><small>Grounded in: {result.diagnosis.evidenceSource} · Retrieval: {result.retrievalProvider}</small></p></section>}</main>;
}
