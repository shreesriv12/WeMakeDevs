import { afterEach, describe, expect, it } from "vitest";
import { generateTutorResponse } from "../lib/tutor-response";

const openRouterKey = process.env.OPENROUTER_API_KEY;
afterEach(() => { process.env.OPENROUTER_API_KEY = openRouterKey; });

describe("grounded tutor response", () => {
  it("uses the local fallback without an OpenRouter key", async () => {
    delete process.env.OPENROUTER_API_KEY;
    const reply = await generateTutorResponse("Explain TCP", "English", [{ id:"1", title:"TCP", text:"TCP uses acknowledgement.", sourceUrl:"https://example.edu" }]);
    expect(reply.provider).toBe("local");
    expect(reply.text).toContain("TCP");
  });
});
