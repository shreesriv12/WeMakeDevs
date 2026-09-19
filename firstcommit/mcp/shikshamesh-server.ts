import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { Actor } from "../lib/auth";
import { retrieveKnowledge } from "../lib/knowledge-retriever";
import { runGovernedResearch } from "../lib/research-gateway";
import { launchQuizWorkflow } from "../lib/quiz-workflow";

/**
 * Creates an actor-bound MCP server. A transport must establish the actor from
 * Cognito before constructing this server; callers must never supply actor IDs
 * as MCP tool arguments.
 */
export function createShikshaMeshMcpServer(actor: Actor) {
  const server = new McpServer({ name: "shikshamesh", version: "0.1.0" });
  server.registerTool("course_search", {
    title: "Search authorized course content",
    description: "Returns course excerpts limited to the authenticated actor's institution and class.",
    inputSchema: { query: z.string().min(2).max(500), classId: z.string().min(1).max(80).optional() },
    annotations: { readOnlyHint: true }
  }, async ({ query, classId }) => {
    const permittedClass = classId ?? actor.classIds[0];
    if (!permittedClass || !actor.classIds.includes(permittedClass)) throw new Error("Class access denied");
    const result = await retrieveKnowledge({ institutionId: actor.institutionId, classId: permittedClass, query, limit: 3 });
    return { content: [{ type: "text" as const, text: JSON.stringify({ provider: result.provider, chunks: result.sources.map(({ title, text, sourceUrl }) => ({ title, excerpt: text, sourceUrl })) }) }] };
  });
  server.registerTool("official_research", {
    title: "Search approved official education sources",
    description: "Uses the policy-gated SerpAPI gateway. Student PII must not be included.",
    inputSchema: { query: z.string().min(2).max(500) },
    annotations: { readOnlyHint: true }
  }, async ({ query }) => {
    const result = await runGovernedResearch(actor, query, true);
    return { content: [{ type: "text" as const, text: JSON.stringify(result) }] };
  });
  server.registerTool("quiz_workflow_start", {
    title: "Start a teacher-approved quiz workflow",
    description: "Starts the durable quiz workflow only when a teacher or admin explicitly confirms the request.",
    inputSchema: {
      classId: z.string().min(1).max(80), lectureSourceId: z.string().min(1).max(200),
      languages: z.array(z.string().min(2).max(20)).min(1).max(5), scheduledFor: z.string().datetime(),
      difficulty: z.enum(["easy", "medium", "hard"]), confirmed: z.literal(true)
    },
    annotations: { readOnlyHint: false, destructiveHint: false }
  }, async ({ confirmed: _, ...request }) => {
    if (actor.role !== "teacher" && actor.role !== "admin") throw new Error("Teacher or administrator access required");
    if (!actor.classIds.includes(request.classId)) throw new Error("Class access denied");
    const workflow = await launchQuizWorkflow(actor, request);
    return { content: [{ type: "text" as const, text: JSON.stringify({ status: "started", workflow }) }] };
  });
  return server;
}
