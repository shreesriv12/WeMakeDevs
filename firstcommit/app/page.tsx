"use client";

import { FormEvent, useState } from "react";
import { queueOrchestration } from "@/lib/offline-queue";
import { SignInPanel, useAuthSession } from "@/components/auth-session";
import { MarkdownAnswer } from "@/components/markdown-answer";
import { TopicWorkspace } from "@/components/topic-workspace";
import { ShapesDots } from "@/components/ui/shapes-dots";
import "./landing-refresh.css";
import "./student-workspace.css";

type Step = { id: string; label: string; status: "queued" | "complete" | "skipped"; detail: string };
type Result = { language: string; intents: string[]; steps: Step[]; answer: string; sources: { title: string; url: string; kind: string }[]; auditId: string; modelDecision: { model: string; reason: string; confidence: number; fallback: string } };
type Assessment = { assessmentId:string; topic:string; estimatedMastery:number; masteryProvider:string; modelVersion?:string; questions:{ id:string; prompt:string; options:string[] }[] };
type AssessmentScore = { attempted:number; correct:number; score:number };

const defaultPrompt = "Mujhe kal ka Computer Networks test prepare karna hai. Professor ke notes dekho, meri last 3 quizzes analyze karo, mujhe weak topics Hindi mein sikhao, phir 10 questions ka adaptive test lo.";

export default function Home() {
  const { apiFetch, idToken, role, loading: authLoading } = useAuthSession();
  const [prompt, setPrompt] = useState(defaultPrompt);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [assessmentScore, setAssessmentScore] = useState<AssessmentScore | null>(null);

  async function run(event: FormEvent) {
    event.preventDefault(); setLoading(true); setError(""); setResult(null); setAssessment(null); setAssessmentScore(null); setAnswers({});
    if (!navigator.onLine) {
      try { const queued = await queueOrchestration(prompt); setError(`You are offline. Request ${queued.id.slice(0, 8)} is queued and will replay when online.`); }
      catch { setError("You are offline and this browser could not save the request locally."); }
      finally { setLoading(false); }
      return;
    }
    try {
      const response = await apiFetch("/api/orchestrate", { method: "POST", headers: { "content-type":"application/json" }, body:JSON.stringify({ query:prompt }) });
      const body = await response.json(); if (!response.ok) throw new Error(body.error ?? "Request failed"); setResult(body);
    } catch (e) { setError(e instanceof Error ? e.message : "Request failed"); }
    finally { setLoading(false); }
  }

  async function startAssessment() {
    setLoading(true); setError("");
    try {
      const response = await apiFetch("/api/assessments/adaptive", { method:"POST", headers:{ "content-type":"application/json" }, body:JSON.stringify({ count:3, context:prompt }) });
      const body = await response.json(); if (!response.ok) throw new Error(body.error ?? "Could not create assessment"); setAssessment(body);
    } catch (e) { setError(e instanceof Error ? e.message : "Could not create assessment"); }
    finally { setLoading(false); }
  }

  async function submitAssessment(event: FormEvent) {
    event.preventDefault(); if (!assessment) return; setLoading(true); setError("");
    try {
      const response = await apiFetch("/api/assessments/submit", { method:"POST", headers:{ "content-type":"application/json" }, body:JSON.stringify({ answers:Object.entries(answers).map(([questionId, answer]) => ({ questionId, answer })) }) });
      const body = await response.json(); if (!response.ok) throw new Error(body.error ?? "Could not score assessment"); setAssessmentScore(body);
    } catch (e) { setError(e instanceof Error ? e.message : "Could not score assessment"); }
    finally { setLoading(false); }
  }

  if (authLoading) return <main><p>Checking sign-in session…</p></main>;
  if (!idToken) return <main className="landing-page landing-monochrome">
    <section className="landing-hero"><ShapesDots cellSize={40} influenceRadiusVmin={25} idleScale={.1} minPeakScale={1} maxPeakScale={3} shapes={["circle","triangle","square"]} opacity={1}/><div className="landing-shell"><div className="landing-content"><span className="eyebrow">SHIKSHAMESH · AI LEARNING OS</span><h1>Your notes become a <span>learning space.</span></h1><p>Ask grounded questions, practise with an AI interviewer, research current information, draw on a smart canvas, and join live classes built around your own course material.</p><div className="landing-actions"><a className="primary-link" href="/auth">Get started <span aria-hidden="true">→</span></a><a className="secondary-link" href="#features">Explore features</a></div><div className="landing-proof"><span>Course-grounded AI</span><span>Multilingual support</span><span>Collaborative learning</span></div></div><div className="landing-demo" aria-label="ShikshaMesh agent workflow preview"><div className="demo-tabs"><span className="active">Ask</span><span>Practise</span><span>Research</span><span>Create</span></div><div className="demo-prompt">Explain recursion using my course notes...</div><div className="demo-tags"><span className="tag-green">Use my course material</span><span className="tag-blue">Search with SerpApi</span><span className="tag-purple">AI agents</span></div><div className="demo-flow"><span>Course Retrieval</span><b>→</b><span>Research Agent</span><b>→</b><span>SerpApi</span><b>→</b><span>Grounded Answer</span></div><div className="demo-answer"><strong>Based on your notes, recursion is a technique where a function calls itself to solve a smaller subproblem...</strong><div><span>Cited from your notes</span><span>External sources</span></div></div></div></div></section>
    <section id="features" className="feature-grid"><article><span>01</span><h2>Learn from your notes</h2><p>Private retrieval from approved course documents with evidence-backed answers and clear source separation.</p><a href="/auth">Start learning →</a></article><article><span>02</span><h2>Practise actively</h2><p>Adaptive quizzes, voice-based AI interviews, code workspace, Concept X-Ray, and visual canvas.</p><a href="/auth">Start practising →</a></article><article><span>03</span><h2>Learn together</h2><p>Topic-focused live rooms, shared work, hands-up interaction, and classroom discussion.</p><a href="/auth">Explore collaboration →</a></article></section>
  </main>;
  if (role === "teacher" || role === "admin") return <main><section className="hero"><span className="eyebrow">SHIKSHAMESH {role.toUpperCase()}</span><h1>Plan once. Orchestrate the rest.</h1><p>Use the teacher workspace to upload course material, create multilingual quizzes, schedule workflows, and review aggregated class insights.</p><a href="/teacher">Open teacher workflow →</a></section><SignInPanel /></main>;

  return <main className="student-workspace"><div className="student-shell">
    <section className="student-hero"><span className="student-kicker">SHIKSHAMESH · STUDENT WORKSPACE</span><h1>Ask your course.<br/>Understand the answer.</h1><p>Ground every response in your approved material, see how the system routed your request, and turn an explanation into active practice.</p><a href="/teacher">Teacher workflow →</a></section>
    <form onSubmit={run} className="request-card"><label htmlFor="query">What do you want to learn?</label><textarea id="query" value={prompt} onChange={(e) => setPrompt(e.target.value)} rows={5}/><button disabled={loading}>{loading ? "Working through your course…" : "Ask ShikshaMesh →"}</button></form>
    {error && <p className="error">{error}</p>}
    {result && <section className="orchestration-result">
      <div className="result-meta"><span>Language · <b>{result.language}</b></span><span>Intent · <b>{result.intents.join(", ")}</b></span><span>Audit · <b>{result.auditId.slice(0,12)}</b></span></div>
      <section className="decision-card"><div><span className="student-kicker">ROUTING DECISION</span><h2>Why this learning route?</h2><p><b>{result.modelDecision.model}</b> · {result.modelDecision.reason}</p><small>Safe fallback · {result.modelDecision.fallback}</small></div><div className="confidence-pill"><strong>{Math.round(result.modelDecision.confidence*100)}%</strong><span>confidence</span></div></section>
      <section className="result-section"><div className="section-heading"><h2>How your request was handled</h2><p>Transparent orchestration</p></div><div className="graph">{result.steps.map((step)=><article key={step.id} className={step.status}><b>{step.label}</b><small>{step.detail}</small></article>)}</div></section>
      <section className="result-section"><div className="section-heading"><h2>Your answer</h2><p>Grounded in approved context</p></div><div className="answer-card"><MarkdownAnswer text={result.answer}/><button onClick={startAssessment} disabled={loading}>Turn this into a quiz →</button></div></section>
      <section className="result-section"><TopicWorkspace topic={prompt} sources={result.sources}/></section>
      {result.sources.length>0 && <section className="result-section"><div className="section-heading"><h2>Evidence</h2><p>{result.sources.length} source{result.sources.length===1?"":"s"}</p></div><div className="evidence-card"><ul>{result.sources.map((source)=><li key={source.url}><a href={source.url} target="_blank" rel="noreferrer">{source.title}</a> <small>({source.kind})</small></li>)}</ul></div></section>}
    </section>}
    {assessment && <section className="assessment"><h2>Adaptive assessment</h2><p>Focus: <b>{assessment.topic.replaceAll("_"," ")}</b> · Estimated mastery: <b>{Math.round(assessment.estimatedMastery*100)}%</b></p><small>Mastery source: {assessment.masteryProvider}{assessment.modelVersion?` (${assessment.modelVersion})`:""}</small><form onSubmit={submitAssessment}>{assessment.questions.map((question,index)=><fieldset key={question.id}><legend>{index+1}. {question.prompt}</legend>{question.options.map((option,optionIndex)=><label className="option" key={option}><input required type="radio" name={question.id} onChange={()=>setAnswers((current)=>({...current,[question.id]:optionIndex}))}/>{option}</label>)}</fieldset>)}<button disabled={loading}>{loading?"Scoring...":"Submit answers"}</button></form>{assessmentScore&&<p className="score">Score: <b>{assessmentScore.score}%</b> ({assessmentScore.correct}/{assessmentScore.attempted})</p>}</section>}
  </div></main>;
}
