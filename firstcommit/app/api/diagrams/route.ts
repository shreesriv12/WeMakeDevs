import { authenticate } from "@/lib/auth";
import { createDiagram } from "@/lib/diagram-agent";
import { z } from "zod";
const schema=z.object({classId:z.string().regex(/^[a-zA-Z0-9_-]{1,80}$/),topic:z.string().trim().min(2).max(300),kind:z.enum(["flowchart","sequence","class","state","er"])});
export async function POST(request:Request){try{return Response.json(await createDiagram(await authenticate(request),schema.parse(await request.json())));}catch(error){return Response.json({error:error instanceof Error?error.message:"Unable to create diagram"},{status:400});}}
