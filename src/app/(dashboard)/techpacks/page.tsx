import Link from "next/link";
import { requirePermission } from "@/lib/dal";
import { hasPermission } from "@/lib/permissions";
import { query } from "@/lib/db";
import type { PpStatus } from "@/lib/production";
import { PpBadge } from "@/components/ProductionBadges";

export default async function TechpacksPage() {
  const user = await requirePermission("techpacks");
  const { rows } = await query<{ id: number; name: string; code: string; season: string; theme: string; director: string; designer: string; sku_count: number; mapped_count: number; month: string; pp_status: PpStatus }>(`
    SELECT t.id, t.name, t.code, t.season, t.theme, d.name AS director, s.name AS designer,
           to_char(t.created_month,'Mon YYYY') AS month, t.pp_status,
           count(k.id)::int AS sku_count, count(k.shopify_variant_id)::int AS mapped_count
    FROM techpacks t JOIN users d ON d.id=t.director_id JOIN users s ON s.id=t.designer_id
    LEFT JOIN erp_skus k ON k.techpack_id=t.id
    GROUP BY t.id, d.name, s.name ORDER BY t.created_at DESC, t.id DESC`);
  const awaitingPp = rows.filter((row) => row.pp_status !== "approved").length;
  return <div className="space-y-5">
    <div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-widest text-neutral-700">Product development</p><h1 className="mt-1 text-2xl font-semibold tracking-tight">Tech packs</h1><p className="mt-1 text-sm text-[#737373]">Build product details, generate size and color SKUs, and link Shopify variants.</p></div>{hasPermission(user, "techpacks_manage") && <Link href="/techpacks/new" className="rounded-none bg-neutral-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-neutral-800">+ New tech pack</Link>}</div>
    <div className="overflow-hidden rounded-none border border-[#d4d4d4] bg-white shadow-none"><div className="flex justify-between border-b border-[#d4d4d4] px-5 py-4"><div><h2 className="text-sm font-semibold">All tech packs</h2><p className="mt-0.5 text-xs text-[#737373]">{rows.length} total · {awaitingPp} awaiting PP approval</p></div>{hasPermission(user, "production") && (hasPermission(user, "production_manage") ? <Link href="/purchase-orders/new" className="text-xs font-medium text-neutral-700 hover:underline">Create FOB PO →</Link> : <Link href="/purchase-orders" className="text-xs font-medium text-neutral-700 hover:underline">View FOB POs →</Link>)}</div><div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="bg-[#fafafa] text-xs uppercase tracking-wide text-[#737373]"><tr><th className="px-5 py-3 font-medium">Tech pack</th><th className="px-5 py-3 font-medium">PP sample</th><th className="px-5 py-3 font-medium">Season / theme</th><th className="px-5 py-3 font-medium">Team</th><th className="px-5 py-3 font-medium">SKUs</th><th className="px-5 py-3 font-medium">Shopify linked</th><th className="px-5 py-3 font-medium">Month</th></tr></thead><tbody className="divide-y divide-[#eee]">{rows.map((row) => <tr key={row.id} className="hover:bg-[#fafafa]"><td className="px-5 py-3"><Link href={`/techpacks/${row.id}`} className="font-semibold text-neutral-800 hover:underline">{row.name}</Link><span className="block text-xs text-[#737373]">{row.code}</span></td><td className="px-5 py-3"><PpBadge status={row.pp_status} /></td><td className="px-5 py-3">{row.season}<span className="block text-xs text-[#737373]">{row.theme}</span></td><td className="px-5 py-3">{row.designer}<span className="block text-xs text-[#737373]">Director: {row.director}</span></td><td className="px-5 py-3">{row.sku_count}</td><td className="px-5 py-3">{row.mapped_count} / {row.sku_count}</td><td className="px-5 py-3 text-[#737373]">{row.month}</td></tr>)}</tbody></table>{rows.length === 0 && <div className="px-5 py-14 text-center"><p className="font-medium">No tech packs yet</p><p className="mt-1 text-sm text-[#737373]">Create a tech pack to start building your ERP product catalog.</p></div>}</div></div>
  </div>;
}
