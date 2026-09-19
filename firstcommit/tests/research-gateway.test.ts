import { describe, expect, it } from "vitest";
import { runGovernedResearch } from "../lib/research-gateway";

const actor = { id:"s1", role:"student" as const, institutionId:"i1", classIds:["cn-b"] };
describe("governed external research", () => {
  it("does not invoke a provider without an external-research intent", async () => {
    await expect(runGovernedResearch(actor, "Explain TCP", false)).resolves.toEqual({ provider:"disabled", results:[], reason:"No external research intent" });
  });
});
