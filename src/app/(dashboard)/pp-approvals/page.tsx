import Link from "next/link";
import { requirePermission } from "@/lib/dal";
import { hasPermission } from "@/lib/permissions";
import { query } from "@/lib/db";
import type { PpStatus } from "@/lib/production";
import { PpBadge } from "@/components/ProductionBadges";
import FilterTabs from "@/components/FilterTabs";

type QueueRow = {
  id: number;
  name: string;
  code: string;
  season: string;
  pp_status: PpStatus;
  pp_notes: string | null;
  pp_rework_count: number;
  pp_decided_at: string | null;
  decided_by: string | null;
  sku_count: number;
};

const TABS: { key: PpStatus; label: string }[] = [
  { key: "pending", label: "Awaiting approval" },
  { key: "rejected", label: "Rework" },
  { key: "approved", label: "Approved" },
];

const dateLabel = (value: string | null) =>
  value ? new Date(value).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata" }) : "—";

export default async function PpApprovalsPage({ searchParams }: PageProps<"/pp-approvals">) {
  const user = await requirePermission("techpacks");
  const sp = await searchParams;
  const status = TABS.find((tab) => tab.key === sp.status)?.key ?? "pending";
  const { rows } = await query<QueueRow>(`
    SELECT t.id, t.name, t.code, t.season, t.pp_status, t.pp_notes, t.pp_rework_count, t.pp_decided_at,
           u.name AS decided_by, count(k.id)::int AS sku_count
    FROM techpacks t
    LEFT JOIN users u ON u.id = t.pp_decided_by
    LEFT JOIN erp_skus k ON k.techpack_id = t.id
    GROUP BY t.id, u.name
    ORDER BY t.pp_decided_at DESC NULLS LAST, t.created_at DESC, t.id DESC`);
  const counts = Object.fromEntries(TABS.map((tab) => [tab.key, rows.filter((row) => row.pp_status === tab.key).length]));
  const visible = rows.filter((row) => row.pp_status === status);
  const canDecide = hasPermission(user, "pp_approve");

  return (
    <div className="space-y-5">
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-neutral-700">Product development</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">PP approval</h1>
        <p className="mt-1 max-w-2xl text-sm text-neutral-500">A style can only be ordered once its pre-production sample is approved. Rejected samples go back for rework and are resubmitted for a new decision.</p>
      </div>

      <FilterTabs tabs={TABS.map((tab) => ({ key: tab.key, label: tab.label, count: counts[tab.key] }))} active={status} basePath="/pp-approvals" />

      <div className="overflow-hidden border border-neutral-300 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-neutral-50 text-xs uppercase tracking-wide text-neutral-500">
              <tr>
                <th className="px-5 py-3 font-medium">Style</th>
                <th className="px-5 py-3 font-medium">PP sample</th>
                <th className="px-5 py-3 font-medium">Rework rounds</th>
                <th className="px-5 py-3 font-medium">Last decision</th>
                <th className="px-5 py-3 font-medium">Note</th>
                <th className="px-5 py-3 font-medium"><span className="sr-only">Action</span></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200">
              {visible.map((row) => (
                <tr key={row.id} className="hover:bg-neutral-50">
                  <td className="px-5 py-4">
                    <Link href={`/techpacks/${row.id}`} className="font-semibold hover:underline">{row.name}</Link>
                    <span className="block text-xs text-neutral-500">{row.code} · {row.season} · {row.sku_count} SKUs</span>
                  </td>
                  <td className="px-5 py-4"><PpBadge status={row.pp_status} />{row.pp_status === "pending" && row.pp_rework_count > 0 && <span className="mt-1 block text-xs text-neutral-500">Resubmitted</span>}</td>
                  <td className="px-5 py-4 tabular-nums">{row.pp_rework_count}</td>
                  <td className="px-5 py-4 text-neutral-600">{dateLabel(row.pp_decided_at)}{row.decided_by && <span className="block text-xs text-neutral-500">by {row.decided_by}</span>}</td>
                  <td className="max-w-xs px-5 py-4 text-neutral-600"><span className="line-clamp-2">{row.pp_notes || "—"}</span></td>
                  <td className="px-5 py-4 text-right">
                    <Link href={`/techpacks/${row.id}#pp-approval`} className="text-xs font-medium underline underline-offset-4">
                      {status === "pending" && canDecide ? "Review" : status === "rejected" ? "Rework" : "Open"} →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!visible.length && (
            <div className="px-5 py-14 text-center">
              <p className="font-medium">{status === "pending" ? "Nothing is waiting for approval" : status === "rejected" ? "No samples need rework" : "No approved styles yet"}</p>
              <p className="mt-1 text-sm text-neutral-500">New styles appear here as soon as they are created.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
