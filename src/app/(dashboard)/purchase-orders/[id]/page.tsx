import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/dal";
import { hasPermission } from "@/lib/permissions";
import { getPurchaseOrder } from "@/lib/production";
import { PoBadge, PpBadge, ProgressBar } from "@/components/ProductionBadges";
import { PoStatusActions } from "@/components/PoStatusActions";
import { DeliveryDateCell } from "@/components/DeliveryDateCell";
import { num } from "@/lib/format";

function dateLabel(value: string | null): string {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric" }).format(new Date(`${value.slice(0, 10)}T00:00:00`));
}

function dateTimeLabel(value: string | null): string {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" }).format(new Date(value));
}

export default async function PurchaseOrderPage({ params }: PageProps<"/purchase-orders/[id]">) {
  const user = await requirePermission("production");
  const { id: rawId } = await params;
  const id = Number(rawId);
  if (!Number.isSafeInteger(id) || id < 1) notFound();
  const po = await getPurchaseOrder(id);
  if (!po) notFound();

  const canManage = hasPermission(user, "production_manage");
  const canScan = hasPermission(user, "inward");
  const ordered = po.items.reduce((sum, item) => sum + item.quantity, 0);
  const received = po.items.reduce((sum, item) => sum + item.received, 0);
  const pending = Math.max(0, ordered - received);
  const hasScans = received > 0;
  const openForScan = ["issued", "partly_received"].includes(po.status);
  const canShowQr = ["issued", "partly_received", "closed"].includes(po.status);
  const canReviseDelivery = canManage && ["draft", "issued", "partly_received"].includes(po.status);
  const styleCount = new Set(po.items.map((item) => item.techpack_id)).size;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link href="/purchase-orders" className="text-sm font-medium text-neutral-700 hover:underline">← FOB POs</Link>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight">{po.po_number}</h1>
            <PoBadge status={po.status} />
          </div>
          <p className="mt-1 text-sm text-neutral-500">{po.jobber} · PO date {dateLabel(po.po_date)} · {styleCount} styles · {po.items.length} size lines</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {canShowQr && <Link href={`/print/purchase-orders/${po.id}/qr`} className="border border-neutral-950 bg-neutral-950 px-4 py-2.5 text-sm font-medium text-white hover:bg-neutral-800">QR sheet / print</Link>}
          {openForScan && canScan && <Link href="/inward" className="border border-neutral-300 bg-white px-4 py-2.5 text-sm font-medium hover:border-neutral-950">Scan inward</Link>}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
        <section className="border border-neutral-300 bg-white p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="font-semibold">Receipt progress</h2>
              <p className="mt-1 text-sm text-neutral-500">Counted from piece-level QR scans and manual entries.</p>
            </div>
            <p className="text-2xl font-semibold tabular-nums">{num(received)} <span className="text-base font-normal text-neutral-500">of {num(ordered)}</span></p>
          </div>
          <ProgressBar value={received} total={ordered} className="mt-4 h-2" />
          <div className="mt-4 grid grid-cols-3 gap-3 text-sm">
            <div className="border border-neutral-200 p-3"><p className="text-xs text-neutral-500">Received</p><p className="mt-1 text-lg font-semibold tabular-nums">{num(received)}</p></div>
            <div className="border border-neutral-200 p-3"><p className="text-xs text-neutral-500">Pending</p><p className="mt-1 text-lg font-semibold tabular-nums">{num(pending)}</p></div>
            <div className="border border-neutral-200 p-3"><p className="text-xs text-neutral-500">Complete</p><p className="mt-1 text-lg font-semibold tabular-nums">{ordered ? Math.round((received / ordered) * 100) : 0}%</p></div>
          </div>
          {po.status === "closed" && pending > 0 && (
            <p className="mt-4 border border-neutral-400 px-3 py-2 text-sm">Short closed with {num(pending)} pieces not received. The shortfall stays visible in reports.</p>
          )}
          {po.status === "draft" && <p className="mt-4 border border-neutral-300 bg-neutral-50 px-3 py-2 text-sm text-neutral-700">This PO is a draft. Issue it before sharing QR codes or receiving pieces.</p>}
        </section>

        <section className="border border-neutral-300 bg-white p-5">
          <h2 className="font-semibold">Jobber</h2>
          <p className="mt-2 text-sm font-medium">{po.jobber}</p>
          <dl className="mt-3 space-y-2 text-sm">
            <div className="flex justify-between gap-3"><dt className="text-neutral-500">Contact</dt><dd>{po.contact_name || "—"}</dd></div>
            <div className="flex justify-between gap-3"><dt className="text-neutral-500">Phone</dt><dd>{po.phone || "—"}</dd></div>
            <div className="flex justify-between gap-3"><dt className="text-neutral-500">Email</dt><dd className="break-all text-right">{po.email || "—"}</dd></div>
            <div className="flex justify-between gap-3"><dt className="text-neutral-500">Issued</dt><dd>{dateTimeLabel(po.issued_at)}</dd></div>
            <div className="flex justify-between gap-3"><dt className="text-neutral-500">Closed</dt><dd>{dateTimeLabel(po.closed_at)}</dd></div>
          </dl>
          {canManage ? (
            <div className="mt-4 border-t border-neutral-200 pt-4"><PoStatusActions poId={po.id} status={po.status} hasScans={hasScans} /></div>
          ) : (
            <p className="mt-4 border-t border-neutral-200 pt-4 text-xs text-neutral-500">FOB PO manage access is required to change the PO status.</p>
          )}
        </section>
      </div>

      {po.notes && <section className="border border-neutral-300 bg-white p-5"><h2 className="font-semibold">Notes</h2><p className="mt-2 whitespace-pre-wrap text-sm text-neutral-700">{po.notes}</p></section>}

      <section className="overflow-hidden border border-neutral-300 bg-white">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-neutral-300 px-5 py-4">
          <h2 className="text-sm font-semibold">PO lines and receipts</h2>
          <span className="text-xs text-neutral-500">One line per style and size</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-neutral-50 text-xs uppercase tracking-wide text-neutral-500">
              <tr>
                <th className="px-5 py-3 font-medium">Style</th>
                <th className="px-5 py-3 font-medium">Size</th>
                <th className="px-5 py-3 font-medium">PP</th>
                <th className="px-5 py-3 font-medium">Qty</th>
                <th className="px-5 py-3 font-medium">Received</th>
                <th className="px-5 py-3 font-medium">Pending</th>
                <th className="px-5 py-3 font-medium">Rate</th>
                <th className="px-5 py-3 font-medium">Delivery date</th>
                <th className="px-5 py-3 font-medium">Last scan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200">
              {po.items.map((item) => (
                <tr key={item.id} className="hover:bg-neutral-50">
                  <td className="px-5 py-4">
                    <p className="font-medium">{item.sku_label}</p>
                    <p className="mt-0.5 text-xs text-neutral-500">{item.product_name}</p>
                  </td>
                  <td className="px-5 py-4 font-medium">{item.size}</td>
                  <td className="px-5 py-4"><PpBadge status={item.pp_status} /></td>
                  <td className="px-5 py-4 tabular-nums">{num(item.quantity)}</td>
                  <td className="px-5 py-4 tabular-nums">{num(item.received)}</td>
                  <td className="px-5 py-4 tabular-nums">{num(item.pending)}</td>
                  <td className="px-5 py-4 tabular-nums">{item.rate ? Number(item.rate).toFixed(2) : "—"}<span className="block text-xs text-neutral-500">{item.operation_type || ""}</span></td>
                  <td className="px-5 py-4 text-neutral-600"><DeliveryDateCell itemId={item.id} deliveryDate={item.delivery_date} originalDeliveryDate={item.original_delivery_date} editable={canReviseDelivery} /></td>
                  <td className="px-5 py-4 text-neutral-600">{dateTimeLabel(item.last_scan_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!po.items.length && <p className="px-5 py-10 text-sm text-neutral-500">This PO has no lines.</p>}
        </div>
      </section>

      {canShowQr && (
        <p className="text-xs text-neutral-500">
          The QR sheet contains one scannable code per piece. Each code reads {po.po_number}_STYLE_SIZE_PIECE. Reprint the sheet whenever a code is damaged.
        </p>
      )}
    </div>
  );
}
