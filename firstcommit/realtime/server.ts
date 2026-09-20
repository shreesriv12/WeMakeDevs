import { createServer } from "node:http";
import { Server } from "socket.io";
import { CognitoJwtVerifier } from "aws-jwt-verify";
import { SimpleFetcher } from "aws-jwt-verify/https";
import { SimpleJwksCache } from "aws-jwt-verify/jwk";
import { actorFromClaims } from "../lib/auth";
import { liveRoomMessages, persistLiveMessage, recordLiveAttendance } from "../lib/live-classroom";

const port = Number(process.env.REALTIME_PORT ?? 3003);
const poolId = process.env.COGNITO_USER_POOL_ID; const clientId = process.env.COGNITO_APP_CLIENT_ID;
if (!poolId || !clientId) throw new Error("COGNITO_USER_POOL_ID and COGNITO_APP_CLIENT_ID are required for realtime rooms");
const verifier = CognitoJwtVerifier.create({ userPoolId: poolId, clientId, tokenUse: "id" }, { jwksCache: new SimpleJwksCache({ fetcher: new SimpleFetcher({ defaultRequestOptions: { responseTimeout: 10000 } }) }) });
const httpServer = createServer();
const allowedOrigins = [...new Set([process.env.REALTIME_ALLOWED_ORIGIN, "http://localhost:3000", "http://localhost:3002"].filter((value): value is string => Boolean(value)))];
const io = new Server(httpServer, { cors: { origin(origin, callback) { if (!origin || allowedOrigins.includes(origin)) return callback(null, true); return callback(new Error(`Origin not allowed: ${origin}`)); }, methods: ["GET", "POST"], credentials: true } });

function classroomRoom(actor: { institutionId: string }, classId: string, roomId: string) { return `${actor.institutionId}:${classId}:${roomId}`; }
function hasClassAccess(actor: { classIds: string[]; role: string }, classId: string) { return actor.role === "admin" || actor.classIds.includes(classId); }
async function emitRoomPresence(room: string) {
  const sockets = await io.in(room).fetchSockets();
  const participants = [...new Map(sockets.map((item) => { const actor = item.data.actor; return [actor?.id, { id: actor?.id, displayName: actor?.displayName ?? "Learner", role: actor?.role ?? "student" }]; })).values()].filter((item) => Boolean(item.id));
  io.to(room).emit("presence:update", { onlineCount: participants.length, participants });
}
async function emitCanvasPresence(room: string) {
  const sockets = await io.in(room).fetchSockets();
  const participants = [...new Map(sockets.map((item) => { const actor = item.data.actor; return [actor?.id, { id: actor?.id, displayName: actor?.displayName ?? "Learner", role: actor?.role ?? "student" }]; })).values()].filter((item) => Boolean(item.id));
  io.to(room).emit("canvas:presence", { participants });
}

io.use(async (socket, next) => {
  try { const token = socket.handshake.auth.token; if (typeof token !== "string") throw new Error("Missing token"); socket.data.actor = actorFromClaims(await verifier.verify(token) as Record<string, unknown>); next(); }
  catch (error) { console.error("Realtime authentication rejected:", error instanceof Error ? error.message : "Unknown authentication failure"); next(new Error("Unauthorized realtime connection")); }
});

io.on("connection", (socket) => {
  socket.on("room:join", async ({ roomId, classId }: { roomId: string; classId: string }) => {
    const actor = socket.data.actor;
    if (!actor || !hasClassAccess(actor, classId)) return socket.emit("room:error", "Not authorized for this classroom");
    const room = classroomRoom(actor, classId, roomId); socket.data.classroomRoom = room; socket.data.classroomClassId = classId; socket.data.classroomRoomKey = roomId; socket.join(room);
    try { socket.emit("chat:history", await liveRoomMessages(actor, classId, roomId)); } catch (error) { console.error("Live history persistence unavailable:", error); }
    void recordLiveAttendance(actor, { classId, roomKey: roomId, event: "joined" }).catch((error) => console.error("Live attendance persistence unavailable:", error));
    await emitRoomPresence(room);
  });
  socket.on("moderation:remove", async ({ roomId, classId, participantId }: { roomId:string; classId:string; participantId:string }) => {
    const actor = socket.data.actor;
    if (!actor || (actor.role !== "teacher" && actor.role !== "admin") || !hasClassAccess(actor, classId) || typeof participantId !== "string" || participantId === actor.id) return socket.emit("room:error", "Not authorized to moderate this room");
    const room = classroomRoom(actor, classId, roomId); const targets = await io.in(room).fetchSockets();
    for (const target of targets) if (target.data.actor?.id === participantId) { target.leave(room); target.emit("room:removed", "You were removed from this live classroom by the teacher."); }
    await emitRoomPresence(room);
  });
  socket.on("canvas:join", async ({ classId, workspaceKey }: { classId:string; workspaceKey:string }) => { const actor = socket.data.actor; if (!actor || !hasClassAccess(actor, classId)) return socket.emit("room:error", "Not authorized for this canvas workspace"); const room=`${actor.institutionId}:${classId}:canvas:${workspaceKey}`; socket.data.canvasRoom=room; socket.join(room); await emitCanvasPresence(room); });
  socket.on("canvas:state", ({ classId, workspaceKey, state }: { classId:string; workspaceKey:string; state:unknown }) => { const actor = socket.data.actor; if (!actor || !hasClassAccess(actor, classId) || !Array.isArray(state) || state.length > 2000 || JSON.stringify(state).length > 1_000_000) return; socket.to(`${actor.institutionId}:${classId}:canvas:${workspaceKey}`).emit("canvas:state", { state, updatedBy: actor.displayName ?? "Learner" }); });
  socket.on("canvas:cursor", ({ classId, workspaceKey, x, y }: { classId:string; workspaceKey:string; x:number; y:number }) => { const actor = socket.data.actor; if (!actor || !hasClassAccess(actor, classId) || !Number.isFinite(x) || !Number.isFinite(y) || x < 0 || y < 0 || x > 2000 || y > 2000) return; socket.to(`${actor.institutionId}:${classId}:canvas:${workspaceKey}`).emit("canvas:cursor", { id: actor.id, displayName: actor.displayName ?? "Learner", x, y }); });
  socket.on("hand:raise", ({ roomId, classId, raised }: { roomId:string; classId:string; raised:boolean }) => { const actor = socket.data.actor; if (!actor || !hasClassAccess(actor, classId)) return; io.to(classroomRoom(actor, classId, roomId)).emit("hand:update", { userId:actor.id, displayName:actor.displayName ?? "Learner", role:actor.role, raised }); });
  socket.on("chat:message", async ({ roomId, classId, text, attachment }) => { const actor = socket.data.actor; if (!actor || !hasClassAccess(actor, classId) || typeof text !== "string") return; try { const message = await persistLiveMessage(actor, { classId, roomKey: roomId, text, attachment }); io.to(classroomRoom(actor, classId, roomId)).emit("chat:message", { ...message, senderRole: message.senderName }); } catch (error) { socket.emit("room:error", error instanceof Error ? error.message : "Could not save live message"); } });
  socket.on("disconnect", () => { const room = socket.data.classroomRoom, canvasRoom=socket.data.canvasRoom, actor = socket.data.actor, classId = socket.data.classroomClassId, roomKey = socket.data.classroomRoomKey; if (typeof room === "string") void emitRoomPresence(room); if(typeof canvasRoom==="string") void emitCanvasPresence(canvasRoom); if (actor && typeof classId === "string" && typeof roomKey === "string") void recordLiveAttendance(actor, { classId, roomKey, event: "left" }).catch((error) => console.error("Live attendance persistence unavailable:", error)); });
});
httpServer.listen(port, () => console.log(`ShikshaMesh realtime server listening on ${port}`));
