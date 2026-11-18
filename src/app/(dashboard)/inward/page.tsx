import Link from "next/link";
import { requirePermission } from "@/lib/dal";
import { getInwardQueue, getRecentScans, getTodayScanCounts } from "@/lib/production";
import { ScanPieceForm } from "@/components/ScanPieceForm";
import { EntryTypeBadge, PoBadge, ProgressBar } from "@/components/ProductionBadges";
import { num } from "@/lib/format";

function dateTimeLabel(value: string | null): string {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" }).format(new Date(value));
}

export default async function InwardPage() {
  await requirePermission("inward");
  const [queue, recent, today] = await Promise.all([getInwardQueue(), getRecentScans(12), getTodayScanCounts()]);
  const ordered = queue.reduce((sum, po) => sum + po.ordered, 0);
  const received = queue.reduce((sum, po) => sum + po.received, 0);

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="border border-neutral-300 bg-white p-4"><p className="text-xs uppercase tracking-wide text-neutral-500">Open POs</p><p className="mt-2 text-2xl font-semibold tabular-nums">{num(queue.length)}</p><p className="mt-1 text-xs text-neutral-500">issued or partly received</p></div>
        <div className="border border-neutral-300 bg-white p-4"><p className="text-xs uppercase tracking-wide text-neutral-500">Pieces pending</p><p className="mt-2 text-2xl font-semibold tabular-nums">{num(Math.max(0, ordered - received))}</p><p className="mt-1 text-xs text-neutral-500">of {num(ordered)} ordered</p></div>
        <div className="border border-neutral-300 bg-white p-4"><p className="text-xs uppercase tracking-wide text-neutral-500">Scanned today</p><p className="mt-2 text-2xl font-semibold tabular-nums">{num(today.scanned)}</p><p className="mt-1 text-xs text-neutral-500">piece QR scans</p></div>
        <div className="border border-neutral-300 bg-white p-4"><p className="text-xs uppercase tracking-wide text-neutral-500">Manual today</p><p className="mt-2 text-2xl font-semibold tabular-nums">{num(today.manual)}</p><p className="mt-1 text-xs text-neutral-500">typed entries, reported separately</p></div>
      </div>

      <ScanPieceForm />

      <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <section className="overflow-hidden border border-neutral-300 bg-white">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-neutral-300 px-5 py-4">
            <h2 className="text-sm font-semibold">Open for inward</h2>
            <span className="text-xs text-neutral-500">{queue.length} POs</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-neutral-50 text-xs uppercase tracking-wide text-neutral-500">
                <tr><th className="px-5 py-3 font-medium">PO</th><th className="px-5 py-3 font-medium">Jobber</th><th className="px-5 py-3 font-medium">Progress</th><th className="px-5 py-3 font-medium">Last scan</th><th className="px-5 py-3 font-medium">Status</th></tr>
              </thead>
              <tbody className="divide-y divide-neutral-200">
                {queue.map((po) => (
                  <tr key={po.id} className="hover:bg-neutral-50">
                    <td className="px-5 py-4"><Link href={`/purchase-orders/${po.id}`} className="font-semibold hover:underline">{po.po_number}</Link></td>
                    <td className="px-5 py-4">{po.jobber}</td>
                    <td className="min-w-44 px-5 py-4"><div className="flex justify-between gap-2 text-xs"><span>{num(po.received)} / {num(po.ordered)}</span><span className="text-neutral-500">{po.ordered ? Math.round((po.received / po.ordered) * 100) : 0}%</span></div><ProgressBar value={po.received} total={po.ordered} className="mt-2" /></td>
                    <td className="px-5 py-4 text-neutral-600">{dateTimeLabel(po.last_scan_at)}</td>
                    <td className="px-5 py-4"><PoBadge status={po.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!queue.length && <div className="px-5 py-10"><p className="font-medium">No PO is open for inward</p><p className="mt-1 text-sm text-neutral-500">Issue a draft FOB PO to start scanning its pieces.</p><Link href="/purchase-orders" className="mt-3 inline-block text-sm font-medium underline underline-offset-4">Open FOB POs →</Link></div>}
          </div>
        </section>

        <section className="overflow-hidden border border-neutral-300 bg-white">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-neutral-300 px-5 py-4">
            <h2 className="text-sm font-semibold">Recent receipts</h2>
            <Link href="/inward/manual" className="text-xs font-medium underline underline-offset-4">Manual entry</Link>
          </div>
          <div className="divide-y divide-neutral-200">
            {recent.map((scan) => (
              <div key={scan.id} className="px-5 py-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-medium">{scan.sku_label} · {scan.size}</p>
                  <EntryTypeBadge type={scan.entry_type} />
                </div>
                <p className="mt-1 text-xs text-neutral-500">{scan.po_number} · piece {String(scan.piece_no).padStart(3, "0")} · {dateTimeLabel(scan.scanned_at)} · {scan.scanned_by}</p>
              </div>
            ))}
            {!recent.length && <p className="px-5 py-10 text-sm text-neutral-500">No pieces have been received yet. Scan the first piece above.</p>}
          </div>
        </section>
      </div>
    </div>
  );
}
