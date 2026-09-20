import { authenticate } from "@/lib/auth";
import { misconceptionHeatmap } from "@/lib/concept-xray";
import { z } from "zod";
const query=z.object({classId:z.string().regex(/^[a-zA-Z0-9_-]{1,80}$/)});
export async function GET(request:Request){try{const input=query.parse(Object.fromEntries(new URL(request.url).searchParams));return Response.json({clusters:await misconceptionHeatmap(await authenticate(request),input.classId)});}catch(error){return Response.json({error:error instanceof Error?error.message:"Unable to load misconception heatmap"},{status:400});}}
