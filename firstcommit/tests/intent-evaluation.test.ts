import { describe, expect, it } from "vitest";
import { evaluateIntents } from "../lib/intent-evaluation";

describe("intent evaluation", () => {
  it("calculates multi-label micro metrics", () => {
    const result = evaluateIntents([{ id:"1", query:"a", labels:["x", "y"] }, { id:"2", query:"b", labels:["z"] }], (query) => query === "a" ? ["x", "y"] : ["x"]);
    expect(result.exactMatch).toBe(0.5);
    expect(result.microPrecision).toBeCloseTo(2 / 3);
    expect(result.microRecall).toBeCloseTo(2 / 3);
    expect(result.microF1).toBeCloseTo(2 / 3);
  });
});
