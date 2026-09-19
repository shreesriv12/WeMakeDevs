import { describe, expect, it } from "vitest";
import { selectModelRoute } from "../lib/model-router";

describe("model router", () => {
  it("refuses unsupported cloud claims when no evidence is available", () => {
    expect(selectModelRoute({ language: "English", hasEvidence: false, evidenceCount: 0 }).model).toBe("Deterministic course-first tutor");
  });

  it("uses a grounded multilingual route when authorized notes are available", () => {
    const result = selectModelRoute({ language: "Hinglish -> Hindi", hasEvidence: true, evidenceCount: 2 });
    expect(result.model).toBe("Grounded multilingual tutor");
    expect(result.confidence).toBeGreaterThan(0.8);
  });
});
