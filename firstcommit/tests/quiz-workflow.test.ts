import { describe, expect, it } from "vitest";
import { canLaunchQuizWorkflow } from "../lib/quiz-workflow";

const request = { classId:"cn-b", lectureSourceId:"cn-transport-01", languages:["hi","mr"], scheduledFor:"2026-10-01T09:00:00.000Z", difficulty:"easy" as const };
describe("teacher quiz workflow policy", () => {
  it("permits an assigned teacher", () => expect(canLaunchQuizWorkflow({ id:"t1", role:"teacher", institutionId:"i1", classIds:["cn-b"] }, request)).toBe(true));
  it("rejects a student and an unassigned teacher", () => {
    expect(canLaunchQuizWorkflow({ id:"s1", role:"student", institutionId:"i1", classIds:["cn-b"] }, request)).toBe(false);
    expect(canLaunchQuizWorkflow({ id:"t2", role:"teacher", institutionId:"i1", classIds:["other"] }, request)).toBe(false);
  });
});
