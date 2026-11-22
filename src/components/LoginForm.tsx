"use client";

import { useActionState } from "react";
import { login, type LoginState } from "@/app/actions/auth";
import { StoreIcon } from "@/components/icons";
import { useFormErrors } from "@/lib/use-form-errors";
import { FieldError, FormAlert } from "./FormErrors";

const labelCls = "mb-1.5 block text-sm font-medium text-[#1a1a1a]";
const inputCls =
  "w-full rounded-none border border-[#d4d4d4] bg-white px-3 py-2.5 text-sm text-[#1a1a1a] outline-none transition-shadow placeholder:text-[#737373] focus:border-neutral-600 focus:ring-2 focus:ring-neutral-600/20";

export default function LoginForm() {
  const [state, action, pending] = useActionState<LoginState, FormData>(login, {});
  const { errors, formProps, describe } = useFormErrors(state);

  return (
    <form action={action} {...formProps} className="space-y-4">
      <FormAlert message={state.error} />
      <div>
        <label htmlFor="email" className={labelCls}>
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          placeholder="you@store.com"
          className={inputCls}
          {...describe("email", "email")}
        />
        <FieldError errors={errors} name="email" inputId="email" />
      </div>
      <div>
        <label htmlFor="password" className={labelCls}>
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          placeholder="••••••••"
          className={inputCls}
          {...describe("password", "password")}
        />
        <FieldError errors={errors} name="password" inputId="password" />
      </div>
      <button
        type="submit"
        disabled={pending}
        className="flex w-full items-center justify-center gap-2 rounded-none bg-neutral-700 px-4 py-2.5 text-sm font-semibold text-white shadow-none transition-colors hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <StoreIcon className="h-4 w-4" />
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
