import { Pool, type QueryResult, type QueryResultRow } from "pg";
import { readFileSync } from "node:fs";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set");
}
if (process.env.DATABASE_CA_CERT_PATH) {
  const params = new URL(process.env.DATABASE_URL).searchParams;
  if (["sslmode", "sslcert", "sslkey", "sslrootcert"].some((key) => params.has(key))) {
    throw new Error("Remove SSL parameters from DATABASE_URL when using DATABASE_CA_CERT_PATH");
  }
}

const globalForDb = globalThis as unknown as { athflexPool?: Pool };
export const pool = globalForDb.athflexPool ?? new Pool({
  connectionString: process.env.DATABASE_URL,
  ...(process.env.DATABASE_CA_CERT_PATH ? {
    ssl: {
      ca: readFileSync(process.env.DATABASE_CA_CERT_PATH, "utf8"),
      ...(process.env.DATABASE_TLS_SERVERNAME ? { servername: process.env.DATABASE_TLS_SERVERNAME } : {}),
      rejectUnauthorized: true,
    },
  } : {}),
  max: 5,
  connectionTimeoutMillis: 10000,
  idleTimeoutMillis: 30000,
});
if (process.env.NODE_ENV !== "production") globalForDb.athflexPool = pool;

export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: unknown[]
): Promise<QueryResult<T>> {
  return params ? pool.query<T>(text, params as never[]) : pool.query<T>(text);
}
