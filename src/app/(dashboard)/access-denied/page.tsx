import Link from "next/link";
import { getUser } from "@/lib/dal";

export default async function AccessDeniedPage() {
  await getUser();
  return (
    <div className="rounded-none border border-[#d4d4d4] bg-white p-6 shadow-none">
      <h1 className="text-xl font-semibold">Access denied</h1>
      <p className="mt-2 text-sm text-[#616161]">Your account does not have access to this area. Ask an administrator if you need access.</p>
      <Link href="/settings" className="mt-4 inline-block text-sm font-medium text-neutral-700 hover:underline">Account settings</Link>
    </div>
  );
}
