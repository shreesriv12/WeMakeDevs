"use client";
import { useState } from "react";
import dynamic from "next/dynamic";
import Editor from "@monaco-editor/react";
import { SignInPanel, useAuthSession } from "@/components/auth-session";

const KonvaBoard = dynamic(() => import("@/components/konva-board"), { ssr:false, loading:() => <section className="result"><p>Loading canvas…</p></section> });
type Kind = "note" | "geometry" | "code";

export default function CanvasPage() {
  const { idToken, loading, apiFetch } = useAuthSession(); const [kind,setKind]=useState<Kind>("note"), [object,setObject]=useState("empty workspace"), [answer,setAnswer]=useState("");
  const [content,setContent]=useState("Select a drawing, note, geometry object, or code snippet and ask for help."); const [code,setCode]=useState("function kthAncestor(node: number, k: number, up: number[][]) {\n  for (let bit = 0; k > 0; bit += 1, k >>= 1) {\n    if (k & 1) node = up[node][bit];\n  }\n  return node;\n}"); const [language,setLanguage]=useState("typescript");
  async function ask() { const prompt=`Learning Canvas ${kind} context: ${content}. Latest object: ${object}.${kind==="code"?`\n${language} code:\n${code}`:""}\nUse my authorized course notes, identify a likely mistake, and suggest one practice question.`; const response=await apiFetch("/api/orchestrate",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({query:prompt})}); const body=await response.json(); setAnswer(response.ok?body.answer:body.error); }
  if (loading) return <main><p>Checking sign-in session…</p></main>; if (!idToken) return <main><section className="hero"><h1>Learning Canvas</h1></section><SignInPanel /></main>;
  return <main><section className="hero"><span className="eyebrow">KONVA + MONACO LEARNING CANVAS</span><h1>Draw, code, reason, then ask AI.</h1><p>Structured canvas objects and code become grounded learning context.</p></section><KonvaBoard onChange={setObject}/><section className="result"><p><button onClick={()=>setKind("note")}>Note</button> <button onClick={()=>setKind("geometry")}>Geometry</button> <button onClick={()=>setKind("code")}>Code</button></p>{kind==="code"&&<><label htmlFor="code-language">Language</label><select id="code-language" value={language} onChange={(event)=>setLanguage(event.target.value)}><option value="typescript">TypeScript</option><option value="javascript">JavaScript</option><option value="python">Python</option><option value="cpp">C++</option></select><label>Code workspace</label><div className="monaco-shell"><Editor height="360px" language={language} theme="vs-dark" value={code} onChange={(value)=>setCode(value??"")} options={{minimap:{enabled:false},fontSize:15,automaticLayout:true}}/></div></>}<label>Selected {kind} context</label><textarea rows={6} value={content} onChange={(event)=>setContent(event.target.value)}/><button onClick={()=>void ask()}>Ask ShikshaMesh</button>{answer&&<p className="answer">{answer}</p>}</section></main>;
}
