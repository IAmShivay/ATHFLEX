"use client";

import { useActionState } from "react";
import { decidePpSample, resubmitPpSample, type ProductionState } from "@/app/actions/production";
import type { PpStatus } from "@/lib/production";
import { useFormErrors } from "@/lib/use-form-errors";
import { FieldError, FormAlert } from "./FormErrors";
import { PpBadge } from "./ProductionBadges";

const button = "border border-neutral-950 px-3 py-2 text-xs font-medium transition-colors disabled:opacity-50";
const input = "mt-1.5 w-full border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:border-neutral-950";

export function PpApprovalPanel({
  techpackId,
  status,
  notes,
  decidedAt,
  decidedBy,
  canDecide,
  canResubmit,
  reworkRounds,
}: {
  techpackId: number;
  status: PpStatus;
  notes: string | null;
  decidedAt: string | null;
  decidedBy: string | null;
  canDecide: boolean;
  canResubmit: boolean;
  reworkRounds: number;
}) {
  const [state, action, pending] = useActionState<ProductionState, FormData>(decidePpSample, {});
  const [resubmitState, resubmitAction, resubmitting] = useActionState<ProductionState, FormData>(resubmitPpSample, {});
  const { errors, formProps, describe } = useFormErrors(state);
  const notesId = `pp-notes-${techpackId}`;
  return (
    <section id="pp-approval" className={`border bg-white p-5 ${status === "approved" ? "border-neutral-950" : "border-neutral-300"}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-semibold">PP sample approval</h2>
            <PpBadge status={status} />
            {reworkRounds > 0 && <span className="border border-neutral-300 px-2 py-0.5 text-xs text-neutral-600">Rework round {reworkRounds}</span>}
          </div>
          <p className="mt-1 max-w-2xl text-sm text-neutral-500">
            A style cannot be added to a FOB PO until its PP sample is checked and approved. Rejected samples stay locked while they are reworked.
          </p>
          {decidedAt && (
            <p className="mt-2 text-xs text-neutral-500">
              Last decision {new Date(decidedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata" })}
              {decidedBy ? ` by ${decidedBy}` : ""}.
            </p>
          )}
        </div>
        <div className="min-w-48 border border-neutral-200 px-3 py-2 text-xs text-neutral-600">
          <p className="font-medium text-neutral-900">{status === "approved" ? "Unlocked for FOB PO" : "Locked for FOB PO"}</p>
          <p className="mt-1">{status === "approved" ? "This style appears in the new PO picker." : "Approve the PP sample to unlock ordering."}</p>
        </div>
      </div>

      {notes && <p className="mt-4 border-l-2 border-neutral-300 pl-3 text-sm text-neutral-700">{notes}</p>}

      {status === "rejected" && (
        <div className="mt-4 border border-dashed border-neutral-950 bg-neutral-100 p-4">
          <p className="text-sm font-semibold">Rejected: rework and resubmit</p>
          <p className="mt-1 text-sm text-neutral-600">The jobber reworks the sample using the note above. Once the corrected sample is ready, resubmit it for a new approval decision.</p>
          {canResubmit ? (
            <form action={resubmitAction} className="mt-3">
              <input type="hidden" name="techpack_id" value={techpackId} />
              <button type="submit" disabled={resubmitting} className={`${button} bg-neutral-950 text-white hover:bg-neutral-800`}>
                {resubmitting ? "Resubmitting…" : "Resubmit for approval"}
              </button>
              <FormAlert message={resubmitState.error} className="mt-3" />
            </form>
          ) : (
            <p className="mt-3 text-xs text-neutral-500">Tech pack manage access is required to resubmit a sample.</p>
          )}
        </div>
      )}
      {resubmitState.success && <p role="status" className="mt-3 text-sm font-medium text-neutral-800">{resubmitState.success}</p>}

      {canDecide && (
        <form action={action} {...formProps} className="mt-4 border-t border-neutral-200 pt-4">
          <input type="hidden" name="techpack_id" value={techpackId} />
          <label className="block text-sm font-medium">
            Decision note
            <textarea id={notesId} key={notes ?? ""} name="notes" defaultValue={notes ?? ""} rows={2} maxLength={2000} className={input} placeholder="Optional when approving. Required when rejecting." {...describe("notes", notesId)} />
            <FieldError errors={errors} name="notes" inputId={notesId} />
          </label>
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="submit" name="decision" value="approved" disabled={pending} className={`${button} bg-neutral-950 text-white hover:bg-neutral-800`}>
              {status === "approved" ? "Re-approve PP sample" : "Approve PP sample"}
            </button>
            <button type="submit" name="decision" value="rejected" disabled={pending} className={`${button} bg-white text-neutral-900 hover:bg-neutral-100`}>
              Reject sample
            </button>
            {status !== "pending" && (
              <button type="submit" name="decision" value="pending" disabled={pending} className={`${button} border-neutral-300 bg-white text-neutral-600 hover:bg-neutral-50`}>
                Reset to pending
              </button>
            )}
          </div>
          <FormAlert message={state.error} className="mt-3" />
          {state.success && <p role="status" className="mt-3 text-sm font-medium text-neutral-800">{state.success}</p>}
        </form>
      )}
    </section>
  );
}
