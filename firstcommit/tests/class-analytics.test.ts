import { describe, expect, it } from "vitest";
import { classWeakConcepts } from "../lib/class-analytics";

describe("class analytics privacy boundary", () => {
  const teacher = { id:"t1", role:"teacher" as const, institutionId:"i1", classIds:["cn-b"] };
  it("returns aggregated weak concepts only to an assigned teacher", async () => {
    const result = await classWeakConcepts(teacher, "cn-b");
    expect(result.concepts).toHaveLength(2);
    expect(JSON.stringify(result)).not.toContain("student-");
  });
  it("rejects an unassigned teacher", async () => await expect(classWeakConcepts({ ...teacher, classIds:["other"] }, "cn-b")).rejects.toThrow("Not authorized"));
});
