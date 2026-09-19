import { afterEach, describe, expect, it } from "vitest";
import { heuristicIntents, routeIntents } from "../lib/intent-router";

const endpoint = process.env.SAGEMAKER_INTENT_ENDPOINT;
afterEach(() => { process.env.SAGEMAKER_INTENT_ENDPOINT = endpoint; });

describe("intent routing", () => {
  it("uses deterministic routing until a SageMaker endpoint is configured", async () => {
    delete process.env.SAGEMAKER_INTENT_ENDPOINT;
    const result = await routeIntents("Analyze my last quiz and create questions from the professor notes in Hindi");
    expect(result.provider).toBe("heuristic");
    expect(result.intents).toEqual(expect.arrayContaining(["assessment", "personalization", "knowledge_retrieval", "language_support"]));
  });
  it("recognizes Hindi and Hinglish course requests", () => {
    expect(heuristicIntents("मेरी पीडीएफ में पेज रिप्लेसमेंट वाला भाग खोजो")).toContain("knowledge_retrieval");
    expect(heuristicIntents("plz is topic ko hinglsh me smjhao")).toContain("language_support");
    expect(heuristicIntents("Mere class notes se 10 sawal banao")).toEqual(expect.arrayContaining(["assessment", "knowledge_retrieval"]));
  });
});
