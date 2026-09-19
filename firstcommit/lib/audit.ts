import { EventBridgeClient, PutEventsCommand } from "@aws-sdk/client-eventbridge";

export type AuditEvent = { auditId: string; eventType: "orchestration.completed" | "quiz-workflow.started" | "course_interview.started" | "course_interview.answer_scored"; actorId: string; institutionId: string; classId?: string; outcome: "success" | "denied"; metadata: Record<string, string | number | boolean | string[]> };

function safe(event: AuditEvent) {
  // Do not add prompts, answer text, JWTs, marks, document bodies or external API keys here.
  return { ...event, occurredAt: new Date().toISOString() };
}

export async function emitAudit(event: AuditEvent) {
  const detail = safe(event); const region = process.env.AWS_REGION; const bus = process.env.AUDIT_EVENT_BUS_NAME;
  if (!region || !bus) { console.info(JSON.stringify({ source: "shikshamesh.audit", detail })); return { provider: "console" as const }; }
  const response = await new EventBridgeClient({ region }).send(new PutEventsCommand({ Entries: [{ EventBusName: bus, Source: "shikshamesh.audit", DetailType: event.eventType, Detail: JSON.stringify(detail) }] }));
  if (response.FailedEntryCount) throw new Error("Audit event delivery failed");
  return { provider: "eventbridge" as const, eventId: response.Entries?.[0]?.EventId };
}
