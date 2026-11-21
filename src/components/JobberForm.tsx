"use client";

import { useActionState } from "react";
import { saveJobber, type ProductionState } from "@/app/actions/production";
import type { Jobber } from "@/lib/production";
import { useFormErrors } from "@/lib/use-form-errors";
import { FieldError, FormAlert } from "./FormErrors";

const input = "w-full border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:border-neutral-950";
const label = "mb-1 block text-sm font-medium";

export function JobberForm({ jobber }: { jobber?: Jobber }) {
  const [state, action, pending] = useActionState<ProductionState, FormData>(saveJobber, {});
  const { errors, formProps, describe } = useFormErrors(state);
  const id = jobber ? `jobber-${jobber.id}` : "new-jobber";
  return (
    <form action={action} {...formProps} className="space-y-3">
      {jobber && <input type="hidden" name="id" value={jobber.id} />}
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor={`${id}-name`} className={label}>Jobber name</label>
          <input id={`${id}-name`} name="name" defaultValue={jobber?.name} required maxLength={120} className={input} placeholder="Jobber A" {...describe("name", `${id}-name`)} />
          <FieldError errors={errors} name="name" inputId={`${id}-name`} />
        </div>
        <div>
          <label htmlFor={`${id}-contact`} className={label}>Contact person</label>
          <input id={`${id}-contact`} name="contact_name" defaultValue={jobber?.contact_name ?? ""} maxLength={120} className={input} {...describe("contact_name", `${id}-contact`)} />
          <FieldError errors={errors} name="contact_name" inputId={`${id}-contact`} />
        </div>
        <div>
          <label htmlFor={`${id}-phone`} className={label}>Phone</label>
          <input id={`${id}-phone`} name="phone" defaultValue={jobber?.phone ?? ""} maxLength={40} className={input} {...describe("phone", `${id}-phone`)} />
          <FieldError errors={errors} name="phone" inputId={`${id}-phone`} />
        </div>
        <div>
          <label htmlFor={`${id}-email`} className={label}>Email</label>
          <input id={`${id}-email`} name="email" type="email" defaultValue={jobber?.email ?? ""} maxLength={254} className={input} {...describe("email", `${id}-email`)} />
          <FieldError errors={errors} name="email" inputId={`${id}-email`} />
        </div>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="is_active" defaultChecked={jobber?.is_active ?? true} className="accent-neutral-950" />
        Active for new FOB POs
      </label>
      <button disabled={pending} className="border border-neutral-950 bg-neutral-950 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50">
        {pending ? "Saving…" : jobber ? "Save jobber" : "Add jobber"}
      </button>
      <FormAlert message={state.error} />
      {state.success && <p role="status" className="text-sm font-medium text-neutral-800">{state.success}</p>}
    </form>
  );
}
