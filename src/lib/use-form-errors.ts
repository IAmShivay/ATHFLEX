"use client";

import { useEffect, useState, type FormEvent, type RefObject } from "react";
import { FIELD_MESSAGES, type FieldErrors } from "@/lib/form-errors";

type Control = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;

function isControl(element: Element): element is Control {
  return element instanceof HTMLInputElement || element instanceof HTMLSelectElement || element instanceof HTMLTextAreaElement;
}

function messageFor(control: Control): string {
  const { validity } = control;
  if (validity.valueMissing) return control instanceof HTMLSelectElement ? FIELD_MESSAGES.select : FIELD_MESSAGES.required;
  if (validity.typeMismatch) {
    if (control.type === "email") return FIELD_MESSAGES.email;
    if (control.type === "url") return FIELD_MESSAGES.url;
  }
  if (!(control instanceof HTMLSelectElement)) {
    if (validity.tooShort) return FIELD_MESSAGES.tooShort(control.minLength);
    if (validity.tooLong) return FIELD_MESSAGES.tooLong(control.maxLength);
  }
  if (control instanceof HTMLInputElement) {
    if (validity.rangeUnderflow) return FIELD_MESSAGES.min(control.min);
    if (validity.rangeOverflow) return FIELD_MESSAGES.max(control.max);
    if (validity.stepMismatch) return FIELD_MESSAGES.wholeNumber;
  }
  return control.validationMessage || FIELD_MESSAGES.invalid;
}

function collectInvalid(form: HTMLFormElement): { errors: FieldErrors; first?: Control } {
  const errors: FieldErrors = {};
  let first: Control | undefined;
  for (const element of Array.from(form.elements)) {
    if (!isControl(element) || !element.name || !element.willValidate || element.validity.valid || errors[element.name]) continue;
    errors[element.name] = messageFor(element);
    first ??= element;
  }
  return { errors, first };
}

type Dismissed = { source?: FieldErrors; names: string[] };

export function useFormErrors(serverErrors?: FieldErrors, formRef?: RefObject<HTMLFormElement | null>) {
  const [clientErrors, setClientErrors] = useState<FieldErrors>({});
  const [dismissed, setDismissed] = useState<Dismissed>({ names: [] });

  useEffect(() => {
    const form = formRef?.current;
    if (!serverErrors || !form) return;
    const invalid = form.querySelector<HTMLElement>('[aria-invalid="true"]');
    if (invalid) invalid.focus();
    else form.querySelector<HTMLElement>('[role="alert"]')?.scrollIntoView({ block: "center" });
  }, [serverErrors, formRef]);

  const hidden = dismissed.source === serverErrors ? dismissed.names : [];
  const errors: FieldErrors = {
    ...Object.fromEntries(Object.entries(serverErrors ?? {}).filter(([name]) => !hidden.includes(name))),
    ...clientErrors,
  };

  const dismiss = (name: string) => {
    setClientErrors((current) => (name in current ? Object.fromEntries(Object.entries(current).filter(([key]) => key !== name)) : current));
    setDismissed((current) => {
      const names = current.source === serverErrors ? current.names : [];
      return names.includes(name) ? current : { source: serverErrors, names: [...names, name] };
    });
  };

  const formProps = {
    noValidate: true,
    onSubmit: (event: FormEvent<HTMLFormElement>) => {
      const { errors: found, first } = collectInvalid(event.currentTarget);
      setClientErrors(found);
      if (first) {
        event.preventDefault();
        first.focus();
      }
    },
    onInput: (event: FormEvent<HTMLFormElement>) => {
      const target = event.target;
      if (target instanceof Element && isControl(target) && target.name) dismiss(target.name);
    },
  };

  const describe = (name: string, inputId: string) =>
    errors[name] ? ({ "aria-invalid": true, "aria-describedby": `${inputId}-error` } as const) : {};

  return { errors, formProps, describe, dismiss };
}
