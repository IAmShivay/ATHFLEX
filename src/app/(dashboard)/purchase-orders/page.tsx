import Link from "next/link";
import { requirePermission } from "@/lib/dal";
import { hasPermission } from "@/lib/permissions";
import { getPurchaseOrders } from "@/lib/production";
import { PoBadge, PoSourceBadge, ProgressBar } from "@/components/ProductionBadges";
import FilterTabs from "@/components/FilterTabs";
import { num } from "@/lib/format";

function dateLabel(value: string | null): string {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric" }).format(new Date(`${value}T00:00:00`));
}

export default async function PurchaseOrdersPage({ searchParams }: PageProps<"/purchase-orders">) {
  const user = await requirePermission("production");
  const sp = await searchParams;
  const status = typeof sp.status === "string" && ["draft", "issued", "partly_received", "closed", "cancelled"].includes(sp.status) ? sp.status : "all";
  const all = await getPurchaseOrders();
  const filtered = status === "all" ? all : all.filter((po) => po.status === status);
  const canManage = hasPermission(user, "production_manage");
  const counts = {
    all: all.length,
    draft: all.filter((po) => po.status === "draft").length,
    issued: all.filter((po) => po.status === "issued").length,
    partly_received: all.filter((po) => po.status === "partly_received").length,
    closed: all.filter((po) => po.status === "closed").length,
    cancelled: all.filter((po) => po.status === "cancelled").length,
  };
  const totals = all.reduce(
    (acc, po) => ({ ordered: acc.ordered + po.ordered, received: acc.received + po.received }),
    { ordered: 0, received: 0 }
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-neutral-700">Manufacturing</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">FOB POs</h1>
          <p className="mt-1 text-sm text-neutral-500">Order approved styles, share the piece QR sheet, and track inward receipts.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {canManage && <Link href="/jobbers" className="border border-neutral-300 bg-white px-4 py-2.5 text-sm font-medium hover:border-neutral-950">Jobbers</Link>}
          {canManage && <Link href="/purchase-orders/new" className="border border-neutral-950 bg-neutral-950 px-4 py-2.5 text-sm font-medium text-white hover:bg-neutral-800">+ New FOB PO</Link>}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="border border-neutral-300 bg-white p-4">
          <p className="text-xs uppercase tracking-wide text-neutral-500">Purchase orders</p>
          <p className="mt-2 text-2xl font-semibold tabular-nums">{num(all.length)}</p>
          <p className="mt-1 text-xs text-neutral-500">{counts.issued + counts.partly_received} open for inward</p>
        </div>
        <div className="border border-neutral-300 bg-white p-4">
          <p className="text-xs uppercase tracking-wide text-neutral-500">Pieces ordered</p>
          <p className="mt-2 text-2xl font-semibold tabular-nums">{num(totals.ordered)}</p>
          <p className="mt-1 text-xs text-neutral-500">across {num(all.length)} POs</p>
        </div>
        <div className="border border-neutral-300 bg-white p-4">
          <p className="text-xs uppercase tracking-wide text-neutral-500">Pieces received</p>
          <p className="mt-2 text-2xl font-semibold tabular-nums">{num(totals.received)}</p>
          <ProgressBar value={totals.received} total={totals.ordered} className="mt-3" />
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <FilterTabs
          tabs={[
            { key: "all", label: "All", count: counts.all },
            { key: "draft", label: "Draft", count: counts.draft },
            { key: "issued", label: "Issued", count: counts.issued },
            { key: "partly_received", label: "Partly received", count: counts.partly_received },
            { key: "closed", label: "Closed", count: counts.closed },
            { key: "cancelled", label: "Cancelled", count: counts.cancelled },
          ]}
          active={status}
          basePath="/purchase-orders"
        />
        {hasPermission(user, "inward") && <Link href="/inward" className="text-sm font-medium underline underline-offset-4">Go to inward scanning →</Link>}
      </div>

      <div className="overflow-hidden border border-neutral-300 bg-white">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-neutral-300 px-5 py-4">
          <h2 className="text-sm font-semibold">{status === "all" ? "All FOB POs" : "Filtered FOB POs"}</h2>
          <span className="text-xs text-neutral-500">{filtered.length} showing</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-neutral-50 text-xs uppercase tracking-wide text-neutral-500">
              <tr>
                <th className="px-5 py-3 font-medium">PO</th>
                <th className="px-5 py-3 font-medium">Jobber</th>
                <th className="px-5 py-3 font-medium">PO date</th>
                <th className="px-5 py-3 font-medium">Styles</th>
                <th className="px-5 py-3 font-medium">Received</th>
                <th className="px-5 py-3 font-medium">Next delivery</th>
                <th className="px-5 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200">
              {filtered.map((po) => (
                <tr key={po.id} className="hover:bg-neutral-50">
                  <td className="px-5 py-4">
                    <Link href={`/purchase-orders/${po.id}`} className="font-semibold hover:underline">{po.po_number}</Link>
                    <span className="mt-1 flex items-center gap-2 text-xs text-neutral-500">{po.items} size lines<PoSourceBadge source={po.source} /></span>
                  </td>
                  <td className="px-5 py-4">{po.jobber}</td>
                  <td className="px-5 py-4 text-neutral-600">{dateLabel(po.po_date)}</td>
                  <td className="px-5 py-4 tabular-nums">{po.styles}</td>
                  <td className="min-w-40 px-5 py-4">
                    <div className="flex items-center justify-between gap-3 text-xs"><span>{num(po.received)} / {num(po.ordered)}</span><span className="text-neutral-500">{po.ordered ? Math.round((po.received / po.ordered) * 100) : 0}%</span></div>
                    <ProgressBar value={po.received} total={po.ordered} className="mt-2" />
                  </td>
                  <td className="px-5 py-4 text-neutral-600">{dateLabel(po.next_delivery)}</td>
                  <td className="px-5 py-4"><PoBadge status={po.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
          {!filtered.length && (
            <div className="px-5 py-14 text-center">
              <p className="font-medium">No FOB POs here yet</p>
              <p className="mt-1 text-sm text-neutral-500">
                {all.length ? "Try another status filter." : "Approve a PP sample, assign a jobber, then create the first FOB PO."}
              </p>
              {canManage && !all.length && <Link href="/purchase-orders/new" className="mt-4 inline-block border border-neutral-950 bg-neutral-950 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800">+ New FOB PO</Link>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
