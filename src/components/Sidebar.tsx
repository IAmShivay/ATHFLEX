"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { logout } from "@/app/actions/auth";
import Avatar from "./Avatar";
import NavIcon from "./NavIcon";
import { hasPermission, type AccessUser } from "@/lib/permissions";
import { isItemActive, visibleGroups, type NavItem } from "@/lib/navigation";
import { LogoutIcon, StoreIcon } from "./icons";

const PLANNED_LABEL = "coming soon";

function groupsFor(user: AccessUser) {
  return visibleGroups(user.role === "admin", (permission) => hasPermission(user, permission));
}

export function MobileNav({ user }: { user: AccessUser }) {
  const pathname = usePathname();
  const items = groupsFor(user).flatMap((group) => group.items).filter((item) => item.status === "live");
  return (
    <nav aria-label="Main navigation" className="flex gap-1 overflow-x-auto border-b border-[#d4d4d4] bg-white px-3 py-2 lg:hidden">
      {items.map((item) => {
        const active = isItemActive(item, pathname);
        return (
          <Link
            key={item.key}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={`flex shrink-0 items-center gap-1.5 rounded-none px-3 py-1.5 text-xs font-medium ${
              active ? "bg-[#1a1a1a] text-white" : "bg-[#f7f7f7] text-[#616161]"
            }`}
          >
            <NavIcon name={item.icon} className="h-4 w-4" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

function SidebarLink({ item, pathname }: { item: NavItem; pathname: string }) {
  const active = isItemActive(item, pathname);
  const planned = item.status === "planned";
  const tone = active
    ? "bg-neutral-950 font-medium text-white"
    : planned
      ? "text-neutral-400 hover:bg-neutral-50 hover:text-neutral-600"
      : "text-neutral-600 hover:bg-neutral-100 hover:text-neutral-950";
  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      title={planned ? "Coming soon" : undefined}
      className={`flex items-center gap-2.5 rounded-none px-3 py-2 text-sm transition-colors ${tone}`}
    >
      <NavIcon name={item.icon} className="h-4 w-4 shrink-0" />
      <span className="min-w-0 flex-1 truncate">{item.label}</span>
      {planned && <span className="sr-only">({PLANNED_LABEL})</span>}
    </Link>
  );
}

export default function Sidebar({ user, storeName }: { user: AccessUser & { name: string; email: string }; storeName: string }) {
  const pathname = usePathname();
  const groups = groupsFor(user);

  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-60 flex-col border-r border-neutral-200 bg-white text-neutral-900 lg:flex">
      <div className="flex items-center gap-2.5 px-5 py-6">
        <span className="flex h-9 w-9 items-center justify-center rounded-none bg-neutral-950 text-white">
          <StoreIcon className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-neutral-950">{storeName}</p>
          <p className="mt-0.5 text-[11px] text-neutral-500">ERP workspace</p>
        </div>
      </div>

      <nav aria-label="Main navigation" className="flex-1 space-y-5 overflow-y-auto px-3 pb-4">
        {groups.map((group) => (
          <div key={group.key}>
            <p className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-widest text-neutral-500">
              {group.label}
              {group.note && <span className="mt-0.5 block font-medium normal-case tracking-normal text-neutral-400">{group.note}</span>}
            </p>
            <div className="space-y-0.5">
              {group.items.map((item) => (
                <SidebarLink key={item.key} item={item} pathname={pathname} />
              ))}
            </div>
          </div>
        ))}
      </nav>

      <div className="border-t border-neutral-200 p-4">
        <div className="flex items-center gap-2.5">
          <Avatar name={user.name} size="md" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-neutral-950">{user.name}</p>
            <p className="truncate text-[11px] text-[#737373]">{user.email}</p>
          </div>
          <form action={logout}>
            <button
              type="submit"
              title="Log out"
              className="rounded-none p-1.5 text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-950"
            >
              <LogoutIcon className="h-5 w-5" />
            </button>
          </form>
        </div>
      </div>
    </aside>
  );
}
