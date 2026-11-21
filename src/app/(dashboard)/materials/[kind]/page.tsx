import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/dal";
import { hasPermission } from "@/lib/permissions";
import { getMaterialMaster, isMaterialKind, MATERIAL_KINDS } from "@/lib/materials";
import MaterialMasterForm from "@/components/MaterialMasterForm";
import SearchInput from "@/components/SearchInput";

export default async function MaterialMasterPage({ params, searchParams }: PageProps<"/materials/[kind]">) {
  const user = await requirePermission("techpacks");
  const [{ kind }, sp] = await Promise.all([params, searchParams]);
  if (!isMaterialKind(kind)) notFound();
  const search = typeof sp.q === "string" ? sp.q.trim() : "";
  const rows = await getMaterialMaster(kind, search);
  const meta = MATERIAL_KINDS[kind];
  const other = kind === "fabric" ? "trim" : "fabric";

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-neutral-700">Part A · Techpack &amp; SKU</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight">{meta.label} master</h1>
          <p className="mt-1 max-w-2xl text-sm text-neutral-500">{meta.hint}</p>
        </div>
        <Link href={`/materials/${other}`} className="border border-neutral-300 bg-white px-4 py-2.5 text-sm font-medium hover:border-neutral-950">{MATERIAL_KINDS[other].label} master →</Link>
      </div>

      {hasPermission(user, "techpacks_manage") && (
        <section className="border border-neutral-300 bg-white p-5">
          <h2 className="mb-4 font-semibold">Add a {meta.label.toLowerCase()}</h2>
          <MaterialMasterForm kind={kind} />
        </section>
      )}

      <section className="border border-neutral-300 bg-white">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-300 px-5 py-4">
          <div>
            <h2 className="text-sm font-semibold">{meta.plural}</h2>
            <p className="mt-0.5 text-xs text-neutral-500">{rows.length} {rows.length === 1 ? meta.label.toLowerCase() : meta.plural.toLowerCase()}{search ? ` matching “${search}”` : ""}</p>
          </div>
          <SearchInput placeholder={`Search ${meta.plural.toLowerCase()}`} />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-neutral-50 text-xs uppercase tracking-wide text-neutral-500">
              <tr>
                <th className="px-5 py-3 font-medium">{meta.label} name</th>
                <th className="px-5 py-3 font-medium">Used on styles</th>
                <th className="px-5 py-3 font-medium">Used on SKUs</th>
                <th className="px-5 py-3 font-medium">Added</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200">
              {rows.map((row) => (
                <tr key={row.id} className="hover:bg-neutral-50">
                  <td className="px-5 py-3 font-medium">{row.name}</td>
                  <td className="px-5 py-3 tabular-nums">{row.style_count}</td>
                  <td className="px-5 py-3 tabular-nums">{row.sku_count}</td>
                  <td className="px-5 py-3 text-neutral-600">{row.created}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!rows.length && (
            <div className="px-5 py-12 text-center">
              <p className="font-medium">{search ? `No ${meta.plural.toLowerCase()} match “${search}”` : `No ${meta.plural.toLowerCase()} yet`}</p>
              <p className="mt-1 text-sm text-neutral-500">{search ? "Try a different search." : `Add the first ${meta.label.toLowerCase()} above.`}</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
