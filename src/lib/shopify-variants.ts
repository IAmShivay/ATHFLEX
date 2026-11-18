import { getAccessToken, storeDomain } from "./shopify";
import type { ShopifyOption } from "./techpacks";

// Mapping lookups stay bounded, regardless of the size of the store catalog.
export const SEARCH_VARIANTS = `query SearchVariants($query: String!) {
  productVariants(first: 30, query: $query) {
    nodes { id title sku product { id title } }
  }
}`;
export const SELECTED_VARIANTS = `query SelectedVariants($ids: [ID!]!) {
  nodes(ids: $ids) { ... on ProductVariant { id title sku product { id title } } }
}`;
type Variant = { id: string; title: string; sku: string | null; product: { id: string; title: string } };
type Result = { options: ShopifyOption[]; error?: string };

export function variantSearchQuery(search: string): string {
  // Escape search syntax while preserving Shopify's unquoted prefix matching.
  return search.trim().split(/\s+/).filter(Boolean).map((term) => {
    if (/^(AND|OR|NOT)$/.test(term)) return `"${term}"`;
    return `${term.replace(/[\\:"'()*]/g, "\\$&").replace(/^-/, "\\-")}*`;
  }).join(" AND ");
}

async function lookup(document: string, variables: Record<string, unknown>): Promise<Result> {
  const domain = storeDomain();
  const auth = domain ? await getAccessToken() : null;
  if (!domain || !auth) return { options: [], error: "Shopify is not connected. You can enter details manually and map SKUs later." };
  try {
    const response = await fetch(`https://${domain}/admin/api/2026-10/graphql.json`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Shopify-Access-Token": auth.token },
      body: JSON.stringify({ query: document, variables }),
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) return { options: [], error: response.status === 401 || response.status === 403 ? "Shopify rejected the connection. Reconnect it in Settings." : "Shopify is busy. Try searching again shortly." };
    const body = await response.json() as { data?: { productVariants?: { nodes: Variant[] }; nodes?: (Variant | null)[] }; errors?: unknown[] };
    if (body.errors?.length || !body.data) return { options: [], error: "Shopify could not complete this lookup. Try again shortly." };
    const nodes = body.data.productVariants?.nodes ?? body.data.nodes ?? [];
    return { options: nodes.filter((v): v is Variant => Boolean(v?.product)).map((v) => ({
      id: v.id.split("/").pop()!, productId: v.product.id.split("/").pop()!,
      product: v.product.title, variant: v.title, sku: v.sku, store: domain,
    })) };
  } catch {
    return { options: [], error: "Shopify search timed out or could not connect. You can keep working and map SKUs later." };
  }
}

export async function searchShopifyVariants(search: string): Promise<Result> {
  if (search.length > 100) return { options: [], error: "Search using 100 characters or fewer." };
  return lookup(SEARCH_VARIANTS, { query: variantSearchQuery(search) });
}

export async function getSelectedShopifyVariants(ids: string[]): Promise<Result> {
  const unique = [...new Set(ids)];
  if (!unique.length) return { options: [] };
  if (unique.length > 100 || unique.some((id) => !/^\d{1,30}$/.test(id))) return { options: [], error: "Invalid Shopify variant selection." };
  return lookup(SELECTED_VARIANTS, { ids: unique.map((id) => `gid://shopify/ProductVariant/${id}`) });
}
