import { afterEach, describe, expect, it } from "vitest";
import { awsEnabled, requiredAwsConfig } from "../lib/aws/config";

const previous = { region: process.env.AWS_REGION, bucket: process.env.COURSE_CONTENT_BUCKET };
afterEach(() => { process.env.AWS_REGION = previous.region; process.env.COURSE_CONTENT_BUCKET = previous.bucket; });

describe("AWS configuration", () => {
  it("requires a region and course bucket", () => { delete process.env.AWS_REGION; delete process.env.COURSE_CONTENT_BUCKET; expect(awsEnabled()).toBe(false); expect(requiredAwsConfig).toThrow(); });
  it("accepts complete configuration", () => { process.env.AWS_REGION = "ap-south-1"; process.env.COURSE_CONTENT_BUCKET = "shiksha-course-content"; expect(requiredAwsConfig()).toEqual({ region:"ap-south-1", bucket:"shiksha-course-content" }); });
});
