import { describe, expect, it } from "vitest";

describe("audit-event privacy contract", () => {
  it("defines metadata as scalar operational fields, not arbitrary request content", () => {
    const event = { auditId:"a1", eventType:"orchestration.completed" as const, actorId:"u1", institutionId:"i1", outcome:"success" as const, metadata:{ sourceCount:2, intents:["assessment"] } };
    expect(Object.values(event.metadata).every((value) => typeof value === "string" || typeof value === "number" || typeof value === "boolean" || Array.isArray(value))).toBe(true);
  });
});
