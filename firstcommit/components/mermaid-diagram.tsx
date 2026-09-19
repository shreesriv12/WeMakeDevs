"use client";
import { useEffect, useId, useState } from "react";

export function MermaidDiagram({code}:{code:string}){
  const id=useId().replace(/[^a-zA-Z0-9]/g,""),[svg,setSvg]=useState(""),[error,setError]=useState("");
  useEffect(()=>{let cancelled=false;setSvg("");setError("");void import("mermaid").then(async({default:mermaid})=>{mermaid.initialize({startOnLoad:false,theme:"dark",securityLevel:"strict",flowchart:{useMaxWidth:true,htmlLabels:false}});try{const result=await mermaid.render(`shikshamesh-${id}`,code);if(!cancelled)setSvg(result.svg);}catch{if(!cancelled)setError("This diagram syntax could not be rendered. Edit the Mermaid code and try again.");}}).catch(()=>!cancelled&&setError("Diagram renderer could not load."));return()=>{cancelled=true;};},[code,id]);
  if(error)return <p className="error">{error}</p>;
  if(!svg)return <p className="diagram-loading">Rendering diagram…</p>;
  return <div className="mermaid-diagram" dangerouslySetInnerHTML={{__html:svg}} />;
}
