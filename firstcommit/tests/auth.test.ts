import { describe, expect, it } from "vitest";
import { actorFromClaims } from "../lib/auth";

describe("Cognito claim mapping", () => {
  it("maps signed Cognito ID-token claims to the minimum actor context", () => {
    expect(actorFromClaims({ sub:"u1", "custom:institution_id":"inst-a", "custom:class_ids":"a,b", "cognito:groups":["teacher"] })).toEqual({ id:"u1", institutionId:"inst-a", classIds:["a","b"], role:"teacher" });
  });
  it("rejects a claim set without a tenant", () => expect(() => actorFromClaims({ sub:"u1" })).toThrow("required ShikshaMesh claims"));
});
