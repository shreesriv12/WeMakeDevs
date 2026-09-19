import { afterEach, describe, expect, it } from "vitest";
import { runtimeStatus } from "../lib/runtime-status";

const original = { region:process.env.AWS_REGION, bucket:process.env.COURSE_CONTENT_BUCKET, key:process.env.SERPAPI_API_KEY, domains:process.env.SERPAPI_ALLOWED_DOMAINS };
afterEach(() => Object.assign(process.env, { AWS_REGION:original.region, COURSE_CONTENT_BUCKET:original.bucket, SERPAPI_API_KEY:original.key, SERPAPI_ALLOWED_DOMAINS:original.domains }));

describe("runtime status", () => {
  it("reports configured integration categories without resource values", () => {
    process.env.AWS_REGION = "us-east-1"; process.env.COURSE_CONTENT_BUCKET = "private-bucket"; process.env.SERPAPI_API_KEY = "private-key"; process.env.SERPAPI_ALLOWED_DOMAINS = "ugc.gov.in";
    expect(runtimeStatus()).toMatchObject({ aws:true, courseStorage:true, serpapi:true });
    expect(JSON.stringify(runtimeStatus())).not.toContain("private-key");
    expect(JSON.stringify(runtimeStatus())).not.toContain("private-bucket");
  });
});
