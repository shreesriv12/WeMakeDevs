import { BedrockRuntimeClient, ConverseCommand } from "@aws-sdk/client-bedrock-runtime";

export async function generateGroundedTutorReply(input: { system: string; prompt: string; context: string }) {
  const region = process.env.AWS_REGION; const modelId = process.env.BEDROCK_TUTOR_MODEL_ID;
  if (!region || !modelId) throw new Error("AWS_REGION and BEDROCK_TUTOR_MODEL_ID must be configured");
  const client = new BedrockRuntimeClient({ region });
  const response = await client.send(new ConverseCommand({
    modelId,
    system: [{ text: `${input.system}\nUse only the supplied course context. If evidence is absent, say so.` }],
    messages: [{ role: "user", content: [{ text: `Course context:\n${input.context}\n\nRequest:\n${input.prompt}` }] }],
    inferenceConfig: { maxTokens: 700, temperature: 0.2 }
  }));
  const text = response.output?.message?.content?.find((part) => "text" in part)?.text;
  if (!text) throw new Error("Bedrock returned no text response");
  return text;
}
