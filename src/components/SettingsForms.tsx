"use client";

import { useActionState } from "react";
import {
  changePassword,
  updateProfile,
  updateStoreInfo,
  type FormState,
} from "@/app/actions/settings";
import { useFormErrors } from "@/lib/use-form-errors";
import { FieldError, FormAlert } from "./FormErrors";

const inputCls =
  "w-full rounded-none border border-[#d4d4d4] bg-white px-3 py-2.5 text-sm text-[#1a1a1a] outline-none transition-shadow placeholder:text-[#737373] focus:border-neutral-600 focus:ring-2 focus:ring-neutral-600/20";
const labelCls = "mb-1.5 block text-sm font-medium text-[#1a1a1a]";
const btnCls =
  "rounded-none bg-neutral-700 px-4 py-2.5 text-sm font-semibold text-white shadow-none transition-colors hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-60";

function Notice({ state }: { state: FormState }) {
  if (state.error) return <FormAlert message={state.error} />;
  if (state.success)
    return (
      <p className="rounded-none bg-neutral-50 px-3 py-2 text-sm text-neutral-700 ring-1 ring-inset ring-neutral-600/10">
        {state.success}
      </p>
    );
  return null;
}

export function StoreInfoForm({
  initial,
}: {
  initial: { store_name: string; store_email: string; currency: string; timezone: string };
}) {
  const [state, action, pending] = useActionState<FormState, FormData>(updateStoreInfo, {});
  const { errors, formProps, describe } = useFormErrors(state);
  return (
    <form action={action} {...formProps} className="space-y-4">
      <Notice state={state} />
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="store_name" className={labelCls}>
            Store name
          </label>
          <input id="store_name" name="store_name" defaultValue={initial.store_name} required className={inputCls} {...describe("store_name", "store_name")} />
          <FieldError errors={errors} name="store_name" inputId="store_name" />
        </div>
        <div>
          <label htmlFor="store_email" className={labelCls}>
            Sender email
          </label>
          <input
            id="store_email"
            name="store_email"
            type="email"
            defaultValue={initial.store_email}
            required
            className={inputCls}
            {...describe("store_email", "store_email")}
          />
          <FieldError errors={errors} name="store_email" inputId="store_email" />
        </div>
        <div>
          <label htmlFor="currency" className={labelCls}>
            Currency
          </label>
          <select id="currency" name="currency" defaultValue={initial.currency} className={inputCls}>
            <option value="USD">USD — US Dollar</option>
            <option value="EUR">EUR — Euro</option>
            <option value="GBP">GBP — British Pound</option>
            <option value="INR">INR — Indian Rupee</option>
            <option value="AED">AED — UAE Dirham</option>
          </select>
        </div>
        <div>
          <label htmlFor="timezone" className={labelCls}>
            Timezone
          </label>
          <select id="timezone" name="timezone" defaultValue={initial.timezone} className={inputCls}>
            <option value="Asia/Kolkata">Asia/Kolkata</option>
            <option value="UTC">UTC</option>
            <option value="America/New_York">America/New_York</option>
            <option value="Europe/London">Europe/London</option>
            <option value="Australia/Sydney">Australia/Sydney</option>
          </select>
        </div>
      </div>
      <button type="submit" disabled={pending} className={btnCls}>
        {pending ? "Saving…" : "Save store details"}
      </button>
    </form>
  );
}

export function ProfileForm({ initial }: { initial: { name: string; email: string } }) {
  const [state, action, pending] = useActionState<FormState, FormData>(updateProfile, {});
  const { errors, formProps, describe } = useFormErrors(state);
  return (
    <form action={action} {...formProps} className="space-y-4">
      <Notice state={state} />
      <div>
        <label htmlFor="name" className={labelCls}>
          Full name
        </label>
        <input id="name" name="name" defaultValue={initial.name} required className={inputCls} {...describe("name", "name")} />
        <FieldError errors={errors} name="name" inputId="name" />
      </div>
      <div>
        <label htmlFor="profile_email" className={labelCls}>
          Email
        </label>
        <input id="profile_email" defaultValue={initial.email} disabled className={`${inputCls} bg-[#fafafa] text-[#737373]`} />
        <p className="mt-1 text-xs text-[#737373]">Email is your login and cannot be changed here.</p>
      </div>
      <button type="submit" disabled={pending} className={btnCls}>
        {pending ? "Saving…" : "Save profile"}
      </button>
    </form>
  );
}

export function PasswordForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(changePassword, {});
  const { errors, formProps, describe } = useFormErrors(state);
  return (
    <form action={action} {...formProps} className="space-y-4">
      <Notice state={state} />
      <div>
        <label htmlFor="current_password" className={labelCls}>
          Current password
        </label>
        <input id="current_password" name="current_password" type="password" required autoComplete="current-password" className={inputCls} {...describe("current_password", "current_password")} />
        <FieldError errors={errors} name="current_password" inputId="current_password" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="new_password" className={labelCls}>
            New password
          </label>
          <input id="new_password" name="new_password" type="password" required minLength={12} maxLength={256} autoComplete="new-password" className={inputCls} {...describe("new_password", "new_password")} />
          <FieldError errors={errors} name="new_password" inputId="new_password" />
        </div>
        <div>
          <label htmlFor="confirm_password" className={labelCls}>
            Confirm new password
          </label>
          <input id="confirm_password" name="confirm_password" type="password" required minLength={12} maxLength={256} autoComplete="new-password" className={inputCls} {...describe("confirm_password", "confirm_password")} />
          <FieldError errors={errors} name="confirm_password" inputId="confirm_password" />
        </div>
      </div>
      <button type="submit" disabled={pending} className={btnCls}>
        {pending ? "Changing…" : "Change password"}
      </button>
    </form>
  );
}
