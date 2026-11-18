import Avatar from "./Avatar";
import Link from "next/link";

export default function Topbar({ user, storeName }: { user: { name: string }; storeName: string }) {
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-4 border-b border-neutral-200 bg-white px-5 sm:px-8">
      <div className="flex min-w-0 items-center gap-2 text-sm">
        <span className="truncate font-medium text-neutral-900">{storeName}</span>
        <span aria-hidden="true" className="text-neutral-300">/</span>
        <span className="text-neutral-500">Workspace</span>
      </div>
      <Link href="/settings" aria-label="Account settings" className="flex items-center gap-2.5 rounded-none p-1 text-sm text-neutral-600 hover:bg-neutral-50">
        <span className="hidden sm:inline">{user.name}</span>
        <Avatar name={user.name} size="sm" />
      </Link>
    </header>
  );
}
