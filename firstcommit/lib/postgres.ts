import { Pool } from "pg";

let pool: Pool | undefined;

export function postgresEnabled() { return Boolean(process.env.DATABASE_URL); }

export function database() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not configured");
  const parsedUrl = new URL(process.env.DATABASE_URL);
  const requiresTls = parsedUrl.hostname.endsWith(".render.com")
    || parsedUrl.searchParams.get("sslmode") === "require";
  pool ??= new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 10,
    idleTimeoutMillis: 30000,
    ...(requiresTls ? { ssl: { rejectUnauthorized: false } } : {})
  });
  return pool;
}

export async function databaseHealth() {
  if (!postgresEnabled()) return "not-configured" as const;
  await database().query("SELECT 1");
  return "ok" as const;
}
