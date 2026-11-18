"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { redirect } from "next/navigation";
import { query } from "@/lib/db";
import { requirePermission } from "@/lib/dal";
import { clearTokens, fetchShopifyProducts } from "@/lib/shopify";

const PALETTE = ["#0ea5e9", "#8b5cf6", "#f97316", "#10b981", "#ef4444", "#6366f1", "#ec4899", "#14b8a6"];

export async function syncShopifyProducts() {
  await requirePermission("shopify");

  revalidateTag("shopify-products", { expire: 0 });
  const { products, error } = await fetchShopifyProducts();
  if (error) {
    redirect(`/settings?error=${encodeURIComponent(error)}#shopify`);
  }

  let inserted = 0;

  for (const p of products) {
    const variant = p.variants[0];
    const price = variant?.price ?? "0.00";
    const inventory = p.variants.reduce((s, v) => s + (v.inventory_quantity ?? 0), 0);
    const sku = variant?.sku?.trim() || `SHOPIFY-${p.id}`;
    const color = PALETTE[p.id % PALETTE.length];

    await query(
      `INSERT INTO products (title, product_type, vendor, status, price, inventory, sku, color)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (sku) DO UPDATE SET
         title = EXCLUDED.title,
         product_type = EXCLUDED.product_type,
         vendor = EXCLUDED.vendor,
         status = EXCLUDED.status,
         price = EXCLUDED.price,
         inventory = EXCLUDED.inventory,
         color = EXCLUDED.color`,
      [p.title, p.product_type || "Shopify", p.vendor || "Shopify", p.status, price, inventory, sku, color]
    );
  }

  inserted = products.length;
  revalidatePath("/products");
  revalidatePath("/settings");
  redirect(`/settings?synced=${inserted}#shopify`);
}

export async function disconnectShopify() {
  await requirePermission("shopify");
  await clearTokens();
  revalidatePath("/settings");
  redirect("/settings?disconnected=1#shopify");
}
