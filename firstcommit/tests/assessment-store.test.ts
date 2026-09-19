import { afterEach, describe, expect, it } from "vitest";
import { persistAssessmentResults } from "../lib/assessment-store";

const databaseUrl = process.env.DATABASE_URL;
afterEach(() => { process.env.DATABASE_URL = databaseUrl; });

describe("assessment persistence", () => {
  it("uses the memory fallback when PostgreSQL is not configured", async () => {
    delete process.env.DATABASE_URL;
    await expect(persistAssessmentResults({ id:"student", role:"student", institutionId:"institution", classIds:["class"] }, [{ topic:"routing", correct:true }])).resolves.toEqual({ provider:"memory" });
  });
});
