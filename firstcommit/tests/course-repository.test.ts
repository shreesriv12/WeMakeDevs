import { describe, expect, it } from "vitest";
import { retrieveCourseChunks } from "../lib/course-repository";

describe("course retrieval", () => {
  it("returns only content from the requested tenant and class", () => {
    const result = retrieveCourseChunks({ institutionId: "demo-institute", classId: "cn-b", query: "TCP retransmission and flow control" });
    expect(result.length).toBeGreaterThan(0);
    expect(result[0].id).toBe("cn-transport-01");
  });
  it("does not make unrelated content available", () => {
    expect(retrieveCourseChunks({ institutionId: "other-institute", classId: "cn-b", query: "TCP" })).toEqual([]);
  });
});
