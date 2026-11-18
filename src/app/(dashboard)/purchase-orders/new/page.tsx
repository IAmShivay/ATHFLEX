import Link from "next/link";
import { requirePermission } from "@/lib/dal";
import { getActiveJobberOptions, getPpApprovedTechpacksForOrders } from "@/lib/production";
import { PurchaseOrderForm } from "@/components/PurchaseOrderForm";

export default async function NewPurchaseOrderPage() {
  await requirePermission("production_manage");
  const [jobbers, techpacks] = await Promise.all([getActiveJobberOptions(), getPpApprovedTechpacksForOrders()]);
  const defaultPoDate = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date());

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <Link href="/purchase-orders" className="text-sm font-medium text-neutral-700 hover:underline">← FOB POs</Link>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight">New FOB PO</h1>
          <p className="mt-1 text-sm text-neutral-500">Choose the actual jobber, then add PP-approved styles and a quantity per size.</p>
        </div>
        <div className="border border-neutral-300 bg-white px-4 py-3 text-xs text-neutral-600">
          <p><span className="font-semibold text-neutral-900">{techpacks.length}</span> PP-approved styles</p>
          <p className="mt-1"><span className="font-semibold text-neutral-900">{jobbers.length}</span> active jobbers</p>
        </div>
      </div>

      {!techpacks.length && (
        <div className="border border-neutral-400 bg-white px-5 py-4 text-sm">
          <p className="font-medium">No styles are ready for a FOB PO.</p>
          <p className="mt-1 text-neutral-600">A style must have an approved PP sample and at least one assigned jobber. Open a tech pack to complete both.</p>
          <Link href="/techpacks" className="mt-3 inline-block font-medium underline underline-offset-4">Open tech packs →</Link>
        </div>
      )}

      <PurchaseOrderForm jobbers={jobbers} techpacks={techpacks} defaultPoDate={defaultPoDate} />
    </div>
  );
}
