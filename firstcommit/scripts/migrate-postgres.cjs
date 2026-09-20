const fs = require("node:fs");
const path = require("node:path");
const { Client } = require("pg");

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required. Use Render's External Database URL when running this locally.");
  }

  const migrationsDirectory = path.join(process.cwd(), "db", "init");
  const migrations = fs.readdirSync(migrationsDirectory)
    .filter((name) => /^\d+_.+\.sql$/.test(name))
    .sort();
  const parsedUrl = new URL(process.env.DATABASE_URL);
  const requiresTls = /[?&]sslmode=require(?:&|$)/.test(process.env.DATABASE_URL)
    || parsedUrl.hostname.endsWith(".render.com");
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ...(requiresTls ? { ssl: { rejectUnauthorized: false } } : {})
  });

  await client.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        name TEXT PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);
    const { rows } = await client.query("SELECT name FROM schema_migrations");
    const applied = new Set(rows.map((row) => row.name));

    for (const migration of migrations) {
      if (applied.has(migration)) continue;
      const sql = fs.readFileSync(path.join(migrationsDirectory, migration), "utf8");
      await client.query("BEGIN");
      try {
        await client.query(sql);
        await client.query("INSERT INTO schema_migrations (name) VALUES ($1)", [migration]);
        await client.query("COMMIT");
        console.log(`Applied ${migration}`);
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      }
    }
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
