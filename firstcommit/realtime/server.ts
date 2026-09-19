import { createServer } from "node:http";
import { Server } from "socket.io";
import { CognitoJwtVerifier } from "aws-jwt-verify";
import { SimpleFetcher } from "aws-jwt-verify/https";
import { SimpleJwksCache } from "aws-jwt-verify/jwk";
import { actorFromClaims } from "../lib/auth";

const port = Number(process.env.REALTIME_PORT ?? 3003);
const poolId = process.env.COGNITO_USER_POOL_ID; const clientId = process.env.COGNITO_APP_CLIENT_ID;
if (!poolId || !clientId) throw new Error("COGNITO_USER_POOL_ID and COGNITO_APP_CLIENT_ID are required for realtime rooms");
const verifier = CognitoJwtVerifier.create(
  { userPoolId: poolId, clientId, tokenUse: "id" },
  { jwksCache: new SimpleJwksCache({ fetcher: new SimpleFetcher({ defaultRequestOptions: { responseTimeout: 10000 } }) }) }
);
const httpServer = createServer();
const allowedOrigins = [...new Set([process.env.REALTIME_ALLOWED_ORIGIN, "http://localhost:3000", "http://localhost:3002"].filter((value): value is string => Boolean(value)))];
const io = new Server(httpServer, {
  cors: {
    origin(origin, callback) {
      // Browser requests carry an origin; local tooling may not.
      if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
      return callback(new Error(`Origin not allowed: ${origin}`));
    },
    methods: ["GET", "POST"],
    credentials: true
  }
});
io.use(async (socket, next) => { try { const token = socket.handshake.auth.token; if (typeof token !== "string") throw new Error("Missing token"); socket.data.actor = actorFromClaims(await verifier.verify(token) as Record<string, unknown>); next(); } catch (error) { const message = error instanceof Error ? error.message : "Unknown authentication failure"; console.error("Realtime authentication rejected:", message); next(new Error("Unauthorized realtime connection")); } });
io.on("connection", (socket) => { socket.on("room:join", async ({ roomId, classId }: { roomId: string; classId: string }) => { const actor = socket.data.actor; if (!actor || (!actor.classIds.includes(classId) && actor.role !== "admin")) return socket.emit("room:error", "Not authorized for this classroom"); const room = `${actor.institutionId}:${classId}:${roomId}`; socket.join(room); const onlineCount = (await io.in(room).fetchSockets()).length; io.to(room).emit("presence:update", { onlineCount }); }); socket.on("hand:raise", ({ roomId, classId, raised }: { roomId:string; classId:string; raised:boolean }) => { const actor = socket.data.actor; if (!actor || !actor.classIds.includes(classId)) return; io.to(`${actor.institutionId}:${classId}:${roomId}`).emit("hand:update", { userId:actor.id, displayName:actor.displayName ?? "Learner", role:actor.role, raised }); }); socket.on("chat:message", ({ roomId, classId, text, attachment }) => { const actor = socket.data.actor; if (!actor || !actor.classIds.includes(classId) || typeof text !== "string" || !text.trim() || text.length > 2000) return; io.to(`${actor.institutionId}:${classId}:${roomId}`).emit("chat:message", { id: crypto.randomUUID(), senderId: actor.id, senderName:actor.displayName ?? "Learner", senderRole: actor.displayName ?? actor.role, text: text.trim(), attachment, createdAt: new Date().toISOString() }); }); });
httpServer.listen(port, () => console.log(`ShikshaMesh realtime server listening on ${port}`));
