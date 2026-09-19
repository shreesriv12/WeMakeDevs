import { Pool } from "pg";

let pool: Pool | undefined;

export function postgresEnabled() { return Boolean(process.env.DATABASE_URL); }

export function database() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not configured");
  pool ??= new Pool({ connectionString: process.env.DATABASE_URL, max: 10, idleTimeoutMillis: 30000 });
  return pool;
}

export async function databaseHealth() {
  if (!postgresEnabled()) return "not-configured" as const;
  await database().query("SELECT 1");
  return "ok" as const;
}
