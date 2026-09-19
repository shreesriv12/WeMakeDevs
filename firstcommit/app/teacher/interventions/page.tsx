"use client";

import { useState } from "react";
import { SignInPanel, useAuthSession } from "@/components/auth-session";

type Signal = { concept: string; learnersAttempted: number; strugglingLearners: number; struggleRate: number };
type Plan = Signal & { id: string; plan: string[]; requiresTeacherApproval: boolean; safety: string; status: "recommended" | "approved" };

export default function InterventionsPage() {
  const { idToken, loading, apiFetch } = useAuthSession();
  const [signals, setSignals] = useState<Signal[]>([]);
  const [plan, setPlan] = useState<Plan | null>(null);
  const [message, setMessage] = useState("");

  async function loadSignals() {
    const response = await apiFetch("/api/teacher/analytics", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ classId: "cn-b", threshold: 0.4 }) });
    const body = await response.json();
    if (!response.ok) return setMessage(body.error);
    setSignals(body.concepts);
  }
  async function recommend(concept: string) {
    const response = await apiFetch("/api/teacher/interventions", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ classId: "cn-b", concept }) });
    const body = await response.json();
    if (!response.ok) return setMessage(body.error);
    setPlan(body);
  }
  async function approve() {
    if (!plan) return;
    const response = await apiFetch("/api/teacher/interventions", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ interventionId: plan.id }) });
    const body = await response.json();
    if (!response.ok) return setMessage(body.error);
    setPlan({ ...plan, status: "approved" });
    setMessage(body.message);
  }

  if (loading) return <main><p>Checking sign-in session…</p></main>;
  if (!idToken) return <main><section className="hero"><h1>Teacher intervention</h1></section><SignInPanel /></main>;
  return <main>
    <section className="hero"><span className="eyebrow">TEACHER INTERVENTION AGENT</span><h1>Act on class signals—with teacher approval.</h1><p>ShikshaMesh recommends a remedy only when aggregate struggle exceeds the configured threshold.</p><a href="/teacher">Back to teacher workspace</a></section>
    <section className="result"><button onClick={() => void loadSignals()}>Detect class signals</button>{signals.map((signal) => <article className="analytics" key={signal.concept}><h2>{signal.concept}</h2><p>{Math.round(signal.struggleRate * 100)}% struggling ({signal.strugglingLearners}/{signal.learnersAttempted})</p><button onClick={() => void recommend(signal.concept)}>Generate intervention plan</button></article>)}</section>
    {plan && <section className="result"><span className="eyebrow">{plan.status === "approved" ? "INTERVENTION APPROVED" : "TEACHER REVIEW REQUIRED"}</span><h2>{plan.concept}</h2><ol>{plan.plan.map((item) => <li key={item}>{item}</li>)}</ol><p>{plan.safety}</p>{plan.status === "recommended" && <button onClick={() => void approve()}>Approve and record intervention</button>}</section>}
    {message && <p className="score">{message}</p>}
  </main>;
}
