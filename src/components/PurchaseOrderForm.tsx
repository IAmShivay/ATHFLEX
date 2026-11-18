"use client";

import Link from "next/link";
import { useActionState, useRef, useState } from "react";
import { createPurchaseOrder, type ProductionState } from "@/app/actions/production";
import type { JobberOption, TechpackJobberable } from "@/lib/production";
import { useFormErrors } from "@/lib/use-form-errors";
import { FieldError, FormAlert } from "./FormErrors";

const input = "w-full border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:border-neutral-950";
const label = "mb-1 block text-sm font-medium";

export function PurchaseOrderForm({
  jobbers,
  techpacks,
  defaultPoDate,
}: {
  jobbers: JobberOption[];
  techpacks: TechpackJobberable[];
  defaultPoDate: string;
}) {
  const [state, action, pending] = useActionState<ProductionState, FormData>(createPurchaseOrder, {});
  const [jobberId, setJobberId] = useState("");
  const formRef = useRef<HTMLFormElement>(null);
  const { errors, formProps, describe } = useFormErrors(state.fieldErrors, formRef);
  const selectedJobber = jobbers.find((jobber) => String(jobber.id) === jobberId);
  const visible = jobberId ? techpacks.filter((pack) => pack.jobber_ids.includes(Number(jobberId))) : [];

  if (!jobbers.length) {
    return (
      <section className="border border-neutral-300 bg-white p-6">
        <h2 className="font-semibold">No active jobbers</h2>
        <p className="mt-1 text-sm text-neutral-500">Create a jobber before raising a FOB PO.</p>
        <Link href="/jobbers" className="mt-4 inline-block border border-neutral-950 bg-neutral-950 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800">Add a jobber →</Link>
      </section>
    );
  }

  return (
    <form ref={formRef} action={action} {...formProps} className="space-y-5">
      <section className="border border-neutral-300 bg-white p-5">
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label htmlFor="po-jobber" className={label}>Jobber</label>
            <select id="po-jobber" name="jobber_id" required value={jobberId} onChange={(event) => setJobberId(event.target.value)} className={input} {...describe("jobber_id", "po-jobber")}>
              <option value="" disabled>Select jobber</option>
              {jobbers.map((jobber) => <option key={jobber.id} value={jobber.id}>{jobber.name}</option>)}
            </select>
            <FieldError errors={errors} name="jobber_id" inputId="po-jobber" />
          </div>
          <div>
            <label htmlFor="po-date" className={label}>PO date</label>
            <input id="po-date" name="po_date" type="date" required defaultValue={defaultPoDate} className={input} {...describe("po_date", "po-date")} />
            <FieldError errors={errors} name="po_date" inputId="po-date" />
          </div>
          <div>
            <label htmlFor="po-notes" className={label}>Notes</label>
            <input id="po-notes" name="notes" maxLength={2000} placeholder="Optional" className={input} {...describe("notes", "po-notes")} />
            <FieldError errors={errors} name="notes" inputId="po-notes" />
          </div>
        </div>
        <p className="mt-3 text-xs text-neutral-500">Only styles with an approved PP sample and this jobber on their possible-jobber list are shown. Lead time is counted from the PO date.</p>
      </section>

      {!jobberId && (
        <section className="border border-dashed border-neutral-300 bg-white p-8 text-center">
          <p className="font-medium">Select a jobber to see the approved styles</p>
          <p className="mt-1 text-sm text-neutral-500">The PO uses the jobber&apos;s actual rate and operation from each style.</p>
        </section>
      )}

      {jobberId && !visible.length && (
        <section className="border border-neutral-300 bg-white p-6">
          <p className="font-medium">No approved styles list this jobber</p>
          <p className="mt-1 text-sm text-neutral-500">Approve the PP sample and add the jobber with a rate on the tech pack. Then return here.</p>
          <Link href="/techpacks" className="mt-4 inline-block text-sm font-medium underline underline-offset-4">Open tech packs →</Link>
        </section>
      )}

      {visible.map((pack) => {
        const rate = pack.jobbers.find((jobber) => jobber.id === Number(jobberId));
        return (
          <section key={pack.id} className="border border-neutral-300 bg-white p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="font-semibold">{pack.name}</h2>
                <p className="mt-1 text-xs text-neutral-500">{pack.sku_label} · {pack.code} · {pack.color_family}</p>
                {rate && <p className="mt-1 text-xs text-neutral-500">Rate {Number(rate.rate).toFixed(2)} · {rate.operation_type}</p>}
              </div>
              <label className="text-sm font-medium">
                Delivery date
                <input id={`delivery-${pack.id}`} type="date" name={`delivery_${pack.id}`} className={`${input} mt-1.5 w-auto`} {...describe(`delivery_${pack.id}`, `delivery-${pack.id}`)} />
                <FieldError errors={errors} name={`delivery_${pack.id}`} inputId={`delivery-${pack.id}`} />
              </label>
            </div>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-neutral-300 text-xs uppercase tracking-wide text-neutral-500">
                  <tr>
                    <th className="py-2 pr-4 font-medium">Size</th>
                    {pack.sizes.map((size) => <th key={size} className="min-w-20 py-2 pr-3 font-medium">{size}</th>)}
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="py-3 pr-4 text-xs text-neutral-500">Quantity</td>
                    {pack.sizes.map((size) => (
                      <td key={size} className="py-3 pr-3">
                        <input
                          id={`qty-${pack.id}-${size}`}
                          name={`qty_${pack.id}_${size}`}
                          type="number"
                          min={0}
                          max={10000}
                          step={1}
                          inputMode="numeric"
                          placeholder="0"
                          aria-label={`${pack.sku_label} ${size} quantity`}
                          className="w-20 border border-neutral-300 bg-white px-2 py-1.5 text-sm tabular-nums outline-none focus:border-neutral-950"
                          {...describe(`qty_${pack.id}_${size}`, `qty-${pack.id}-${size}`)}
                        />
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
            {pack.sizes.map((size) => <FieldError key={size} errors={errors} name={`qty_${pack.id}_${size}`} inputId={`qty-${pack.id}-${size}`} prefix={`${size}: `} />)}
            {!pack.sizes.length && <p className="mt-3 text-sm text-neutral-500">This style has no ERP sizes yet. Add SKU combinations first.</p>}
          </section>
        );
      })}

      {jobberId && visible.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 border border-neutral-300 bg-white p-5">
          <div>
            <p className="text-sm font-medium">Create the PO as a draft</p>
            <p className="mt-1 text-xs text-neutral-500">Issue it after checking quantities. One QR is generated for every piece.</p>
          </div>
          <button disabled={pending} className="border border-neutral-950 bg-neutral-950 px-5 py-2.5 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50">
            {pending ? "Creating PO…" : "Create draft FOB PO"}
          </button>
        </div>
      )}

      <FormAlert message={state.error} />
      {selectedJobber && <p className="sr-only">Creating PO for {selectedJobber.name}</p>}
    </form>
  );
}
