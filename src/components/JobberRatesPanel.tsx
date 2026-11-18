"use client";

import { useActionState, useState, useTransition } from "react";
import { assignJobberToTechpack, removeTechpackJobber, type ProductionState } from "@/app/actions/production";
import type { JobberOption, TechpackJobber } from "@/lib/production";
import { useFormErrors } from "@/lib/use-form-errors";
import { FieldError, FormAlert } from "./FormErrors";

const input = "w-full border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:border-neutral-950";
const button = "border border-neutral-950 bg-neutral-950 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50";

export function JobberRatesPanel({
  techpackId,
  assignments,
  jobbers,
  canEdit,
}: {
  techpackId: number;
  assignments: TechpackJobber[];
  jobbers: JobberOption[];
  canEdit: boolean;
}) {
  const [state, action, pending] = useActionState<ProductionState, FormData>(assignJobberToTechpack, {});
  const [notice, setNotice] = useState<{ error?: string; success?: string }>({});
  const [removing, startTransition] = useTransition();
  const { errors, formProps, describe } = useFormErrors(state.fieldErrors);
  const formId = `techpack-${techpackId}-jobber`;
  const assignedIds = new Set(assignments.map((row) => row.jobber_id));
  const available = jobbers.filter((jobber) => jobber.is_active && !assignedIds.has(jobber.id));

  function remove(jobberId: number) {
    setNotice({});
    startTransition(async () => {
      try {
        const form = new FormData();
        form.set("techpack_id", String(techpackId));
        form.set("jobber_id", String(jobberId));
        const result = await removeTechpackJobber(form);
        setNotice({ error: result.error, success: result.success });
      } catch {
        setNotice({ error: "Could not remove the jobber." });
      }
    });
  }

  return (
    <section className="border border-neutral-300 bg-white p-5 sm:p-6">
      <h2 className="font-semibold">Possible jobbers</h2>
      <p className="mt-1 text-sm text-neutral-500">Assign the jobbers who can make this style, with their rate and operation. A FOB PO can only use one of these jobbers.</p>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-neutral-300 text-xs uppercase tracking-wide text-neutral-500">
            <tr>
              <th className="py-2 pr-4 font-medium">Jobber</th>
              <th className="py-2 pr-4 font-medium">Rate</th>
              <th className="py-2 pr-4 font-medium">Operation</th>
              <th className="py-2 font-medium">Status</th>
              {canEdit && <th className="py-2 text-right font-medium"> </th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-200">
            {assignments.map((row) => (
              <tr key={row.jobber_id}>
                <td className="py-3 pr-4 font-medium">{row.name}</td>
                <td className="py-3 pr-4 tabular-nums">{Number(row.rate).toFixed(2)}</td>
                <td className="py-3 pr-4">{row.operation_type}</td>
                <td className="py-3 text-xs text-neutral-500">{row.is_active ? "Active" : "Inactive"}</td>
                {canEdit && (
                  <td className="py-3 text-right">
                    <button
                      type="button"
                      onClick={() => remove(row.jobber_id)}
                      disabled={removing}
                      className="border border-neutral-300 px-2.5 py-1 text-xs hover:border-neutral-950 disabled:opacity-50"
                    >
                      Remove
                    </button>
                  </td>
                )}
              </tr>
            ))}
            {!assignments.length && (
              <tr>
                <td colSpan={canEdit ? 5 : 4} className="py-6 text-sm text-neutral-500">
                  No jobbers assigned yet. A FOB PO cannot be created for this style until at least one jobber is added.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <FormAlert message={notice.error} className="mt-3" />
      {notice.success && <p role="status" className="mt-3 text-sm text-neutral-800">{notice.success}</p>}

      {canEdit && (
        <form action={action} {...formProps} className="mt-5 border-t border-neutral-200 pt-4">
          <input type="hidden" name="techpack_id" value={techpackId} />
          <div className="grid gap-3 sm:grid-cols-[1.2fr_0.7fr_1.1fr_auto] sm:items-end">
            <label className="block text-sm font-medium">
              Jobber
              <select id={`${formId}-jobber`} name="jobber_id" required className={`${input} mt-1.5`} defaultValue="" {...describe("jobber_id", `${formId}-jobber`)}>
                <option value="" disabled>{available.length ? "Select jobber" : "No more active jobbers"}</option>
                {available.map((jobber) => <option key={jobber.id} value={jobber.id}>{jobber.name}</option>)}
                {assignments.map((row) => <option key={`assigned-${row.jobber_id}`} value={row.jobber_id}>{row.name} — update rate</option>)}
              </select>
              <FieldError errors={errors} name="jobber_id" inputId={`${formId}-jobber`} />
            </label>
            <label className="block text-sm font-medium">
              Rate
              <input id={`${formId}-rate`} name="rate" required inputMode="decimal" placeholder="450.00" className={`${input} mt-1.5`} {...describe("rate", `${formId}-rate`)} />
              <FieldError errors={errors} name="rate" inputId={`${formId}-rate`} />
            </label>
            <label className="block text-sm font-medium">
              Operation type
              <input id={`${formId}-operation`} name="operation_type" required maxLength={120} placeholder="Stitching" className={`${input} mt-1.5`} {...describe("operation_type", `${formId}-operation`)} />
              <FieldError errors={errors} name="operation_type" inputId={`${formId}-operation`} />
            </label>
            <button disabled={pending} className={button}>{pending ? "Saving…" : "Save jobber"}</button>
          </div>
          <FormAlert message={state.error} className="mt-3" />
          {state.success && <p role="status" className="mt-3 text-sm font-medium text-neutral-800">{state.success}</p>}
        </form>
      )}
      {!canEdit && <p className="mt-4 text-xs text-neutral-500">FOB PO manage access is required to change jobber rates.</p>}
    </section>
  );
}
