import { describe, expect, it } from "vitest";
import { recommendIntervention } from "../lib/teacher-intervention";

const teacher = { id: "teacher-102", role: "teacher" as const, institutionId: "demo-institute", classIds: ["cn-b"] };

describe("teacher interventions", () => {
  it("requires an aggregate threshold signal before it recommends a remedy", async () => {
    const intervention = await recommendIntervention(teacher, "cn-b", "TCP retransmission");
    expect(intervention.status).toBe("recommended");
    expect(intervention.requiresTeacherApproval).toBe(true);
    expect(intervention.plan).toHaveLength(4);
  });
});
