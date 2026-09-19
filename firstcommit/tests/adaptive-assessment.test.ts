import { describe, expect, it } from "vitest";
import { createAdaptiveAssessment, scoreAdaptiveAssessment } from "../lib/adaptive-assessment";

const actor = { id:"student-391", role:"student" as const, institutionId:"demo-institute", classIds:["cn-b"] };
describe("adaptive assessment", () => {
  it("selects questions from the learner's weakest topic without leaking answers", () => {
    const assessment = createAdaptiveAssessment(actor, 3);
    expect(assessment.topic).toBe("transport_reliability");
    expect(assessment.questions).toHaveLength(3);
    expect(JSON.stringify(assessment.questions)).not.toContain('"answer"');
  });
  it("scores only known questions", () => {
    expect(scoreAdaptiveAssessment(actor, [{ questionId:"tcp-1", answer:0 }, { questionId:"unknown", answer:0 }])).toMatchObject({ attempted:1, correct:1, score:100 });
  });
});
