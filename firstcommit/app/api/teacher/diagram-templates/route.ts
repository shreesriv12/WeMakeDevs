import { authenticate } from "@/lib/auth";
import { listDiagramTemplates, saveDiagramTemplate } from "@/lib/diagram-templates";
import { z } from "zod";
const classQuery=z.object({classId:z.string().regex(/^[a-zA-Z0-9_-]{1,80}$/)});const body=classQuery.extend({title:z.string().trim().min(3).max(120),kind:z.enum(["flowchart","sequence","class","state","er"]),code:z.string().min(10).max(12000)});
export async function GET(request:Request){try{const input=classQuery.parse(Object.fromEntries(new URL(request.url).searchParams));return Response.json({templates:await listDiagramTemplates(await authenticate(request),input.classId)});}catch(error){return Response.json({error:error instanceof Error?error.message:"Unable to load templates"},{status:400});}}
export async function POST(request:Request){try{return Response.json(await saveDiagramTemplate(await authenticate(request),body.parse(await request.json())),{status:201});}catch(error){return Response.json({error:error instanceof Error?error.message:"Unable to save template"},{status:400});}}
