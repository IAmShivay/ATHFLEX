import { requirePermission } from "@/lib/dal";
import { getErpOverview } from "@/lib/erp-overview";

export default async function AnalyticsPage() {
  await requirePermission("analytics");
  const {counts,colors}=await getErpOverview();
  return <div className="space-y-6"><div><h1 className="text-2xl font-semibold tracking-tight">Catalog analytics</h1><p className="mt-1 text-sm text-neutral-500">Coverage and setup progress across your ERP SKUs.</p></div>
    <div className="grid gap-4 md:grid-cols-3">{[["Shopify mappings",counts.mapped],["Fabric assigned",counts.fabric],["Trims assigned",counts.trim]].map(([label,value])=>{const covered=Number(value),percent=counts.skus?Math.round(covered/counts.skus*100):0;return <section key={label} className="border border-neutral-300 bg-white p-5"><h2 className="text-sm font-medium">{label}</h2><p className="mt-3 text-3xl font-semibold">{percent}%</p><p className="mt-2 text-xs text-neutral-500">{covered} of {counts.skus} SKUs</p><div className="mt-4 h-1.5 bg-neutral-100"><div className="h-full bg-neutral-950" style={{width:`${percent}%`}}/></div></section>;})}</div>
    <section className="border border-neutral-300 bg-white"><h2 className="border-b border-neutral-300 px-5 py-4 font-semibold">SKU coverage by color</h2><div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="bg-neutral-50 text-xs uppercase tracking-wide text-neutral-500"><tr><th className="px-5 py-3">Color</th><th className="px-5 py-3">ERP SKUs</th><th className="px-5 py-3">Shopify mapped</th><th className="px-5 py-3">Unmapped</th></tr></thead><tbody className="divide-y divide-neutral-200">{colors.map((row)=><tr key={row.color}><td className="px-5 py-3 font-medium">{row.color}</td><td className="px-5 py-3">{row.skus}</td><td className="px-5 py-3">{row.mapped}</td><td className="px-5 py-3">{row.skus-row.mapped}</td></tr>)}</tbody></table>{!colors.length&&<p className="px-5 py-10 text-sm text-neutral-500">Create tech pack SKUs to see catalog coverage.</p>}</div></section>
  </div>;
}
