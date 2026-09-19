import { describe, expect, it } from "vitest";
import { runShikshaMeshAgentGraph } from "../lib/agent-graph";

const student = { id: "student-1", role: "student" as const, institutionId: "demo-institute", classIds: ["cn-b"] };
const teacher = { ...student, id: "teacher-1", role: "teacher" as const };

describe("LangGraph agent routing", () => {
  it("sends learner doubts to the tutor agent", async () => {
    await expect(runShikshaMeshAgentGraph(student, "Show my lecture notes")).resolves.toMatchObject({ agent: "tutor", intents: ["knowledge_retrieval"] });
  });
  it("requires approval before a teacher quiz workflow", async () => {
    await expect(runShikshaMeshAgentGraph(teacher, "Create a quiz from the notes")).resolves.toMatchObject({ agent: "teacher_quiz", requiresApproval: true });
  });
  it("routes official searches to the research agent", async () => {
    await expect(runShikshaMeshAgentGraph(student, "Search latest official guidance")).resolves.toMatchObject({ agent: "research", requiresApproval: true });
  });
  it("routes note-based oral practice to the course interview agent", async () => {
    await expect(runShikshaMeshAgentGraph(student, "Start a mock interview from my notes")).resolves.toMatchObject({ agent: "course_interview" });
  });
});
