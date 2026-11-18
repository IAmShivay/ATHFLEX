"use client";

import { useActionState } from "react";
import { updatePurchaseOrderStatus, type ProductionState } from "@/app/actions/production";
import type { PoStatus } from "@/lib/production";
import { FormAlert } from "./FormErrors";

const primary = "border border-neutral-950 bg-neutral-950 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50";
const secondary = "border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-800 hover:border-neutral-950 disabled:opacity-50";

export function PoStatusActions({ poId, status, hasScans }: { poId: number; status: PoStatus; hasScans: boolean }) {
  const [state, action, pending] = useActionState<ProductionState, FormData>(updatePurchaseOrderStatus, {});
  const canIssue = status === "draft";
  const canClose = status === "issued" || status === "partly_received";
  const canCancel = status === "draft" || (status === "issued" && !hasScans);

  if (!canIssue && !canClose && !canCancel) {
    return <p className="text-sm text-neutral-500">{status === "cancelled" ? "This PO was cancelled." : "This PO is closed."}</p>;
  }

  return (
    <div>
      <form action={action} className="flex flex-wrap gap-2">
        <input type="hidden" name="po_id" value={poId} />
        {canIssue && <button type="submit" name="action" value="issue" disabled={pending} className={primary}>{pending ? "Updating…" : "Issue FOB PO"}</button>}
        {canClose && <button type="submit" name="action" value="close" disabled={pending} className={primary}>{pending ? "Updating…" : "Close PO"}</button>}
        {canCancel && <button type="submit" name="action" value="cancel" disabled={pending} className={secondary}>Cancel PO</button>}
      </form>
      {canClose && <p className="mt-2 text-xs text-neutral-500">Closing a partially received PO records the shortfall in the report.</p>}
      <FormAlert message={state.error} className="mt-3" />
      {state.success && <p role="status" className="mt-3 text-sm font-medium text-neutral-800">{state.success}</p>}
    </div>
  );
}
