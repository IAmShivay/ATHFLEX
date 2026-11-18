"use client";

import { useActionState, useState } from "react";
import { saveUser, type UserFormState } from "@/app/actions/users";
import { PERMISSIONS } from "@/lib/permissions";
import { useFormErrors } from "@/lib/use-form-errors";
import { FieldError, FormAlert } from "./FormErrors";

export type ManagedUser = {
  id: number;
  name: string;
  email: string;
  role: string;
  permissions: string[];
  is_active: boolean;
};

const input = "w-full rounded-none border border-[#dcdcdc] bg-white px-3 py-2 text-sm outline-none focus:border-neutral-600 focus:ring-2 focus:ring-neutral-600/20";
const label = "mb-1 block text-sm font-medium text-[#1a1a1a]";

export default function UserForm({ user }: { user?: ManagedUser }) {
  const [state, action, pending] = useActionState<UserFormState, FormData>(saveUser, {});
  const [role, setRole] = useState(user?.role === "admin" ? "admin" : "staff");
  const { errors, formProps, describe } = useFormErrors(state.fieldErrors);
  const prefix = user ? `user-${user.id}` : "new-user";
  return (
    <form action={action} {...formProps} className="space-y-4">
      {user && <input type="hidden" name="id" value={user.id} />}
      <FormAlert message={state.error} />
      {state.success && <p role="status" className="rounded-none bg-neutral-50 px-3 py-2 text-sm text-neutral-700">{state.success}</p>}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor={`${prefix}-name`} className={label}>Full name</label>
          <input id={`${prefix}-name`} name="name" defaultValue={user?.name} required maxLength={120} className={input} {...describe("name", `${prefix}-name`)} />
          <FieldError errors={errors} name="name" inputId={`${prefix}-name`} />
        </div>
        <div>
          <label htmlFor={`${prefix}-email`} className={label}>Email</label>
          <input id={`${prefix}-email`} name="email" type="email" defaultValue={user?.email} required maxLength={254} className={input} {...describe("email", `${prefix}-email`)} />
          <FieldError errors={errors} name="email" inputId={`${prefix}-email`} />
        </div>
        <div>
          <label htmlFor={`${prefix}-role`} className={label}>Role</label>
          <select id={`${prefix}-role`} name="role" value={role} onChange={(e) => setRole(e.target.value)} className={input} {...describe("role", `${prefix}-role`)}>
            <option value="staff">Staff — selected access</option>
            <option value="admin">Administrator — full access</option>
          </select>
          <FieldError errors={errors} name="role" inputId={`${prefix}-role`} />
        </div>
        <div>
          <label htmlFor={`${prefix}-password`} className={label}>{user ? "Reset password (optional)" : "Initial password"}</label>
          <input id={`${prefix}-password`} name="password" type="password" autoComplete="new-password" required={!user} minLength={12} maxLength={256} className={input} {...describe("password", `${prefix}-password`)} />
          <FieldError errors={errors} name="password" inputId={`${prefix}-password`} />
          <p className="mt-1 text-xs text-[#737373]">At least 12 characters. Share it securely; the user can change it in Settings.</p>
        </div>
      </div>
      <label className="flex items-center gap-2 text-sm font-medium">
        <input type="checkbox" name="is_active" defaultChecked={user?.is_active ?? true} className="accent-neutral-700" /> Account active
      </label>
      {role === "admin" ? (
        <p className="rounded-none bg-neutral-50 px-3 py-2 text-sm text-neutral-900">Administrators have full access, including user management and Shopify controls.</p>
      ) : (
        <fieldset className="space-y-2 rounded-none border border-[#d4d4d4] p-4">
          <legend className="px-1 text-sm font-semibold">Staff permissions</legend>
          <p className="text-xs text-[#737373]">Account settings remain available even when no areas are selected.</p>
          {PERMISSIONS.map((permission) => (
            <label key={permission.key} className="flex items-start gap-2 rounded-none py-1 text-sm">
              <input type="checkbox" name="permissions" value={permission.key} defaultChecked={user?.permissions.includes(permission.key)} className="mt-1 accent-neutral-700" />
              <span><span className="font-medium">{permission.label}</span><span className="block text-xs text-[#737373]">{permission.description}</span></span>
            </label>
          ))}
          <FieldError errors={errors} name="permissions" inputId={`${prefix}-permissions`} />
        </fieldset>
      )}
      <button disabled={pending} className="rounded-none bg-neutral-700 px-4 py-2 text-sm font-semibold text-white hover:bg-neutral-800 disabled:opacity-60">
        {pending ? "Saving…" : user ? "Save changes" : "Create user"}
      </button>
    </form>
  );
}
