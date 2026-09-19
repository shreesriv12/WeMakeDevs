import { afterEach, describe, expect, it } from "vitest";
import { retrieveKnowledge } from "../lib/knowledge-retriever";

const before = { region: process.env.AWS_REGION, kb: process.env.BEDROCK_KNOWLEDGE_BASE_ID };
afterEach(() => { process.env.AWS_REGION = before.region; process.env.BEDROCK_KNOWLEDGE_BASE_ID = before.kb; });

describe("knowledge provider selection", () => {
  it("uses the scoped local repository when no Bedrock knowledge base is configured", async () => {
    delete process.env.AWS_REGION; delete process.env.BEDROCK_KNOWLEDGE_BASE_ID;
    const result = await retrieveKnowledge({ institutionId:"demo-institute", classId:"cn-b", query:"TCP retransmission" });
    expect(result.provider).toBe("local");
    expect(result.sources[0].id).toBe("cn-transport-01");
  });
});
