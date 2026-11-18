import nextEnv from "@next/env";
import { readFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { Client } from "pg";

nextEnv.loadEnvConfig(process.cwd(), process.env.NODE_ENV !== "production");
if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not set");
if (process.env.DATABASE_CA_CERT_PATH && ["sslmode", "sslcert", "sslkey", "sslrootcert"].some((key) => new URL(process.env.DATABASE_URL).searchParams.has(key))) {
  throw new Error("Remove SSL parameters from DATABASE_URL when using DATABASE_CA_CERT_PATH");
}
const ssl = process.env.DATABASE_CA_CERT_PATH ? {
  ca: readFileSync(process.env.DATABASE_CA_CERT_PATH, "utf8"),
  ...(process.env.DATABASE_TLS_SERVERNAME ? { servername: process.env.DATABASE_TLS_SERVERNAME } : {}),
  rejectUnauthorized: true,
} : undefined;
const client = new Client({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 10000, ssl });
try {
  const sql = await readFile(new URL("./migrations/004_production.sql", import.meta.url), "utf8");
  await client.connect();
  await client.query("BEGIN");
  await client.query("SELECT pg_advisory_xact_lock(624839104)");
  await client.query(sql);
  await client.query("COMMIT");
  console.log("Production migration applied successfully.");
} catch (error) {
  await client.query("ROLLBACK").catch(() => {});
  console.error("Production migration failed:", error.message);
  process.exitCode = 1;
} finally {
  await client.end().catch(() => {});
}
