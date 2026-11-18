import { query } from "./db";

export type PersonOption = { id: number; name: string; email: string; is_active: boolean };
export type ShopifyOption = { id: string; productId: string; product: string; variant: string; sku: string | null; store: string };

export async function getPeople(includeIds: number[] = []): Promise<PersonOption[]> {
  const { rows } = await query<PersonOption>("SELECT id, name, email, is_active FROM users WHERE is_active OR id=ANY($1::int[]) ORDER BY name, id", [includeIds]);
  return rows;
}

export type Techpack = {
  id: number; name: string; code: string; director_id: number; designer_id: number;
  created_month: string; season: string; theme: string; brand_sku: string | null;
  order_type: string; key_features: string | null; fabric_details: string | null;
  color_family: string; tpg_code: string; target_cost: string | null; dropbox_url: string | null;
  description: string | null; d2c_exclusive: boolean; neck_type: string | null;
  size_type: string | null; collection_type: string | null; remarks: string | null;
  pp_status: "pending" | "approved" | "rejected"; pp_notes: string | null;
  pp_decided_at: string | null; pp_decided_by: number | null;
};

export type ErpSku = {
  id: number; sku: string; product_name: string; color: string; size: string;
  shopify_store_domain: string | null; shopify_variant_id: string | null;
  shopify_product_name: string | null; shopify_variant_name: string | null; shopify_sku: string | null;
};

export type TechpackFile = { id: number; category: string; original_name: string; size_bytes: number; mime_type: string };
