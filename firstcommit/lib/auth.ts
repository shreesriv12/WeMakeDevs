import { CognitoJwtVerifier } from "aws-jwt-verify";
import { SimpleFetcher } from "aws-jwt-verify/https";
import { SimpleJwksCache } from "aws-jwt-verify/jwk";
import type { Role } from "./policy";
import { debugError, debugLog } from "./debug";

export type Actor = { id: string; role: Role; institutionId: string; classIds: string[] };
type Claims = Record<string, unknown>;
let verifier: ReturnType<typeof CognitoJwtVerifier.create> | undefined;

function asRole(groups: unknown): Role {
  const values = Array.isArray(groups) ? groups : [];
  if (values.includes("admin")) return "admin";
  if (values.includes("teacher")) return "teacher";
  return "student";
}

export function actorFromClaims(claims: Claims): Actor {
  const id = claims.sub;
  const institutionId = claims["custom:institution_id"];
  const classIds = claims["custom:class_ids"];
  if (typeof id !== "string" || typeof institutionId !== "string") throw new Error("Token is missing required ShikshaMesh claims");
  return { id, institutionId, role: asRole(claims["cognito:groups"]), classIds: typeof classIds === "string" ? classIds.split(",").filter(Boolean) : [] };
}

function demoActor(): Actor {
  const role: Role = process.env.DEMO_ROLE === "teacher" ? "teacher" : "student";
  return { id: role === "teacher" ? "teacher-102" : "student-391", role, institutionId: "demo-institute", classIds: ["cn-b"] };
}

export async function authenticate(request: Request): Promise<Actor> {
  const header = request.headers.get("authorization");
  if (!header && process.env.ALLOW_DEMO_IDENTITY === "true") {
    const actor = demoActor();
    debugLog("auth", "using demo identity", { role: actor.role, institutionId: actor.institutionId });
    return actor;
  }
  if (!header?.startsWith("Bearer ")) throw new Error("Authentication required");
  const userPoolId = process.env.COGNITO_USER_POOL_ID; const clientId = process.env.COGNITO_APP_CLIENT_ID;
  if (!userPoolId || !clientId) throw new Error("Cognito is not configured");
  // Cognito places the custom institution and class attributes in ID tokens.
  // The API verifies the token signature, issuer and client audience before
  // deriving the authorization context from those signed claims.
  verifier ??= CognitoJwtVerifier.create({ userPoolId, clientId, tokenUse: "id" }, { jwksCache: new SimpleJwksCache({ fetcher: new SimpleFetcher({ defaultRequestOptions: { responseTimeout: 10000 } }) }) });
  try {
    const actor = actorFromClaims(await verifier.verify(header.slice(7)) as Claims);
    debugLog("auth", "Cognito token verified", { role: actor.role, institutionId: actor.institutionId, classCount: actor.classIds.length });
    return actor;
  } catch (error) {
    debugError("auth", "Cognito token verification failed", error);
    throw error;
  }
}
