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

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is not set (checked .env.local and .env)");

const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || "admin@athflex.com").trim().toLowerCase();
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "AthFlex@2026!";
const ADMIN_NAME = process.env.ADMIN_NAME || "Store Owner";

if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(ADMIN_EMAIL)) throw new Error(`Invalid ADMIN_EMAIL: ${ADMIN_EMAIL}`);
if (ADMIN_PASSWORD.length < 12 || ADMIN_PASSWORD.length > 256) {
  throw new Error("ADMIN_PASSWORD must be 12-256 characters");
}

function hashPassword(pw) {
  const salt = randomBytes(16).toString("hex");
  return `${salt}:${scryptSync(pw, salt, 64).toString("hex")}`;
}

let seedState = 20260907;
function rnd() {
  seedState = (seedState * 1664525 + 1013904223) >>> 0;
  return seedState / 4294967296;
}
const pick = (arr) => arr[Math.floor(rnd() * arr.length)];
const ri = (min, max) => Math.floor(rnd() * (max - min + 1)) + min;

const PALETTE = ["#0ea5e9", "#8b5cf6", "#f97316", "#10b981", "#ef4444", "#6366f1", "#ec4899", "#14b8a6"];

const PRODUCTS = [
  ["Flex Seamless Leggings", "Leggings", 58],
  ["Titan Compression Shorts", "Shorts", 34],
  ["AirFlex Training Tee", "Tees", 28],
  ["Titan Muscle Tank", "Tees", 24],
  ["Flex Ribbed Sports Bra", "Sports Bras", 38],
  ["Aero Running Shorts", "Shorts", 42],
  ["Titan Oversized Hoodie", "Hoodies", 72],
  ["Flex Flare Leggings", "Leggings", 64],
  ["Aero Lite Windbreaker", "Jackets", 89],
  ["Core Seamless Shorts", "Shorts", 36],
  ["Titan Graphic Tee", "Tees", 30],
  ["Flex High-Rise Leggings", "Leggings", 62],
  ["Aero Speed Tights", "Tights", 70],
  ["Titan Zip-Up Hoodie", "Hoodies", 84],
  ["Flex Cross-Back Bra", "Sports Bras", 40],
  ["Core Training Joggers", "Joggers", 66],
  ["Aero Featherlight Cap", "Accessories", 22],
  ["Titan Wrist Wraps", "Accessories", 18],
  ["Flex Ankle Socks (3-Pack)", "Accessories", 14],
  ["Core Duffel Bag", "Accessories", 95],
  ["Aero Cycling Shorts", "Shorts", 44],
  ["Titan Stringer", "Tees", 26],
  ["Flex Unitard", "Bodysuits", 78],
  ["Core Slide Sandals", "Footwear", 39],
];

const CUSTOMERS = [
  ["Aarav Sharma", "Mumbai", "India"],
  ["Priya Patel", "Delhi", "India"],
  ["Ananya Iyer", "Bengaluru", "India"],
  ["Rohan Mehta", "Pune", "India"],
  ["Sofia Rossi", "Milan", "Italy"],
  ["James Carter", "Austin", "United States"],
  ["Emma Wilson", "London", "United Kingdom"],
  ["Liam Johnson", "Toronto", "Canada"],
  ["Mia Chen", "San Francisco", "United States"],
  ["Noah Davis", "Sydney", "Australia"],
  ["Isabella Garcia", "Barcelona", "Spain"],
  ["Ethan Brown", "New York", "United States"],
  ["Zara Ahmed", "Dubai", "United Arab Emirates"],
  ["Kabir Nair", "Chennai", "India"],
  ["Diya Kapoor", "Hyderabad", "India"],
  ["Lucas Martin", "Paris", "France"],
  ["Olivia Miller", "Chicago", "United States"],
  ["Arjun Reddy", "Kolkata", "India"],
  ["Meera Joshi", "Ahmedabad", "India"],
  ["Jack Thompson", "Melbourne", "Australia"],
];

const CHANNELS = ["Online Store", "Online Store", "Online Store", "Online Store", "Instagram", "Instagram", "POS", "Wholesale"];

function weightedStatus() {
  const r = rnd();
  if (r < 0.78) return "paid";
  if (r < 0.92) return "pending";
  return "refunded";
}

const client = new Client({ connectionString: url });

async function main() {
  await client.connect();

  await client.query(`
    CREATE TABLE IF NOT EXISTS users (
      id serial PRIMARY KEY,
      name text NOT NULL,
      email text NOT NULL UNIQUE,
      password_hash text NOT NULL,
      role text NOT NULL DEFAULT 'admin',
      created_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE TABLE IF NOT EXISTS store_settings (
      id serial PRIMARY KEY,
      store_name text NOT NULL,
      store_email text NOT NULL,
      currency text NOT NULL DEFAULT 'USD',
      timezone text NOT NULL DEFAULT 'Asia/Kolkata'
    );
    CREATE TABLE IF NOT EXISTS products (
      id serial PRIMARY KEY,
      title text NOT NULL,
      product_type text NOT NULL,
      vendor text NOT NULL DEFAULT 'AthFlex',
      status text NOT NULL DEFAULT 'active',
      price numeric(10,2) NOT NULL,
      inventory int NOT NULL DEFAULT 0,
      sku text NOT NULL UNIQUE,
      sales int NOT NULL DEFAULT 0,
      color text NOT NULL DEFAULT '#6366f1',
      created_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE TABLE IF NOT EXISTS customers (
      id serial PRIMARY KEY,
      name text NOT NULL,
      email text NOT NULL UNIQUE,
      city text NOT NULL,
      country text NOT NULL,
      orders_count int NOT NULL DEFAULT 0,
      total_spent numeric(12,2) NOT NULL DEFAULT 0,
      last_order_at timestamptz,
      created_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE TABLE IF NOT EXISTS orders (
      id serial PRIMARY KEY,
      order_number text NOT NULL UNIQUE,
      customer_id int NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
      financial_status text NOT NULL,
      fulfillment_status text NOT NULL,
      channel text NOT NULL,
      items_count int NOT NULL,
      total numeric(10,2) NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders (created_at);
    CREATE INDEX IF NOT EXISTS idx_orders_customer ON orders (customer_id);
    ALTER TABLE users ADD COLUMN IF NOT EXISTS permissions text[] NOT NULL DEFAULT '{}';
    ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS session_version integer NOT NULL DEFAULT 0;
    ALTER TABLE users ALTER COLUMN role SET DEFAULT 'staff';
  `);

  await client.query("TRUNCATE users, store_settings, products, customers, orders RESTART IDENTITY CASCADE");

  await client.query(
    "INSERT INTO users (name, email, password_hash, role, permissions, is_active) VALUES ($1,$2,$3,'admin','{}',true)",
    [ADMIN_NAME, ADMIN_EMAIL, hashPassword(ADMIN_PASSWORD)]
  );

  await client.query(
    "INSERT INTO store_settings (store_name, store_email, currency, timezone) VALUES ($1,$2,$3,$4)",
    ["AthFlex", "support@athflex.com", "INR", "Asia/Kolkata"]
  );

  for (let i = 0; i < PRODUCTS.length; i++) {
    const [title, type, price] = PRODUCTS[i];
    const status = rnd() < 0.85 ? "active" : rnd() < 0.6 ? "draft" : "archived";
    const inventory = rnd() < 0.08 ? 0 : ri(3, 320);
    await client.query(
      "INSERT INTO products (title, product_type, status, price, inventory, sku, sales, color, created_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)",
      [
        title,
        type,
        status,
        price,
        inventory,
        `AF-${String(1001 + i)}`,
        ri(40, 850),
        PALETTE[i % PALETTE.length],
        new Date(Date.now() - ri(30, 400) * 864e5).toISOString(),
      ]
    );
  }

  for (const [name, city, country] of CUSTOMERS) {
    const email = name.toLowerCase().replace(/[^a-z]+/g, ".") + "@example.com";
    await client.query(
      "INSERT INTO customers (name, email, city, country, created_at) VALUES ($1,$2,$3,$4,$5)",
      [name, email, city, country, new Date(Date.now() - ri(20, 500) * 864e5).toISOString()]
    );
  }

  const { rows: productRows } = await client.query("SELECT price FROM products");
  const ORDER_COUNT = 220;
  for (let i = 0; i < ORDER_COUNT; i++) {
    const customerId = ri(1, CUSTOMERS.length);
    const financial = weightedStatus();
    const fulfillment = financial === "paid" && rnd() < 0.68 ? "fulfilled" : "unfulfilled";
    const items = ri(1, 5);
    const unit = parseFloat(productRows[ri(0, productRows.length - 1)].price);
    const total = (items * unit * (1 + rnd() * 0.15)).toFixed(2);
    const daysAgo = Math.floor(Math.pow(rnd(), 1.6) * 179);
    const at = new Date(Date.now() - daysAgo * 864e5 - ri(0, 23) * 36e5 - ri(0, 59) * 6e4);
    await client.query(
      "INSERT INTO orders (order_number, customer_id, financial_status, fulfillment_status, channel, items_count, total, created_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)",
      [`#${1001 + i}`, customerId, financial, fulfillment, pick(CHANNELS), items, total, at.toISOString()]
    );
  }

  await client.query(`
    UPDATE customers c SET
      orders_count = agg.cnt,
      total_spent = agg.spent,
      last_order_at = agg.last_at
    FROM (
      SELECT customer_id, count(*) cnt, sum(total) spent, max(created_at) last_at
      FROM orders GROUP BY customer_id
    ) agg
    WHERE agg.customer_id = c.id
  `);

  const counts = await client.query(
    "SELECT (SELECT count(*) FROM products) p, (SELECT count(*) FROM customers) c, (SELECT count(*) FROM orders) o, (SELECT sum(total) FROM orders) t"
  );
  console.log("Seeded:", counts.rows[0]);
  console.log(`Admin login: ${ADMIN_EMAIL} / ${ADMIN_PASSWORD}`);
  await client.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
