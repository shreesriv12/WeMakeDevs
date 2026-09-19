import { InvokeEndpointCommand, SageMakerRuntimeClient } from "@aws-sdk/client-sagemaker-runtime";

export type MasteryAttempt = { topicId: string; questionId: string; correct: boolean; difficulty: "easy" | "medium" | "hard" };

export async function predictMasteryWithSageMaker(attempts: MasteryAttempt[]) {
  const region = process.env.AWS_REGION; const endpoint = process.env.SAGEMAKER_MASTERY_ENDPOINT;
  if (!region || !endpoint) throw new Error("AWS_REGION and SAGEMAKER_MASTERY_ENDPOINT must be configured");
  const response = await new SageMakerRuntimeClient({ region }).send(new InvokeEndpointCommand({ EndpointName: endpoint, ContentType: "application/json", Accept: "application/json", Body: new TextEncoder().encode(JSON.stringify({ attempts: attempts.map((attempt) => ({ topic_id: attempt.topicId, question_id: attempt.questionId, is_correct: attempt.correct ? 1 : 0, difficulty: attempt.difficulty })) })) }));
  const parsed = JSON.parse(new TextDecoder().decode(response.Body)) as { mastery?: Record<string, unknown>; modelVersion?: unknown };
  if (!parsed.mastery || typeof parsed.mastery !== "object") throw new Error("Invalid mastery endpoint response");
  const mastery = Object.fromEntries(Object.entries(parsed.mastery).flatMap(([topic, value]) => typeof value === "number" && value >= 0 && value <= 1 ? [[topic, value]] : []));
  if (!Object.keys(mastery).length) throw new Error("Mastery endpoint returned no valid predictions");
  return { mastery, modelVersion: typeof parsed.modelVersion === "string" ? parsed.modelVersion : "unknown" };
}
