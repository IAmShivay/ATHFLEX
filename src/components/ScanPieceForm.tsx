"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef } from "react";
import { scanPiece, type ProductionState } from "@/app/actions/production";
import { useFormErrors } from "@/lib/use-form-errors";
import { FieldError, FormAlert } from "./FormErrors";

const input = "w-full border border-neutral-300 bg-white px-4 py-3 font-mono text-base outline-none focus:border-neutral-950";

export function ScanPieceForm() {
  const [state, action, pending] = useActionState<ProductionState, FormData>(scanPiece, {});
  const formRef = useRef<HTMLFormElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { errors, formProps, describe } = useFormErrors(state, formRef);

  useEffect(() => {
    if (state.scan) {
      formRef.current?.reset();
      inputRef.current?.focus();
    }
  }, [state]);

  return (
    <section className="border border-neutral-950 bg-white p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">QR &amp; Inward</h1>
          <p className="mt-1 text-sm text-neutral-500">Scan each piece QR. The piece number, PO, style and size are read from the code.</p>
        </div>
        <Link href="/inward/manual" className="border border-neutral-300 px-3 py-2 text-xs font-medium hover:border-neutral-950">QR missing or damaged? Manual entry →</Link>
      </div>

      <form ref={formRef} action={action} {...formProps} className="mt-5">
        <input type="hidden" name="mode" value="scan" />
        <label htmlFor="scan-code" className="mb-1 block text-sm font-medium">Piece QR code</label>
        <div className="flex flex-wrap gap-2">
          <input
            ref={inputRef}
            id="scan-code"
            name="code"
            defaultValue=""
            autoFocus
            required
            autoComplete="off"
            spellCheck={false}
            maxLength={500}
            placeholder="FOB-0042_AF1023-Black-Jogger_M_001"
            className={`${input} min-w-0 flex-1`}
            {...describe("code", "scan-code")}
          />
          <button disabled={pending} className="border border-neutral-950 bg-neutral-950 px-5 py-3 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50">
            {pending ? "Checking…" : "Receive piece"}
          </button>
        </div>
        <FieldError errors={errors} name="code" inputId="scan-code" />
        <p className="mt-2 text-xs text-neutral-500">A USB scanner works as a keyboard: scan, then it sends Enter. The field stays ready for the next piece.</p>
      </form>

      <FormAlert message={state.error} className="mt-4" />
      {state.scan && (
        <div className="mt-4 border border-neutral-950 bg-neutral-950 p-4 text-white">
          <p className="text-xs uppercase tracking-widest text-neutral-400">Last piece received</p>
          <p className="mt-2 font-mono text-lg">{state.scan.po_number}_{state.scan.sku_label}_{state.scan.size}_{String(state.scan.piece_no).padStart(3, "0")}</p>
          <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-sm text-neutral-200">
            <span>{state.scan.entry_type === "manual" ? "Manual entry" : "Scanned"}</span>
            <span>{state.scan.received} of {state.scan.ordered} pieces received</span>
            <span>{state.scan.complete ? "PO complete" : `${state.scan.ordered - state.scan.received} pending`}</span>
          </div>
          <Link href={`/purchase-orders/${state.scan.po_id}`} className="mt-3 inline-block text-xs font-medium underline underline-offset-4">Open {state.scan.po_number} →</Link>
        </div>
      )}
    </section>
  );
}
