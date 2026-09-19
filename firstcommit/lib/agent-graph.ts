import type { Actor } from "./auth";
import { heuristicIntents } from "./intent-router";
import { Annotation, END, START, StateGraph } from "@langchain/langgraph";

export type AgentName = "tutor" | "teacher_quiz" | "research" | "course_interview";

const AgentState = Annotation.Root({
  actor: Annotation<Actor>,
  query: Annotation<string>,
  intents: Annotation<string[]>({ reducer: (_, next) => next, default: () => [] }),
  agent: Annotation<AgentName | undefined>,
  result: Annotation<{ agent: AgentName; message: string; requiresApproval?: boolean } | undefined>
});

function selectAgent(state: typeof AgentState.State): AgentName {
  if (/\b(interview|viva|oral practice|mock interview)\b/i.test(state.query)) return "course_interview";
  if (state.intents.includes("external_research")) return "research";
  if (state.intents.includes("assessment") && (state.actor.role === "teacher" || state.actor.role === "admin")) return "teacher_quiz";
  return "tutor";
}

const graph = new StateGraph(AgentState)
  .addNode("route", (state) => {
    const intents = state.intents.length ? state.intents : heuristicIntents(state.query);
    return { intents, agent: selectAgent({ ...state, intents }) };
  })
  .addNode("tutor", (state) => ({ result: { agent: "tutor", message: "Tutor route selected. Retrieve only course chunks authorized for the learner's institution and class before answering." } }))
  .addNode("teacher_quiz", (state) => ({ result: { agent: "teacher_quiz", message: "Teacher quiz route selected. A teacher-approved request may start the durable Step Functions quiz workflow.", requiresApproval: true } }))
  .addNode("research", (state) => ({ result: { agent: "research", message: "Research route selected. Use only the policy-gated official-source search tool; do not send student PII.", requiresApproval: true } }))
  .addNode("course_interview", () => ({ result: { agent: "course_interview", message: "Course Interview Agent selected. Retrieve authorized uploaded notes, ask grounded oral-practice questions, and evaluate only the student's submitted response." } }))
  .addEdge(START, "route")
  .addConditionalEdges("route", (state) => state.agent ?? "tutor", { tutor: "tutor", teacher_quiz: "teacher_quiz", research: "research", course_interview: "course_interview" })
  .addEdge("tutor", END)
  .addEdge("teacher_quiz", END)
  .addEdge("research", END)
  .addEdge("course_interview", END)
  .compile();

export async function runShikshaMeshAgentGraph(actor: Actor, query: string, intents: string[] = []) {
  const result = await graph.invoke({ actor, query, intents });
  if (!result.result) throw new Error("Agent graph did not produce a result");
  return { ...result.result, intents: result.intents };
}
