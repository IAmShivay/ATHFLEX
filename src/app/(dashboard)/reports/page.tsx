import Link from "next/link";
import { requirePermission } from "@/lib/dal";
import { getJobbers, getPurchaseOrders } from "@/lib/production";
import { getProductionReport } from "@/lib/production-reports";
import { num } from "@/lib/format";

function dateLabel(value: string | null): string {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric" }).format(new Date(`${value.slice(0, 10)}T00:00:00`));
}

function pctWidth(value: number, max: number): string {
  return `${max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0}%`;
}

function reportDate(value: string | string[] | undefined): string | undefined {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;
  const parsed = new Date(`${value}T00:00:00Z`);
  return Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value ? undefined : value;
}

export default async function ReportsPage({ searchParams }: PageProps<"/reports">) {
  await requirePermission("production_reports");
  const sp = await searchParams;
  const jobberId = typeof sp.jobber === "string" && Number.isSafeInteger(Number(sp.jobber)) && Number(sp.jobber) > 0 ? Number(sp.jobber) : undefined;
  const poId = typeof sp.po === "string" && Number.isSafeInteger(Number(sp.po)) && Number(sp.po) > 0 ? Number(sp.po) : undefined;
  const from = reportDate(sp.from);
  const to = reportDate(sp.to);
  const filters = { jobber: jobberId, po: poId, from, to };
  const [report, jobbers, pos] = await Promise.all([getProductionReport(filters), getJobbers(), getPurchaseOrders()]);
  const hasFilters = Boolean(jobberId || poId || from || to);
  const maxLate = Math.max(1, ...report.late_jobbers.map((jobber) => jobber.avg_days));
  const maxPending = Math.max(1, ...report.pending_jobbers.map((jobber) => jobber.pending));

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-neutral-700">Phase 1 reports</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">Production performance</h1>
          <p className="mt-1 text-sm text-neutral-500">Lead time, on-time jobber performance, late ranking and pending pieces from actual inward scans.</p>
        </div>
        {hasFilters && <Link href="/reports" className="border border-neutral-300 bg-white px-3 py-2 text-xs font-medium hover:border-neutral-950">Clear filters</Link>}
      </div>

      <form method="get" className="border border-neutral-300 bg-white p-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <label className="text-sm font-medium">Jobber
            <select name="jobber" defaultValue={jobberId ?? ""} className="mt-1.5 w-full border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:border-neutral-950">
              <option value="">All jobbers</option>
              {jobbers.map((jobber) => <option key={jobber.id} value={jobber.id}>{jobber.name}</option>)}
            </select>
          </label>
          <label className="text-sm font-medium">FOB PO
            <select name="po" defaultValue={poId ?? ""} className="mt-1.5 w-full border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:border-neutral-950">
              <option value="">All POs</option>
              {pos.filter((po) => po.status !== "cancelled").map((po) => <option key={po.id} value={po.id}>{po.po_number} · {po.jobber}</option>)}
            </select>
          </label>
          <label className="text-sm font-medium">PO date from
            <input type="date" name="from" defaultValue={from ?? ""} className="mt-1.5 w-full border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:border-neutral-950" />
          </label>
          <label className="text-sm font-medium">PO date to
            <input type="date" name="to" defaultValue={to ?? ""} className="mt-1.5 w-full border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:border-neutral-950" />
          </label>
          <div className="flex items-end"><button className="w-full border border-neutral-950 bg-neutral-950 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800">Apply filters</button></div>
        </div>
      </form>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {[
          ["FOB POs", num(report.kpis.po_count), "non-cancelled"],
          ["Pieces received", num(report.kpis.received), `of ${num(report.kpis.ordered)} ordered`],
          ["On time", report.kpis.on_time_rate === null ? "—" : `${report.kpis.on_time_rate}%`, "completed size lines"],
          ["Avg lead time", report.kpis.avg_lead_days === null ? "—" : `${report.kpis.avg_lead_days} d`, "PO date to last receipt"],
          ["Pending", num(report.kpis.pending), `${num(report.kpis.overdue)} pieces overdue`],
          ["Manual entries", num(report.kpis.manual), "reported separately"],
        ].map(([label, value, note]) => (
          <div key={label} className="border border-neutral-300 bg-white p-4">
            <p className="text-xs uppercase tracking-wide text-neutral-500">{label}</p>
            <p className="mt-2 text-2xl font-semibold tabular-nums">{value}</p>
            <p className="mt-1 text-xs text-neutral-500">{note}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <section className="border border-neutral-300 bg-white p-5">
          <h2 className="font-semibold">On-time delivery</h2>
          <p className="mt-1 text-sm text-neutral-500">Completed size lines received on or before the original delivery date.</p>
          <div className="mt-4 space-y-3">
            {report.jobber_on_time.map((jobber) => (
              <div key={jobber.name}>
                <div className="flex items-baseline justify-between gap-2 text-sm"><span className="font-medium">{jobber.name}</span><span className="tabular-nums">{jobber.percent}%</span></div>
                <div className="mt-1 h-2 bg-neutral-100"><div className="h-full bg-neutral-950" style={{ width: `${jobber.percent}%` }} /></div>
                <p className="mt-1 text-xs text-neutral-500">{jobber.on_time} of {jobber.total} completed lines on time</p>
              </div>
            ))}
            {!report.jobber_on_time.length && <p className="py-6 text-sm text-neutral-500">No completed size lines yet.</p>}
          </div>
        </section>

        <section className="border border-neutral-300 bg-white p-5">
          <h2 className="font-semibold">Late jobber ranking</h2>
          <p className="mt-1 text-sm text-neutral-500">Average days late per delayed size line, worst first.</p>
          <div className="mt-4 space-y-3">
            {report.late_jobbers.map((jobber, index) => (
              <div key={jobber.name}>
                <div className="flex items-baseline justify-between gap-2 text-sm"><span className="font-medium">{index + 1}. {jobber.name}</span><span className="tabular-nums">{jobber.avg_days} d</span></div>
                <div className="mt-1 h-2 bg-neutral-100"><div className="h-full bg-neutral-700" style={{ width: pctWidth(jobber.avg_days, maxLate) }} /></div>
                <p className="mt-1 text-xs text-neutral-500">{jobber.count} delayed {jobber.count === 1 ? "line" : "lines"}</p>
              </div>
            ))}
            {!report.late_jobbers.length && <p className="py-6 text-sm text-neutral-500">No late completed lines in this view.</p>}
          </div>
        </section>

        <section className="border border-neutral-300 bg-white p-5">
          <h2 className="font-semibold">Pending and overdue</h2>
          <p className="mt-1 text-sm text-neutral-500">Pieces still not received, with overdue pieces based on the current delivery date.</p>
          <div className="mt-4 space-y-3">
            {report.pending_jobbers.map((jobber) => (
              <div key={jobber.name}>
                <div className="flex items-baseline justify-between gap-2 text-sm"><span className="font-medium">{jobber.name}</span><span className="tabular-nums">{num(jobber.pending)} pcs</span></div>
                <div className="mt-1 h-2 bg-neutral-100"><div className="h-full bg-neutral-950" style={{ width: pctWidth(jobber.pending, maxPending) }} /></div>
                <p className="mt-1 text-xs text-neutral-500">{jobber.overdue ? `${num(jobber.overdue)} overdue · max ${jobber.max_days} d` : "Not overdue"}</p>
              </div>
            ))}
            {!report.pending_jobbers.length && <p className="py-6 text-sm text-neutral-500">Nothing is pending in this view.</p>}
          </div>
        </section>
      </div>

      <section className="overflow-hidden border border-neutral-300 bg-white">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-neutral-300 px-5 py-4">
          <div><h2 className="text-sm font-semibold">Lead time, FOB PO and SKU wise</h2><p className="mt-1 text-xs text-neutral-500">Lead time is counted from the PO date to the latest receipt for the style.</p></div>
          <span className="text-xs text-neutral-500">{report.lead_time.length} rows</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-neutral-50 text-xs uppercase tracking-wide text-neutral-500">
              <tr>
                <th className="px-5 py-3 font-medium">FOB PO</th>
                <th className="px-5 py-3 font-medium">SKU</th>
                <th className="px-5 py-3 font-medium">Jobber</th>
                <th className="px-5 py-3 font-medium">PO date</th>
                <th className="px-5 py-3 font-medium">Last receipt</th>
                <th className="px-5 py-3 font-medium">Lead time</th>
                <th className="px-5 py-3 font-medium">Received</th>
                <th className="px-5 py-3 font-medium">Result</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200">
              {report.lead_time.map((row) => (
                <tr key={`${row.po_id}-${row.techpack_id}`} className="hover:bg-neutral-50">
                  <td className="px-5 py-4"><Link href={`/purchase-orders/${row.po_id}`} className="font-semibold hover:underline">{row.po_number}</Link><span className="block text-xs text-neutral-500">{row.status.replaceAll("_", " ")}</span></td>
                  <td className="px-5 py-4"><span className="font-medium">{row.sku_label}</span><span className="block text-xs text-neutral-500">{row.sizes} sizes · {row.manual} manual</span></td>
                  <td className="px-5 py-4">{row.jobber}</td>
                  <td className="px-5 py-4 text-neutral-600">{dateLabel(row.po_date)}</td>
                  <td className="px-5 py-4 text-neutral-600">{dateLabel(row.last_receipt)}</td>
                  <td className="px-5 py-4 tabular-nums">{row.lead_days === null ? "—" : `${row.lead_days} d`}</td>
                  <td className="min-w-36 px-5 py-4"><div className="flex justify-between gap-2 text-xs"><span>{num(row.received)} / {num(row.ordered)}</span><span className="text-neutral-500">{row.ordered ? Math.round((row.received / row.ordered) * 100) : 0}%</span></div><div className="mt-1.5 h-1.5 bg-neutral-100"><div className="h-full bg-neutral-950" style={{ width: `${row.ordered ? Math.min(100, Math.round((row.received / row.ordered) * 100)) : 0}%` }} /></div></td>
                  <td className="px-5 py-4">{!row.complete ? <span className="text-xs text-neutral-500">Open</span> : row.on_time ? <span className="text-xs font-medium">On time</span> : <span className="text-xs font-semibold">Late</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!report.lead_time.length && (
            <div className="px-5 py-12 text-center">
              <p className="font-medium">No production data in this view</p>
              <p className="mt-1 text-sm text-neutral-500">{hasFilters ? "Try clearing a filter." : "Create and issue a FOB PO, then scan pieces inward."}</p>
              {!hasFilters && <Link href="/purchase-orders" className="mt-4 inline-block text-sm font-medium underline underline-offset-4">Open FOB POs →</Link>}
            </div>
          )}
        </div>
      </section>

      <p className="text-xs text-neutral-500">On-time is judged against the original delivery date, even after a revision. Pending and overdue use the current delivery date. Manual entries are included in received counts and shown separately.</p>
    </div>
  );
}
