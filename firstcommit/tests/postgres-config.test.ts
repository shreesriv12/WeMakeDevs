import { afterEach, describe, expect, it } from "vitest";
import { postgresEnabled } from "../lib/postgres";

const url = process.env.DATABASE_URL;
afterEach(() => { process.env.DATABASE_URL = url; });
describe("PostgreSQL configuration", () => {
  it("is disabled until a database URL is configured", () => { delete process.env.DATABASE_URL; expect(postgresEnabled()).toBe(false); });
  it("recognizes a configured database URL", () => { process.env.DATABASE_URL = "postgresql://user:pass@localhost:5432/db"; expect(postgresEnabled()).toBe(true); });
});
