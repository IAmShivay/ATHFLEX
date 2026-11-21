import { money, num } from "@/lib/format";
import { requirePermission } from "@/lib/dal";
import { query } from "@/lib/db";
import Link from "next/link";
import { hasPermission } from "@/lib/permissions";
import { fetchShopifyProducts } from "@/lib/shopify";
import { ProductStatusBadge } from "@/components/Badges";
import { PpBadge } from "@/components/ProductionBadges";
import type { PpStatus } from "@/lib/production";
import FilterTabs from "@/components/FilterTabs";
import SearchInput from "@/components/SearchInput";
import Pagination from "@/components/Pagination";

type SkuMasterRow = {
  id: number; sku: string; product_name: string; color: string; size: string; shopify_sku: string | null;
  techpack_id: number; code: string; pp_status: PpStatus; fabric: string | null; trims: string | null;
};

export default async function ProductsPage({
  searchParams,
}: PageProps<"/products">) {
  const user = await requirePermission("products");
  const sp = await searchParams;
  const status = typeof sp.status === "string" ? sp.status : "all";
  const q = typeof sp.q === "string" ? sp.q.trim() : "";

  const [{ products: all, error: shopifyError }, erp] = await Promise.all([
    fetchShopifyProducts(),
    query<SkuMasterRow>(`
      SELECT k.id, k.sku, k.product_name, k.color, k.size, k.shopify_sku, t.id AS techpack_id, t.code, t.pp_status,
             (SELECT string_agg(m.name, ', ' ORDER BY lower(m.name)) FROM sku_material_tags s JOIN material_tags m ON m.id = s.tag_id WHERE s.sku_id = k.id AND m.kind = 'fabric') AS fabric,
             (SELECT string_agg(m.name, ', ' ORDER BY lower(m.name)) FROM sku_material_tags s JOIN material_tags m ON m.id = s.tag_id WHERE s.sku_id = k.id AND m.kind = 'trim') AS trims
      FROM erp_skus k JOIN techpacks t ON t.id = k.techpack_id
      WHERE ($1 = '' OR k.sku ILIKE '%' || $1 || '%' OR k.product_name ILIKE '%' || $1 || '%' OR k.color ILIKE '%' || $1 || '%' OR t.code ILIKE '%' || $1 || '%')
      ORDER BY k.product_name, k.sku`, [q]),
  ]);
  const connected = !shopifyError;

  const stats = {
    total: all.length,
    active: all.filter((p) => p.status === "active").length,
    draft: all.filter((p) => p.status === "draft").length,
    archived: all.filter((p) => p.status === "archived").length,
    units: all.reduce((s, p) => s + p.variants.reduce((v, va) => v + (va.inventory_quantity ?? 0), 0), 0),
    value: all.reduce((s, p) => s + p.variants.reduce((v, va) => v + (va.inventory_quantity ?? 0) * Number(va.price), 0), 0),
  };

  const ql = q.toLowerCase();
  const filteredProducts = all.filter((p) => {
    if (["active", "draft", "archived"].includes(status) && p.status !== status) return false;
    if (q && ![p.title, p.handle, p.product_type, p.vendor].some((f) => f && f.toLowerCase().includes(ql)))
      return false;
    return true;
  });

  const pageSize = 30;
  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / pageSize));
  const page = Math.min(totalPages, Math.max(1, Math.floor(Number(sp.page)) || 1));
  const products = filteredProducts.slice((page - 1) * pageSize, page * pageSize);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><h1 className="text-xl font-semibold tracking-tight text-[#1a1a1a]">SKU / Product master</h1><p className="mt-1 max-w-2xl text-sm text-[#616161]">The one common list of SKUs. Tech packs, FOB POs and, in Phase 2, planning all use these same records.</p></div>
        <p className="text-sm text-[#616161]">
          {`${erp.rows.length} ERP SKU${erp.rows.length === 1 ? "" : "s"}`}
        </p>
      </div>

      <div className="overflow-hidden rounded-none border border-[#d4d4d4] bg-white shadow-none"><div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"><div><h2 className="text-sm font-semibold">ERP SKUs</h2><p className="mt-0.5 text-xs text-[#737373]">Generated from tech packs · {erp.rows.length} {q ? "matching" : "total"}</p></div><div className="flex flex-wrap items-center gap-3"><SearchInput placeholder="Search SKUs, styles, Shopify products" />{hasPermission(user, "techpacks") && <Link href="/techpacks" className="text-xs font-medium text-neutral-700 hover:underline">Tech packs →</Link>}</div></div><div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="border-y border-[#eee] bg-[#fafafa] text-xs uppercase tracking-wide text-[#737373]"><tr><th className="px-4 py-2.5">ERP SKU</th><th className="px-4 py-2.5">Style</th><th className="px-4 py-2.5">Color / size</th><th className="px-4 py-2.5">PP</th><th className="px-4 py-2.5">Fabric</th><th className="px-4 py-2.5">Trims</th><th className="px-4 py-2.5">Shopify SKU</th></tr></thead><tbody className="divide-y divide-[#eee]">{erp.rows.map((sku) => <tr key={sku.id}><td className="px-4 py-3 font-medium">{sku.sku}</td><td className="px-4 py-3">{hasPermission(user, "techpacks") ? <Link href={`/techpacks/${sku.techpack_id}`} className="hover:underline">{sku.product_name}</Link> : sku.product_name}<span className="block text-xs text-[#737373]">{sku.code}</span></td><td className="px-4 py-3">{sku.color} · {sku.size}</td><td className="px-4 py-3"><PpBadge status={sku.pp_status} /></td><td className="px-4 py-3 text-[#616161]">{sku.fabric || "—"}</td><td className="px-4 py-3 text-[#616161]">{sku.trims || "—"}</td><td className="px-4 py-3 text-[#737373]">{sku.shopify_sku || "—"}</td></tr>)}</tbody></table>{!erp.rows.length && <p className="px-4 py-8 text-center text-sm text-[#737373]">{q ? `No SKUs match “${q}”.` : "No ERP SKUs yet. Create a tech pack to get started."}</p>}</div></div>

      {connected && (
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-none border border-[#d4d4d4] bg-white p-4 shadow-none">
            <p className="text-xs font-medium uppercase tracking-wide text-[#737373]">Products on Shopify</p>
            <p className="mt-2 text-2xl font-semibold tracking-tight text-[#1a1a1a]">{num(stats.total)}</p>
            <p className="mt-1 text-xs text-[#737373]">{num(stats.active)} active</p>
          </div>
          <div className="rounded-none border border-[#d4d4d4] bg-white p-4 shadow-none">
            <p className="text-xs font-medium uppercase tracking-wide text-[#737373]">Units in stock</p>
            <p className="mt-2 text-2xl font-semibold tracking-tight text-[#1a1a1a]">{num(stats.units)}</p>
            <p className="mt-1 text-xs text-[#737373]">across all variants</p>
          </div>
          <div className="rounded-none border border-[#d4d4d4] bg-white p-4 shadow-none">
            <p className="text-xs font-medium uppercase tracking-wide text-[#737373]">Inventory value</p>
            <p className="mt-2 text-2xl font-semibold tracking-tight text-[#1a1a1a]">{money(stats.value)}</p>
            <p className="mt-1 text-xs text-[#737373]">units × variant price</p>
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <FilterTabs
          tabs={[
            { key: "all", label: "All", count: stats.total },
            { key: "active", label: "Active", count: stats.active },
            { key: "draft", label: "Draft", count: stats.draft },
            { key: "archived", label: "Archived", count: stats.archived },
          ]}
          active={status}
          basePath="/products"
          extraParams={{ q }}
        />
      </div>

      <div className="overflow-hidden rounded-none border border-[#d4d4d4] bg-white shadow-none">
        <div className="flex items-center justify-between px-4 py-3">
          <h2 className="text-sm font-semibold text-[#1a1a1a]">Shopify catalog</h2>
          <p className="text-xs text-[#737373]">Updated from Shopify · cached for up to 60 seconds</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#d4d4d4] bg-[#fafafa] text-left text-xs uppercase tracking-wide text-[#737373]">
                <th className="px-4 py-2.5 font-medium">Product</th>
                <th className="px-4 py-2.5 font-medium">Status</th>
                <th className="hidden px-4 py-2.5 font-medium md:table-cell">Type</th>
                <th className="hidden px-4 py-2.5 font-medium lg:table-cell">Vendor</th>
                <th className="px-4 py-2.5 font-medium">Inventory</th>
                <th className="hidden px-4 py-2.5 font-medium sm:table-cell">Variants</th>
                <th className="px-4 py-2.5 text-right font-medium">Price</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f7f7f7]">
              {products.map((p) => {
                const inventory = p.variants.reduce((s, v) => s + (v.inventory_quantity ?? 0), 0);
                const prices = p.variants.map((v) => Number(v.price)).filter((n) => !isNaN(n));
                const min = prices.length ? Math.min(...prices) : 0;
                const max = prices.length ? Math.max(...prices) : 0;
                return (
                  <tr key={p.id} className="transition-colors hover:bg-[#fafafa]">
                    <td className="px-4 py-3">
                      <span className="flex items-center gap-3">
                        {p.image_src ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={(() => { const url = new URL(p.image_src); url.searchParams.set("width", "80"); return url.toString(); })()}
                            loading="lazy" decoding="async" width={40} height={40}
                            alt=""
                            className="h-10 w-10 shrink-0 rounded-none border border-[#d4d4d4] object-cover"
                          />
                        ) : (
                          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-none bg-[#f7f7f7] text-xs font-bold text-[#737373]">
                            {p.title.slice(0, 2).toUpperCase()}
                          </span>
                        )}
                        <span className="min-w-0">
                          <span className="block max-w-xs truncate font-medium text-[#1a1a1a]">{p.title}</span>
                          <span className="block truncate text-xs text-[#737373]">{p.handle}</span>
                        </span>
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <ProductStatusBadge status={p.status} />
                    </td>
                    <td className="hidden px-4 py-3 text-[#616161] md:table-cell">{p.product_type || "—"}</td>
                    <td className="hidden px-4 py-3 text-[#616161] lg:table-cell">{p.vendor || "—"}</td>
                    <td className="px-4 py-3 text-[#1a1a1a]">{num(inventory)}</td>
                    <td className="hidden px-4 py-3 text-[#616161] sm:table-cell">{p.variants.length}</td>
                    <td className="px-4 py-3 text-right font-medium text-[#1a1a1a]">
                      {min === max ? money(min) : `${money(min)} – ${money(max)}`}
                    </td>
                  </tr>
                );
              })}
              {products.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-sm text-[#737373]">
                    {shopifyError
                      ? shopifyError
                      : `No products found${q ? ` for “${q}”` : ""}.`}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <Pagination page={page} totalPages={totalPages} makeHref={(next) => `/products?${new URLSearchParams({ status, q, page: String(next) })}`} />
      </div>
    </div>
  );
}
