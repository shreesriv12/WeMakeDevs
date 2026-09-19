"use client";
import { useState } from "react";
import { useAuthSession } from "@/components/auth-session";

export function MasteryExport() {
  const { apiFetch, role } = useAuthSession(); const [acknowledged,setAcknowledged]=useState(false),[status,setStatus]=useState("");
  if(role!=="admin")return null;
  async function download(){setStatus("Preparing pseudonymous CSV…");try{const response=await apiFetch("/api/admin/mastery-training-events");if(!response.ok){const body=await response.json();throw new Error(body.error??"Unable to export events");}const blob=await response.blob();const url=URL.createObjectURL(blob);const anchor=document.createElement("a");anchor.href=url;anchor.download="mastery-training-events.csv";anchor.click();URL.revokeObjectURL(url);setStatus("Export downloaded. Store it only in an approved training location.");}catch(error){setStatus(error instanceof Error?error.message:"Unable to export events");}}
  return <section className="result"><span className="eyebrow">MASTER MODEL DATA</span><h2>Export pseudonymous quiz attempts</h2><p>The export excludes names, emails, raw messages, and Cognito tokens. It contains only salted learner IDs, topic/question IDs, correctness, timestamps, and difficulty.</p><label className="consent-check"><input type="checkbox" checked={acknowledged} onChange={(event)=>setAcknowledged(event.target.checked)}/> I confirm these are consented quiz attempts and will be used only for approved model evaluation/training.</label><button disabled={!acknowledged} onClick={()=>void download()}>Download mastery-training CSV</button>{status&&<p className="export-status">{status}</p>}</section>;
}
