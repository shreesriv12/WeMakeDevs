import { BedrockAgentClient, GetIngestionJobCommand, StartIngestionJobCommand } from "@aws-sdk/client-bedrock-agent";

function configuredKnowledgeBase() {
  const region = process.env.AWS_REGION;
  const knowledgeBaseId = process.env.BEDROCK_KNOWLEDGE_BASE_ID;
  const dataSourceId = process.env.BEDROCK_KNOWLEDGE_BASE_DATA_SOURCE_ID;
  return { region, knowledgeBaseId, dataSourceId };
}

export async function startKnowledgeIngestion(uploadKey: string) {
  const { region, knowledgeBaseId, dataSourceId } = configuredKnowledgeBase();
  if (!region || !knowledgeBaseId || !dataSourceId) return { provider: "local" as const, status: "not-configured" as const };
  const response = await new BedrockAgentClient({ region }).send(new StartIngestionJobCommand({ knowledgeBaseId, dataSourceId, clientToken: crypto.randomUUID(), description: `ShikshaMesh upload ${uploadKey}` }));
  const job = response.ingestionJob;
  if (!job?.ingestionJobId) throw new Error("Bedrock did not return an ingestion job ID");
  return { provider: "bedrock" as const, status: job.status, ingestionJobId: job.ingestionJobId };
}

export async function getKnowledgeIngestionStatus(ingestionJobId: string) {
  const { region, knowledgeBaseId, dataSourceId } = configuredKnowledgeBase();
  if (!region || !knowledgeBaseId || !dataSourceId) throw new Error("Bedrock Knowledge Base is not configured");
  const response = await new BedrockAgentClient({ region }).send(new GetIngestionJobCommand({ knowledgeBaseId, dataSourceId, ingestionJobId }));
  const job = response.ingestionJob;
  if (!job?.status) throw new Error("Bedrock did not return ingestion status");
  return { provider: "bedrock" as const, status: job.status, startedAt: job.startedAt?.toISOString(), updatedAt: job.updatedAt?.toISOString(), statistics: job.statistics };
}
