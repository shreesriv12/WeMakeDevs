import type { Actor } from "./auth";
import { retrieveKnowledge } from "./knowledge-retriever";
import { generateWithOpenRouter } from "./voice-providers";

export type DiagramKind = "flowchart" | "sequence" | "class" | "state" | "er";
export type DiagramRequest = { classId:string; topic:string; kind:DiagramKind };

const starters: Record<DiagramKind, (topic:string) => string> = {
  flowchart: topic => `flowchart TD\n  A[Start: ${topic}] --> B[Read the key idea]\n  B --> C{Understand it?}\n  C -- Yes --> D[Apply it] \n  C -- Not yet --> E[Review example]\n  E --> B\n  D --> F[Practice question]`,
  sequence: topic => `sequenceDiagram\n  participant Student\n  participant Tutor\n  participant Notes\n  Student->>Tutor: Ask about ${topic}\n  Tutor->>Notes: Retrieve approved concepts\n  Notes-->>Tutor: Relevant explanation\n  Tutor-->>Student: Explain and give practice`,
  class: topic => `classDiagram\n  class ${safeName(topic)}Concept {\n    +String definition\n    +explain()\n    +practice()\n  }\n  class Student {\n    +askQuestion()\n    +attemptPractice()\n  }\n  Student --> ${safeName(topic)}Concept : learns`,
  state: topic => `stateDiagram-v2\n  [*] --> Learning\n  Learning --> Practising: study ${topic}\n  Practising --> NeedsReview: misconception found\n  NeedsReview --> Learning: targeted correction\n  Practising --> Mastered: explain it back\n  Mastered --> [*]`,
  er: topic => `erDiagram\n  STUDENT ||--o{ ATTEMPT : makes\n  CONCEPT ||--o{ ATTEMPT : assesses\n  CONCEPT { string name \"${topic}\" }\n  STUDENT { string learner_id }\n  ATTEMPT { number score }`,
};
function safeName(value:string){return (value.replace(/[^a-zA-Z0-9]/g,"_").replace(/^\d/,"Topic_").slice(0,32)||"Topic");}
function codeOnly(value:string){return value.replace(/^```(?:mermaid)?\s*/i,"").replace(/\s*```$/," ").trim();}
function valid(kind:DiagramKind, code:string){const heads:Record<DiagramKind,RegExp>={flowchart:/^(flowchart|graph)\s/i,sequence:/^sequenceDiagram\b/i,class:/^classDiagram\b/i,state:/^stateDiagram-v2\b/i,er:/^erDiagram\b/i};return heads[kind].test(code) && code.length<12000;}

export async function createDiagram(actor:Actor,input:DiagramRequest){
  if(!actor.classIds.includes(input.classId)&&actor.role!=="admin")throw new Error("Not authorized for this class");
  const retrieval=await retrieveKnowledge({institutionId:actor.institutionId,classId:input.classId,query:input.topic,limit:3});
  const fallback=starters[input.kind](input.topic);
  if(!process.env.OPENROUTER_API_KEY||!retrieval.sources.length)return {code:fallback,provider:"template" as const,sources:retrieval.sources};
  const notes=retrieval.sources.map((source,index)=>`[${index+1}] ${source.title}\n${source.text}`).join("\n\n").slice(0,11000);
  try { const reply=codeOnly(await generateWithOpenRouter(`Create exactly one Mermaid ${input.kind} diagram about "${input.topic}" using ONLY the authorized notes below. Return Mermaid code only: no markdown fence, prose, HTML, click links, styles, or init directives. Keep it under 18 nodes and make it pedagogically clear. Authorized notes:\n${notes}`)); return {code:valid(input.kind,reply)?reply:fallback,provider:valid(input.kind,reply)?"openrouter" as const:"template" as const,sources:retrieval.sources}; }
  catch { return {code:fallback,provider:"template" as const,sources:retrieval.sources}; }
}
