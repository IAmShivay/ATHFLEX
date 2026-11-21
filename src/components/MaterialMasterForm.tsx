"use client";

import { useActionState } from "react";
import { saveMaterialMaster, type MaterialMasterState } from "@/app/actions/materials";
import { MATERIAL_KINDS, type MaterialKind } from "@/lib/material-kinds";
import { useFormErrors } from "@/lib/use-form-errors";
import { FieldError, FormAlert } from "./FormErrors";

const input = "w-full border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:border-neutral-950";

export default function MaterialMasterForm({ kind }: { kind: MaterialKind }) {
  const [state, action, pending] = useActionState<MaterialMasterState, FormData>(saveMaterialMaster, {});
  const { errors, formProps, describe } = useFormErrors(state);
  const meta = MATERIAL_KINDS[kind];
  const inputId = `${kind}-master-name`;
  return (
    <form action={action} {...formProps} className="flex flex-wrap items-start gap-3">
      <input type="hidden" name="kind" value={kind} />
      <div className="min-w-64 flex-1">
        <label htmlFor={inputId} className="mb-1 block text-sm font-medium">{meta.label} name</label>
        <input id={inputId} name="name" required maxLength={120} placeholder={meta.example} className={input} {...describe("name", inputId)} />
        <FieldError errors={errors} name="name" inputId={inputId} />
        <p className="mt-1 text-xs text-neutral-500">{meta.hint}</p>
      </div>
      <button disabled={pending} className="mt-6 border border-neutral-950 bg-neutral-950 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50">
        {pending ? "Adding…" : `Add ${meta.label.toLowerCase()}`}
      </button>
      <div className="w-full">
        <FormAlert message={state.error} />
        {state.success && <p role="status" className="text-sm font-medium text-neutral-800">{state.success}</p>}
      </div>
    </form>
  );
}
