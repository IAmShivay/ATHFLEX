import { Client } from "pg";
import { existsSync, readFileSync } from "node:fs";
import { scryptSync, randomBytes } from "node:crypto";

function loadEnv() {
  for (const file of [".env.local", ".env"]) {
    if (!existsSync(file)) continue;
    for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
      const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
      if (!match) continue;
      const [, key, raw] = match;
      if (process.env[key] !== undefined) continue;
      process.env[key] = raw.replace(/^(['"])(.*)\1$/, "$2");
    }
  }
}

loadEnv();

function hashPassword(pw) {
  const salt = randomBytes(16).toString("hex");
  return `${salt}:${scryptSync(pw, salt, 64).toString("hex")}`;
}

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is not set (checked .env.local and .env)");

const email = (process.env.ADMIN_EMAIL || "admin@athflex.com").trim().toLowerCase();
const password = process.env.ADMIN_PASSWORD || "AthFlex@2026!";
const name = process.env.ADMIN_NAME || "Store Owner";

if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error(`Invalid ADMIN_EMAIL: ${email}`);
if (password.length < 12 || password.length > 256) {
  throw new Error("ADMIN_PASSWORD must be 12-256 characters");
}

const client = new Client({ connectionString: url, connectionTimeoutMillis: 15000 });

async function main() {
  await client.connect();

  // Ensure the base users table and access columns exist, matching scripts/seed.mjs
  // and scripts/migrations/001_user_access.sql.
  await client.query(`
    CREATE TABLE IF NOT EXISTS users (
      id serial PRIMARY KEY,
      name text NOT NULL,
      email text NOT NULL UNIQUE,
      password_hash text NOT NULL,
      role text NOT NULL DEFAULT 'admin',
      created_at timestamptz NOT NULL DEFAULT now()
    );
    ALTER TABLE users ADD COLUMN IF NOT EXISTS permissions text[] NOT NULL DEFAULT '{}';
    ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS session_version integer NOT NULL DEFAULT 0;
    ALTER TABLE users ALTER COLUMN role SET DEFAULT 'staff';
  `);

  // Match the app's case-insensitive email lookup.
  const existing = await client.query("SELECT id FROM users WHERE lower(email) = $1", [email]);
  let id;

  if (existing.rows[0]) {
    id = existing.rows[0].id;
    await client.query(
      `UPDATE users
       SET name = $1,
           email = $2,
           password_hash = $3,
           role = 'admin',
           permissions = '{}',
           is_active = true,
           session_version = session_version + 1
       WHERE id = $4`,
      [name, email, hashPassword(password), id]
    );
  } else {
    const inserted = await client.query(
      `INSERT INTO users (name, email, password_hash, role, permissions, is_active)
       VALUES ($1, $2, $3, 'admin', '{}', true)
       RETURNING id`,
      [name, email, hashPassword(password)]
    );
    id = inserted.rows[0].id;
  }

  console.log("Admin ready:");
  console.log(`  id:       ${id}`);
  console.log(`  email:    ${email}`);
  console.log(`  password: ${password}`);
  console.log(`  role:     admin`);

  await client.end();
}

main().catch(async (error) => {
  console.error(error.message);
  try {
    await client.end();
  } catch {}
  process.exit(1);
});
