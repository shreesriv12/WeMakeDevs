import { InvokeEndpointCommand, SageMakerRuntimeClient } from "@aws-sdk/client-sagemaker-runtime";

export async function classifyIntentWithSageMaker(query: string): Promise<{ labels: string[]; provider: "sagemaker" }> {
  const region = process.env.AWS_REGION; const endpoint = process.env.SAGEMAKER_INTENT_ENDPOINT;
  if (!region || !endpoint) throw new Error("AWS_REGION and SAGEMAKER_INTENT_ENDPOINT must be configured");
  const client = new SageMakerRuntimeClient({ region });
  const response = await client.send(new InvokeEndpointCommand({ EndpointName: endpoint, ContentType: "application/json", Accept: "application/json", Body: new TextEncoder().encode(JSON.stringify({ inputs: query })) }));
  const json = JSON.parse(new TextDecoder().decode(response.Body)) as { labels?: { label: string; score: number }[] };
  return { labels: (json.labels ?? []).filter((item) => item.score >= 0.5).map((item) => item.label), provider: "sagemaker" };
}
