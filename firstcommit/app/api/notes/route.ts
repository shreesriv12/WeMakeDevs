import { authenticate } from "@/lib/auth";
import { createSmartNotes } from "@/lib/smart-notes";
import { z } from "zod";
const schema=z.object({classId:z.string().regex(/^[a-zA-Z0-9_-]{1,80}$/),topic:z.string().trim().min(2).max(300),language:z.enum(["English","Hindi","Hinglish"]),style:z.enum(["exam","visual","beginner","interview"]),length:z.enum(["quick","detailed"])});
export async function POST(request:Request){try{return Response.json(await createSmartNotes(await authenticate(request),schema.parse(await request.json())));}catch(error){return Response.json({error:error instanceof Error?error.message:"Unable to create notes"},{status:400});}}
