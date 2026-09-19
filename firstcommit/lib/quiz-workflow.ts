import { DescribeExecutionCommand, SFNClient, StartExecutionCommand } from "@aws-sdk/client-sfn";
import type { Actor } from "./auth";
import { emitAudit } from "./audit";
import { database, postgresEnabled } from "./postgres";

export type QuizWorkflowRequest = { classId: string; lectureSourceId: string; languages: string[]; scheduledFor: string; difficulty: "easy" | "medium" | "hard"; useOpenRouter?: boolean };

export function canLaunchQuizWorkflow(actor: Actor, request: QuizWorkflowRequest) {
  return actor.role === "admin" || (actor.role === "teacher" && actor.classIds.includes(request.classId));
}

async function ensureWorkflowActorScope(actor: Actor, classId: string) {
  const client = database();
  await client.query("INSERT INTO institutions (id, name) VALUES ($1, $2) ON CONFLICT (id) DO NOTHING", [actor.institutionId, "ShikshaMesh institution"]);
  await client.query("INSERT INTO users (id, institution_id, role) VALUES ($1, $2, $3) ON CONFLICT (id) DO UPDATE SET institution_id = EXCLUDED.institution_id, role = EXCLUDED.role", [actor.id, actor.institutionId, actor.role]);
  await client.query("INSERT INTO classes (id, institution_id, name) VALUES ($1, $2, $3) ON CONFLICT (institution_id, id) DO NOTHING", [classId, actor.institutionId, classId]);
  await client.query("INSERT INTO class_memberships (institution_id, class_id, user_id) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING", [actor.institutionId, classId, actor.id]);
}

async function saveWorkflowRun(actor: Actor, executionId: string, provider: "local" | "step-functions", input: QuizWorkflowRequest & { institutionId: string; requestedBy: string; requestedAt: string }) {
  if (!postgresEnabled()) return;
  try {
    await ensureWorkflowActorScope(actor, input.classId);
    await database().query("INSERT INTO quiz_workflow_runs (execution_id, provider, requested_by, institution_id, class_id, lecture_source_id, scheduled_for, status, input) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) ON CONFLICT (execution_id) DO NOTHING", [executionId, provider, actor.id, actor.institutionId, input.classId, input.lectureSourceId, input.scheduledFor, provider === "local" ? "LOCAL_STARTED" : "RUNNING", JSON.stringify(input)]);
  } catch { /* The durable workflow still proceeds if local development persistence is unavailable. */ }
}

export async function launchQuizWorkflow(actor: Actor, request: QuizWorkflowRequest) {
  if (!canLaunchQuizWorkflow(actor, request)) throw new Error("Not authorized to create a quiz workflow for this class");
  const input = { ...request, useOpenRouter: request.useOpenRouter ?? true, institutionId: actor.institutionId, requestedBy: actor.id, requestedAt: new Date().toISOString() };
  const region = process.env.AWS_REGION; const stateMachineArn = process.env.QUIZ_WORKFLOW_STATE_MACHINE_ARN;
  if (!region || !stateMachineArn) {
    const executionId = `local-${crypto.randomUUID()}`;
    await saveWorkflowRun(actor, executionId, "local", input);
    await emitAudit({ auditId:executionId, eventType:"quiz-workflow.started", actorId:actor.id, institutionId:actor.institutionId, classId:request.classId, outcome:"success", metadata:{ provider:"local", languages:request.languages } }).catch(() => undefined);
    return { provider: "local" as const, executionId, input };
  }
  const client = new SFNClient({ region });
  const response = await client.send(new StartExecutionCommand({ stateMachineArn, input: JSON.stringify(input), name: `quiz-${crypto.randomUUID()}` }));
  if (!response.executionArn) throw new Error("Step Functions did not return an execution ARN");
  await saveWorkflowRun(actor, response.executionArn, "step-functions", input);
  await emitAudit({ auditId:response.executionArn, eventType:"quiz-workflow.started", actorId:actor.id, institutionId:actor.institutionId, classId:request.classId, outcome:"success", metadata:{ provider:"step-functions", languages:request.languages } }).catch(() => undefined);
  return { provider: "step-functions" as const, executionId: response.executionArn, input };
}

export async function getQuizWorkflowRun(actor: Actor, executionId: string) {
  if (!postgresEnabled()) throw new Error("Quiz workflow history requires PostgreSQL");
  const stored = await database().query<{ provider: "local" | "step-functions"; requested_by: string; institution_id: string; class_id: string; status: string; started_at: Date; updated_at: Date }>("SELECT provider, requested_by, institution_id, class_id, status, started_at, updated_at FROM quiz_workflow_runs WHERE execution_id = $1", [executionId]);
  const run = stored.rows[0];
  if (!run || run.institution_id !== actor.institutionId || (actor.role !== "admin" && run.requested_by !== actor.id)) throw new Error("Quiz workflow not found");
  if (run.provider === "step-functions") {
    const region = process.env.AWS_REGION;
    if (!region) throw new Error("AWS region is not configured");
    const execution = await new SFNClient({ region }).send(new DescribeExecutionCommand({ executionArn: executionId }));
    const status = execution.status ?? run.status;
    await database().query("UPDATE quiz_workflow_runs SET status = $2, updated_at = now() WHERE execution_id = $1", [executionId, status]);
    return { executionId, provider: run.provider, classId: run.class_id, status, startedAt: execution.startDate?.toISOString() ?? run.started_at.toISOString(), stoppedAt: execution.stopDate?.toISOString() };
  }
  return { executionId, provider: run.provider, classId: run.class_id, status: run.status, startedAt: run.started_at.toISOString() };
}
