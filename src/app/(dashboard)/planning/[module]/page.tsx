import Link from "next/link";
import { notFound } from "next/navigation";
import { NAV_GROUPS } from "@/lib/navigation";
import { PHASE2_WORKFLOW } from "@/lib/workflow";

const PLANNING_GROUP_KEY = "planning";
const PO_CREATION_STEP = "po-creation";

export default async function PlanningModulePage({ params }: PageProps<"/planning/[module]">) {
  const { module: slug } = await params;
  const group = NAV_GROUPS.find((entry) => entry.key === PLANNING_GROUP_KEY);
  const item = group?.items.find((entry) => entry.href === `/planning/${slug}`);
  if (!item) notFound();

  return (
    <div className="space-y-5">
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-neutral-700">Phase 2 · Demand planning &amp; inventory</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">{item.label}</h1>
        <p className="mt-1 max-w-2xl text-sm text-neutral-500">{item.summary}</p>
      </div>

      <section className="border border-dashed border-neutral-300 bg-white p-6">
        <span className="border border-neutral-300 px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide text-neutral-500">Coming soon</span>
        <p className="mt-3 text-sm text-neutral-700">This module is reserved in the navigation. Phase 1 stays unchanged when it is added, because it will build on the same SKU master, PO system and manufacturing flow.</p>
      </section>

      <section className="border border-neutral-300 bg-white p-5">
        <h2 className="font-semibold">Where it fits</h2>
        <ol className="mt-4 flex flex-wrap items-center gap-2 text-sm">
          {PHASE2_WORKFLOW.map((step, index) => {
            const current = step.key === item.key;
            return (
              <li key={step.key} className="flex items-center gap-2">
                <span className={`border px-3 py-2 ${current ? "border-neutral-950 bg-neutral-950 text-white" : "border-neutral-300 bg-neutral-50 text-neutral-700"}`}>{step.label}</span>
                {index < PHASE2_WORKFLOW.length - 1 && <span aria-hidden className="text-neutral-400">→</span>}
              </li>
            );
          })}
        </ol>
        <p className="mt-4 text-xs text-neutral-500">
          A PO can be raised two ways: manually in Phase 1, or from a forecast in Phase 2. Both end in the same {PHASE2_WORKFLOW.find((step) => step.key === PO_CREATION_STEP)?.label} flow, then QR codes, inward scanning and reports.
        </p>
        <Link href="/purchase-orders" className="mt-3 inline-block text-sm font-medium underline underline-offset-4">Open FOB POs →</Link>
      </section>
    </div>
  );
}
