import { CreateParticipantTokenCommand, IVSRealTimeClient, ParticipantTokenCapability } from "@aws-sdk/client-ivs-realtime";
import { authenticate } from "@/lib/auth";
import { createHash } from "crypto";
import { z } from "zod";

const schema=z.object({classId:z.string().regex(/^[a-zA-Z0-9_-]{1,80}$/),publish:z.boolean()});
export async function POST(request:Request){
  try {
    if(process.env.ENABLE_IVS_REALTIME!=="true")return Response.json({error:"IVS video is not enabled for this environment."},{status:409});
    const stageArn=process.env.IVS_REALTIME_STAGE_ARN?.trim();
    if(!stageArn)return Response.json({error:"IVS_REALTIME_STAGE_ARN is not configured."},{status:503});
    const actor=await authenticate(request); const input=schema.parse(await request.json());
    if(!actor.classIds.includes(input.classId)&&actor.role!=="admin")throw new Error("Not authorized for this class");
    const canPublish=input.publish||actor.role==="teacher"||actor.role==="admin";
    const capabilities=canPublish?[ParticipantTokenCapability.PUBLISH,ParticipantTokenCapability.SUBSCRIBE]:[ParticipantTokenCapability.SUBSCRIBE];
    const anonymousId=`sm-${createHash("sha256").update(actor.id).digest("hex").slice(0,20)}`;
    const client=new IVSRealTimeClient({region:process.env.AWS_REGION??"us-east-1"});
    const result=await client.send(new CreateParticipantTokenCommand({stageArn,userId:anonymousId,capabilities,duration:45,attributes:{role:actor.role,classId:input.classId}}));
    if(!result.participantToken?.token)throw new Error("IVS did not return a participant token");
    return Response.json({token:result.participantToken.token,expiresAt:result.participantToken.expirationTime,capabilities});
  } catch(error) { return Response.json({error:error instanceof Error?error.message:"Unable to create video token"},{status:400}); }
}
