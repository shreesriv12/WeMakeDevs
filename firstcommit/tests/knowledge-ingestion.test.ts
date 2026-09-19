import { afterEach, describe, expect, it } from "vitest";
import { startKnowledgeIngestion } from "../lib/aws/knowledge-ingestion";

const env = { region:process.env.AWS_REGION, kb:process.env.BEDROCK_KNOWLEDGE_BASE_ID, source:process.env.BEDROCK_KNOWLEDGE_BASE_DATA_SOURCE_ID };
afterEach(() => { process.env.AWS_REGION=env.region; process.env.BEDROCK_KNOWLEDGE_BASE_ID=env.kb; process.env.BEDROCK_KNOWLEDGE_BASE_DATA_SOURCE_ID=env.source; });
describe("knowledge ingestion", () => {
  it("does not call AWS until the knowledge-base configuration is complete", async () => {
    delete process.env.AWS_REGION; delete process.env.BEDROCK_KNOWLEDGE_BASE_ID; delete process.env.BEDROCK_KNOWLEDGE_BASE_DATA_SOURCE_ID;
    await expect(startKnowledgeIngestion("institutions/a/classes/b/file.pdf")).resolves.toEqual({ provider:"local", status:"not-configured" });
  });
});
