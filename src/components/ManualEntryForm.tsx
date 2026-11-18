"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef, useState } from "react";
import { scanPiece, type ProductionState } from "@/app/actions/production";
import type { ManualEntryPo } from "@/lib/production";
import { useFormErrors } from "@/lib/use-form-errors";
import { FieldError, FormAlert } from "./FormErrors";

const input = "w-full border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:border-neutral-950";
const label = "mb-1 block text-sm font-medium";

export function ManualEntryForm({ pos }: { pos: ManualEntryPo[] }) {
  const [state, action, pending] = useActionState<ProductionState, FormData>(scanPiece, {});
  const [poId, setPoId] = useState("");
  const [itemId, setItemId] = useState("");
  const pieceRef = useRef<HTMLInputElement>(null);
  const noteRef = useRef<HTMLInputElement>(null);
  const { errors, formProps, describe } = useFormErrors(state.fieldErrors);
  const selectedPo = pos.find((po) => String(po.id) === poId);
  const selectedItem = selectedPo?.items.find((item) => String(item.id) === itemId);

  useEffect(() => {
    if (state.scan) {
      if (pieceRef.current) pieceRef.current.value = "";
      if (noteRef.current) noteRef.current.value = "";
      pieceRef.current?.focus();
    }
  }, [state]);

  if (!pos.length) {
    return (
      <section className="border border-neutral-300 bg-white p-6">
        <h1 className="text-xl font-semibold tracking-tight">Manual inward entry</h1>
        <p className="mt-2 text-sm text-neutral-500">There are no issued FOB POs open for inward right now.</p>
        <Link href="/inward" className="mt-4 inline-block text-sm font-medium underline underline-offset-4">← Back to scanning</Link>
      </section>
    );
  }

  return (
    <section className="border border-neutral-950 bg-white p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Manual inward entry</h1>
          <p className="mt-1 text-sm text-neutral-500">Use this only when the QR is missing or damaged. Manual pieces are counted separately in reports.</p>
        </div>
        <Link href="/inward" className="border border-neutral-300 px-3 py-2 text-xs font-medium hover:border-neutral-950">← Scan instead</Link>
      </div>

      <form action={action} {...formProps} className="mt-5 space-y-4">
        <input type="hidden" name="mode" value="manual" />
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="manual-po" className={label}>FOB PO</label>
            <select
              id="manual-po"
              name="po_id"
              required
              value={poId}
              onChange={(event) => { setPoId(event.target.value); setItemId(""); }}
              className={input}
              {...describe("po_id", "manual-po")}
            >
              <option value="" disabled>Select PO</option>
              {pos.map((po) => <option key={po.id} value={po.id}>{po.po_number} · {po.status === "partly_received" ? "Partly received" : "Issued"}</option>)}
            </select>
            <FieldError errors={errors} name="po_id" inputId="manual-po" />
          </div>
          <div>
            <label htmlFor="manual-item" className={label}>Style and size</label>
            <select
              id="manual-item"
              name="item_id"
              required
              value={itemId}
              onChange={(event) => setItemId(event.target.value)}
              disabled={!selectedPo}
              className={input}
              {...describe("item_id", "manual-item")}
            >
              <option value="" disabled>{selectedPo ? "Select style and size" : "Select a PO first"}</option>
              {(selectedPo?.items ?? []).map((item) => (
                <option key={item.id} value={item.id}>{item.sku_label} · {item.size} · {item.received}/{item.quantity} received</option>
              ))}
            </select>
            <FieldError errors={errors} name="item_id" inputId="manual-item" />
          </div>
          <div>
            <label htmlFor="manual-piece" className={label}>Piece number</label>
            <input
              ref={pieceRef}
              id="manual-piece"
              name="piece_no"
              required
              defaultValue=""
              type="number"
              min={1}
              max={10000}
              inputMode="numeric"
              placeholder="45"
              className={input}
              {...describe("piece_no", "manual-piece")}
            />
            <FieldError errors={errors} name="piece_no" inputId="manual-piece" />
            {selectedItem && <p className="mt-1 text-xs text-neutral-500">Piece number is printed under the QR, from 001 to {String(selectedItem.quantity).padStart(3, "0")}.</p>}
          </div>
          <div>
            <label htmlFor="manual-note" className={label}>Reason / note</label>
            <input ref={noteRef} id="manual-note" name="note" defaultValue="" maxLength={300} placeholder="QR damaged" className={input} {...describe("note", "manual-note")} />
            <FieldError errors={errors} name="note" inputId="manual-note" />
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-neutral-200 pt-4">
          <p className="text-xs text-neutral-500">The piece must exist on the selected PO and must not have been received before.</p>
          <button disabled={pending || !poId || !itemId} className="border border-neutral-950 bg-neutral-950 px-5 py-2.5 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50">
            {pending ? "Recording…" : "Record manual inward"}
          </button>
        </div>
        <FormAlert message={state.error} />
        {state.scan && (
          <div className="border border-neutral-950 bg-neutral-950 p-4 text-white">
            <p className="text-xs uppercase tracking-widest text-neutral-400">Manual piece received</p>
            <p className="mt-2 font-mono text-base">{state.scan.po_number}_{state.scan.sku_label}_{state.scan.size}_{String(state.scan.piece_no).padStart(3, "0")}</p>
            <p className="mt-2 text-sm text-neutral-200">{state.scan.received} of {state.scan.ordered} pieces received · {state.scan.complete ? "PO complete" : `${state.scan.ordered - state.scan.received} pending`}</p>
          </div>
        )}
      </form>
    </section>
  );
}
