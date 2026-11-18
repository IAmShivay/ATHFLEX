"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { logout } from "@/app/actions/auth";
import Avatar from "./Avatar";
import { hasPermission, type AccessUser, type Permission } from "@/lib/permissions";
import {
  AnalyticsIcon,
  FactoryIcon,
  HomeIcon,
  LogoutIcon,
  OrdersIcon,
  ReportIcon,
  ScanIcon,
  SettingsIcon,
  StoreIcon,
  TagIcon,
  CustomersIcon,
} from "./icons";

const NAV: { href: string; label: string; icon: typeof HomeIcon; permission?: Permission; adminOnly?: boolean }[] = [
  { href: "/", label: "Home", icon: HomeIcon, permission: "dashboard" },
  { href: "/techpacks", label: "Tech packs", icon: TagIcon, permission: "techpacks" },
  { href: "/purchase-orders", label: "FOB POs", icon: OrdersIcon, permission: "production" },
  { href: "/inward", label: "Inward", icon: ScanIcon, permission: "inward" },
  { href: "/reports", label: "Reports", icon: ReportIcon, permission: "production_reports" },
  { href: "/jobbers", label: "Jobbers", icon: FactoryIcon, permission: "production" },
  { href: "/products", label: "Products", icon: TagIcon, permission: "products" },
  { href: "/analytics", label: "Analytics", icon: AnalyticsIcon, permission: "analytics" },
  { href: "/users", label: "Users & access", icon: CustomersIcon, adminOnly: true },
  { href: "/settings", label: "Settings", icon: SettingsIcon },
];

function visibleNav(user: AccessUser) {
  return NAV.filter((item) => (!item.adminOnly || user.role === "admin") && (!item.permission || hasPermission(user, item.permission)));
}

export function MobileNav({ user }: { user: AccessUser }) {
  const pathname = usePathname();
  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));
  return (
    <nav aria-label="Main navigation" className="flex gap-1 overflow-x-auto border-b border-[#d4d4d4] bg-white px-3 py-2 lg:hidden">
      {visibleNav(user).map(({ href, label, icon: Icon }) => {
        const active = isActive(href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={`flex shrink-0 items-center gap-1.5 rounded-none px-3 py-1.5 text-xs font-medium ${
              active ? "bg-[#1a1a1a] text-white" : "bg-[#f7f7f7] text-[#616161]"
            }`}
          >
            <Icon className="h-4 w-4" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

export default function Sidebar({ user, storeName }: { user: AccessUser & { name: string; email: string }; storeName: string }) {
  const pathname = usePathname();
  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

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

      <nav aria-label="Main navigation" className="mt-2 flex-1 space-y-1 overflow-y-auto px-3">
        {visibleNav(user).map(({ href, label, icon: Icon }) => {
          const active = isActive(href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={`flex items-center gap-2.5 rounded-none px-3 py-2 text-sm transition-colors ${
                active ? "bg-neutral-950 font-medium text-white" : "text-neutral-600 hover:bg-neutral-100 hover:text-neutral-950"
              }`}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          );
        })}
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
