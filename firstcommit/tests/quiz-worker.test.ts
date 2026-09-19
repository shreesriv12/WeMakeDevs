import { describe, expect, it } from "vitest";

describe("quiz worker deployment contract", () => {
  it("defines each durable workflow stage", async () => {
    const definition = await import("node:fs/promises").then(({ readFile }) => readFile("infra/cli/quiz-workflow.asl.json", "utf8"));
    for (const stage of ["GenerateQuiz", "TranslateQuiz", "ScheduleNotification", "InitializeAnalytics"]) expect(definition).toContain(stage);
    expect(definition).toContain('"useOpenRouter.$": "$.useOpenRouter"');
    expect(definition).toContain("arn:aws:lambda:us-east-1:339486312822:function:shikshamesh-quiz-worker");
  });

  it("retrieves quiz context within institution, class, and selected document boundaries", async () => {
    const worker = await import("node:fs/promises").then(({ readFile }) => readFile("workers/quiz/index.mjs", "utf8"));
    expect(worker).toContain('{ key: "institutionId", match: { value: input.institutionId } }');
    expect(worker).toContain('{ key: "classId", match: { value: input.classId } }');
    expect(worker).toContain('{ key: "documentId", match: { value: input.lectureSourceId } }');
  });
});
