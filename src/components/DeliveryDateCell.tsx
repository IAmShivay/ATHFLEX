"use client";

import { useActionState } from "react";
import { updateItemDeliveryDate, type ProductionState } from "@/app/actions/production";
import { useFormErrors } from "@/lib/use-form-errors";
import { FieldError, FormAlert } from "./FormErrors";

function dateLabel(value: string): string {
  return new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric" }).format(new Date(`${value}T00:00:00`));
}

export function DeliveryDateCell({
  itemId,
  deliveryDate,
  originalDeliveryDate,
  editable,
}: {
  itemId: number;
  deliveryDate: string;
  originalDeliveryDate: string;
  editable: boolean;
}) {
  const [state, action, pending] = useActionState<ProductionState, FormData>(updateItemDeliveryDate, {});
  const { errors, formProps, describe } = useFormErrors(state.fieldErrors);
  const inputId = `delivery-date-${itemId}`;
  const revised = deliveryDate !== originalDeliveryDate;

  if (!editable) {
    return (
      <div>
        <p className="text-neutral-700">{dateLabel(deliveryDate)}</p>
        {revised && <p className="mt-0.5 text-xs text-neutral-500">Original {dateLabel(originalDeliveryDate)}</p>}
      </div>
    );
  }

  return (
    <form action={action} {...formProps} className="min-w-40">
      <input type="hidden" name="item_id" value={itemId} />
      <div className="flex gap-1">
        <input
          id={inputId}
          key={deliveryDate}
          type="date"
          name="delivery_date"
          defaultValue={deliveryDate}
          required
          className="min-w-0 flex-1 border border-neutral-300 bg-white px-2 py-1 text-xs outline-none focus:border-neutral-950"
          {...describe("delivery_date", inputId)}
        />
        <button disabled={pending} className="border border-neutral-950 bg-neutral-950 px-2 py-1 text-xs font-medium text-white hover:bg-neutral-800 disabled:opacity-50">
          {pending ? "Saving…" : "Save"}
        </button>
      </div>
      <FieldError errors={errors} name="delivery_date" inputId={inputId} />
      {revised && <p className="mt-1 text-xs text-neutral-500">Original {dateLabel(originalDeliveryDate)} · on-time uses original</p>}
      <FormAlert message={state.error} className="mt-1" compact />
      {state.success && <p role="status" className="mt-1 text-xs font-medium text-neutral-800">{state.success}</p>}
    </form>
  );
}
