import { randomBytes } from "node:crypto";
import { pool, query } from "./db";
import { revalidateTag, unstable_cache } from "next/cache";

const API_VERSION = "2025-01";
export const SHOPIFY_SCOPES = "read_products,write_products";

export function storeDomain(): string | null {
  const d = process.env.SHOPIFY_STORE_DOMAIN?.trim().replace(/^https?:\/\//, "").replace(/\/$/, "");
  return d && !d.startsWith("YOUR-STORE") && /^[a-z0-9][a-z0-9-]*\.myshopify\.com$/i.test(d) ? d.toLowerCase() : null;
}

export function oauthConfigured(): boolean {
  return Boolean(storeDomain() && process.env.SHOPIFY_CLIENT_ID?.trim() && process.env.SHOPIFY_CLIENT_SECRET?.trim());
}

export function generateState(): string {
  return randomBytes(16).toString("hex");
}

export function appOrigin(fallback: string): string {
  return process.env.APP_URL?.trim().replace(/\/$/, "") || fallback;
}

export function buildAuthorizeUrl(state: string, origin: string): string | null {
  const domain = storeDomain();
  const clientId = process.env.SHOPIFY_CLIENT_ID?.trim();
  if (!domain || !clientId) return null;
  const redirectUri =
    process.env.SHOPIFY_REDIRECT_URI?.trim() || `${origin}/api/shopify/callback`;
  const params = new URLSearchParams({
    client_id: clientId,
    scope: SHOPIFY_SCOPES,
    redirect_uri: redirectUri,
    state,
  });
  return `https://${domain}/admin/oauth/authorize?${params.toString()}`;
}

export async function exchangeCodeForToken(
  code: string
): Promise<{ access_token: string; scope: string } | null> {
  const domain = storeDomain();
  const clientId = process.env.SHOPIFY_CLIENT_ID?.trim();
  const clientSecret = process.env.SHOPIFY_CLIENT_SECRET?.trim();
  if (!domain || !clientId || !clientSecret) return null;

  const res = await fetch(`https://${domain}/admin/oauth/access_token`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ client_id: clientId, client_secret: clientSecret, code }),
    cache: "no-store",
  });
  if (!res.ok) {
    console.error("shopify token exchange failed", res.status, await res.text());
    return null;
  }
  const data = (await res.json()) as { access_token?: string; scope?: string };
  if (!data.access_token) return null;
  return { access_token: data.access_token, scope: data.scope ?? "" };
}

async function ensureTokenTable() {
  await query(
    `CREATE TABLE IF NOT EXISTS shopify_tokens (
      id serial PRIMARY KEY,
      store_domain text NOT NULL,
      access_token text NOT NULL,
      scope text NOT NULL DEFAULT '',
      created_at timestamptz NOT NULL DEFAULT now()
    )`
  );
}

export async function saveToken(token: string, scope: string) {
  const domain = storeDomain();
  if (!domain) throw new Error("SHOPIFY_STORE_DOMAIN not set");
  await ensureTokenTable();
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("SELECT pg_advisory_xact_lock(624839104)");
    await client.query("DELETE FROM shopify_tokens");
    await client.query("INSERT INTO shopify_tokens (store_domain, access_token, scope) VALUES ($1,$2,$3)", [domain, token, scope]);
    await client.query("COMMIT");
  } catch (error) { await client.query("ROLLBACK"); throw error; } finally { client.release(); }
  revalidateTag("shopify-products", { expire: 0 });
}

export async function clearTokens() {
  await ensureTokenTable();
  await query("DELETE FROM shopify_tokens");
  revalidateTag("shopify-products", { expire: 0 });
}

export async function getAccessToken(): Promise<{ token: string; source: "env" | "oauth" } | null> {
  const envToken = process.env.SHOPIFY_ADMIN_ACCESS_TOKEN?.trim();
  if (envToken) return { token: envToken, source: "env" };
  try {
    const { rows } = await query<{ access_token: string }>(
      "SELECT access_token FROM shopify_tokens WHERE lower(store_domain) = $1 ORDER BY id DESC LIMIT 1", [storeDomain()]
    );
    if (rows[0]) return { token: rows[0].access_token, source: "oauth" };
  } catch (e) {
    console.error("shopify token lookup failed", e);
  }
  return null;
}

export type ShopifyVariant = {
  id: number;
  title: string;
  sku: string | null;
  price: string;
  inventory_quantity: number | null;
};

export type ShopifyProduct = {
  id: number;
  title: string;
  handle: string;
  status: string;
  vendor: string;
  product_type: string;
  image_src: string | null;
  variants: ShopifyVariant[];
};

export async function fetchShopifyProducts(): Promise<
  { products: ShopifyProduct[]; error?: undefined } | { products: []; error: string }
> {
  const domain = storeDomain();
  if (!domain) {
    return { products: [], error: "SHOPIFY_STORE_DOMAIN is not set in .env.local." };
  }
  const auth = await getAccessToken();
  if (!auth) {
    return { products: [], error: "Not connected — no Shopify access token." };
  }

  try {
    return { products: await cachedProductCatalog(domain, auth.token) };
  } catch (error) {
    return { products: [], error: error instanceof CatalogLookupError ? error.message : "Could not load the Shopify catalog. Try again shortly." };
  }
}

class CatalogLookupError extends Error {}

async function fetchProductCatalog(domain: string, token: string): Promise<
  { products: ShopifyProduct[]; error?: undefined } | { products: []; error: string }
> {
  type ProductResponse = {
    products: {
      id: number;
      title: string;
      handle: string;
      status: string;
      vendor: string;
      product_type: string;
      images: { src: string }[];
      variants: ShopifyVariant[];
    }[];
  };
  const products: ProductResponse["products"] = [];
  const path = `/admin/api/${API_VERSION}/products.json`;
  let url: string | null = `https://${domain}${path}?limit=250&status=active,draft,archived&fields=id,title,handle,status,vendor,product_type,images,variants`;
  const signal = AbortSignal.timeout(20000);
  try {
    for (let page = 0; url && page < 40; page++) {
      const response: Response = await fetch(url, {
        headers: { "X-Shopify-Access-Token": token, Accept: "application/json" },
        cache: "no-store",
        signal,
      });
      if (!response.ok) {
        if (response.status === 401 || response.status === 403) return { products: [], error: "Shopify rejected the access token. Reconnect the store." };
        return { products: [], error: `Shopify API error ${response.status}.` };
      }
      const data = await response.json() as ProductResponse;
      products.push(...data.products);
      const next: string | undefined = (response.headers.get("link") ?? "").match(/<([^>]+)>;\s*rel="next"/)?.[1];
      if (next) {
        const nextUrl = new URL(next);
        if (nextUrl.origin !== `https://${domain}` || nextUrl.pathname !== path) return { products: [], error: "Shopify returned an invalid catalog page link." };
      }
      url = next ?? null;
    }
    if (url) return { products: [], error: "The Shopify catalog is too large to load completely. Please narrow the catalog before mapping." };
  } catch (error) {
    console.error("shopify product lookup failed", error);
    return { products: [], error: "Could not reach Shopify. You can still work on tech packs without a connection." };
  }

  return {
    products: products.map((p) => ({
      id: p.id,
      title: p.title,
      handle: p.handle,
      status: p.status,
      vendor: p.vendor,
      product_type: p.product_type,
      image_src: p.images?.[0]?.src ?? null,
      variants: (p.variants ?? []).map((v) => ({ id:v.id, title:v.title, sku:v.sku, price:v.price, inventory_quantity:v.inventory_quantity })),
    })),
  };
}

// Cache the small normalized catalog, not multi-megabyte raw Shopify responses.
// Store and credential are key arguments; authorization is checked before every lookup.
const cachedProductCatalog = unstable_cache(async (domain: string, token: string) => {
  const result = await fetchProductCatalog(domain, token);
  if (result.error) throw new CatalogLookupError(result.error);
  return result.products;
}, ["shopify-products-normalized-v1"], { revalidate: 60, tags: ["shopify-products"] });

export type ShopifyOrder = {
  id: number;
  created_at: string;
  total_price: string;
  financial_status: string;
  source_name: string | null;
  cancelled_at: string | null;
  test: boolean;
};

export async function fetchShopifyOrders(days = 200): Promise<ShopifyOrder[] | null> {
  const domain = storeDomain();
  const auth = await getAccessToken();
  if (!domain || !auth) return null;

  const createdMin = new Date(Date.now() - days * 864e5).toISOString();
  const fields = "id,created_at,total_price,financial_status,source_name,cancelled_at,test";
  let url =
    `https://${domain}/admin/api/${API_VERSION}/orders.json?status=any&limit=250` +
    `&created_at_min=${encodeURIComponent(createdMin)}&fields=${fields}`;

  const out: ShopifyOrder[] = [];
  for (let page = 0; page < 10; page++) {
    const res = await fetch(url, {
      headers: { "X-Shopify-Access-Token": auth.token, Accept: "application/json" },
      cache: "no-store",
    });
    if (!res.ok) {
      console.error("shopify orders failed", res.status, (await res.text()).slice(0, 300));
      return null;
    }
    const data = (await res.json()) as { orders: ShopifyOrder[] };
    out.push(...data.orders);
    const next = (res.headers.get("link") ?? "").match(/<([^>]+)>;\s*rel="next"/);
    if (!next || data.orders.length === 0) break;
    url = next[1];
  }
  return out;
}
