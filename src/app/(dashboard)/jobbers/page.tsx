import Link from "next/link";
import { requirePermission } from "@/lib/dal";
import { hasPermission } from "@/lib/permissions";
import { getJobbers } from "@/lib/production";
import { setJobberActive } from "@/app/actions/production";
import { JobberForm } from "@/components/JobberForm";
import ActionButton from "@/components/ActionButton";

export default async function JobbersPage() {
  const user = await requirePermission("production");
  const canManage = hasPermission(user, "production_manage");
  const jobbers = await getJobbers();
  const active = jobbers.filter((jobber) => jobber.is_active).length;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <Link href="/purchase-orders" className="text-sm font-medium text-neutral-700 hover:underline">← FOB POs</Link>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight">Jobbers</h1>
          <p className="mt-1 text-sm text-neutral-500">The jobber master list. Rates and operations are assigned per style on the tech pack.</p>
        </div>
        <div className="border border-neutral-300 bg-white px-4 py-3 text-xs text-neutral-600">
          <p><span className="font-semibold text-neutral-900">{active}</span> active</p>
          <p className="mt-1">{jobbers.length} total</p>
        </div>
      </div>

      {canManage && <section className="border border-neutral-300 bg-white p-5"><h2 className="mb-4 font-semibold">Add a jobber</h2><JobberForm /></section>}

      <section className="border border-neutral-300 bg-white">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-neutral-300 px-5 py-4">
          <h2 className="text-sm font-semibold">Jobber list</h2>
          <span className="text-xs text-neutral-500">{jobbers.length} records</span>
        </div>
        <div className="divide-y divide-neutral-200">
          {jobbers.map((jobber) => (
            <div key={jobber.id} className="px-5 py-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold">{jobber.name}</h3>
                    <span className={`border px-2 py-0.5 text-xs ${jobber.is_active ? "border-neutral-950 bg-neutral-950 text-white" : "border-neutral-300 bg-white text-neutral-500"}`}>{jobber.is_active ? "Active" : "Inactive"}</span>
                  </div>
                  <p className="mt-1 text-xs text-neutral-500">{jobber.contact_name || "No contact"} · {jobber.phone || "No phone"} · {jobber.email || "No email"}</p>
                  <p className="mt-1 text-xs text-neutral-500">{jobber.techpack_count} styles · {jobber.open_po_count} open POs</p>
                </div>
                {canManage && (
                  <form action={setJobberActive}>
                    <input type="hidden" name="id" value={jobber.id} />
                    <input type="hidden" name="active" value={jobber.is_active ? "false" : "true"} />
                    <ActionButton pendingLabel="Saving…" className={`border px-3 py-1.5 text-xs font-medium ${jobber.is_active ? "border-neutral-300 bg-white text-neutral-700 hover:border-neutral-950" : "border-neutral-950 bg-neutral-950 text-white hover:bg-neutral-800"}`}>
                      {jobber.is_active ? "Deactivate" : "Activate"}
                    </ActionButton>
                  </form>
                )}
              </div>
              {canManage && <details className="mt-3"><summary className="cursor-pointer text-xs font-medium text-neutral-600">Edit jobber details</summary><div className="mt-4 max-w-3xl border-t border-neutral-200 pt-4"><JobberForm jobber={jobber} /></div></details>}
            </div>
          ))}
          {!jobbers.length && <div className="px-5 py-12 text-center"><p className="font-medium">No jobbers yet</p><p className="mt-1 text-sm text-neutral-500">Add the first jobber, then assign it with a rate on a tech pack.</p></div>}
        </div>
      </section>

      {!canManage && <p className="text-xs text-neutral-500">FOB PO manage access is required to add or edit jobbers.</p>}
    </div>
  );
}
