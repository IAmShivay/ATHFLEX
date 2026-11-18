import type { Metadata } from "next";
import LoginForm from "@/components/LoginForm";
import { StoreIcon } from "@/components/icons";

export const metadata: Metadata = {
  title: "Sign in · AthFlex Admin",
};

export default function LoginPage() {
  return (
    <main className="grid min-h-screen lg:grid-cols-2">
      <section className="relative hidden flex-col justify-between overflow-hidden bg-neutral-950 p-10 text-white lg:flex">
        <div className="relative flex items-center gap-2.5">
          <span className="flex h-10 w-10 items-center justify-center rounded-none bg-neutral-500/15 text-neutral-300">
            <StoreIcon className="h-6 w-6" />
          </span>
          <span className="text-lg font-semibold tracking-tight">AthFlex</span>
        </div>

        <div className="relative max-w-md space-y-5">
          <h1 className="text-3xl font-semibold leading-tight tracking-tight">
            Your operations.
            One workspace.
          </h1>
          <p className="text-[#b8b8b8]">
            Product development, tech packs, inventory and operations.
            A considered workspace for the AthFlex team.
          </p>
        </div>

        <p className="relative text-xs text-[#737373]">AthFlex · ERP workspace</p>
      </section>

      <section className="flex items-center justify-center bg-white p-6 sm:p-10">
        <div className="w-full max-w-sm">
          <div className="mb-8 lg:hidden">
            <span className="flex h-11 w-11 items-center justify-center rounded-none bg-[#1a1a1a] text-neutral-400">
              <StoreIcon className="h-6 w-6" />
            </span>
          </div>
          <h2 className="text-2xl font-semibold tracking-tight text-[#1a1a1a]">Sign in to AthFlex</h2>
          <p className="mb-6 mt-1 text-sm text-[#616161]">Sign in with your team account.</p>

          <LoginForm />

        </div>
      </section>
    </main>
  );
}
