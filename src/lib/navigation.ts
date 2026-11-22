import type { Permission } from "./permissions";

export type NavIconKey =
  | "home"
  | "techpack"
  | "materials"
  | "sku"
  | "approval"
  | "po"
  | "jobber"
  | "scan"
  | "report"
  | "analytics"
  | "users"
  | "settings"
  | "plug"
  | "inventory"
  | "forecast"
  | "planning"
  | "purchase";

export const SHOW_PLANNED_MODULES = false;

export type ModuleStatus = "live" | "planned";
export type PhaseKey = "core" | "phase1" | "phase2" | "admin";

export type NavItem = {
  key: string;
  label: string;
  href: string;
  icon: NavIconKey;
  status: ModuleStatus;
  permission?: Permission;
  adminOnly?: boolean;
  match?: string[];
  summary?: string;
};

export type NavGroup = {
  key: string;
  label: string;
  phase: PhaseKey;
  note?: string;
  items: NavItem[];
};

export const NAV_GROUPS: NavGroup[] = [
  {
    key: "overview",
    label: "Overview",
    phase: "core",
    items: [{ key: "dashboard", label: "Dashboard", href: "/", icon: "home", status: "live", permission: "dashboard" }],
  },
  {
    key: "techpack-sku",
    label: "Techpack & SKU",
    phase: "phase1",
    items: [
      { key: "techpacks", label: "Tech packs", href: "/techpacks", icon: "techpack", status: "live", permission: "techpacks" },
      { key: "fabric-master", label: "Fabric master", href: "/materials/fabric", icon: "materials", status: "live", permission: "techpacks" },
      { key: "trim-master", label: "Trim master", href: "/materials/trim", icon: "materials", status: "live", permission: "techpacks" },
      { key: "skus", label: "SKU / Product master", href: "/products", icon: "sku", status: "live", permission: "products" },
      { key: "jobbers", label: "Jobbers", href: "/jobbers", icon: "jobber", status: "live", permission: "production" },
    ],
  },
  {
    key: "approval-po",
    label: "PP approval & FOB PO",
    phase: "phase1",
    items: [
      { key: "pp-approvals", label: "PP approval", href: "/pp-approvals", icon: "approval", status: "live", permission: "techpacks" },
      { key: "fob-pos", label: "FOB POs", href: "/purchase-orders", icon: "po", status: "live", permission: "production", match: ["/print/purchase-orders"] },
    ],
  },
  {
    key: "qr-inward",
    label: "QR & inward",
    phase: "phase1",
    items: [{ key: "inward", label: "QR & Inward", href: "/inward", icon: "scan", status: "live", permission: "inward" }],
  },
  {
    key: "reports",
    label: "Insights",
    phase: "phase1",
    items: [
      { key: "reports", label: "Reports", href: "/reports", icon: "report", status: "live", permission: "production_reports" },
      { key: "analytics", label: "Analytics", href: "/analytics", icon: "analytics", status: "live", permission: "analytics" },
    ],
  },
  {
    key: "planning",
    label: "Demand planning & inventory",
    phase: "phase2",
    note: "Phase 2 · Coming soon",
    items: [
      { key: "ecommerce", label: "E-commerce integration", href: "/planning/ecommerce", icon: "plug", status: "planned", summary: "Bring online-store sales and stock data into one place, so planning starts from real demand." },
      { key: "inventory", label: "Inventory management", href: "/planning/inventory", icon: "inventory", status: "planned", summary: "Track finished-goods stock by SKU, fed automatically by inward receipts from manufacturing." },
      { key: "forecasting", label: "Demand forecasting", href: "/planning/forecasting", icon: "forecast", status: "planned", summary: "Predict demand for each SKU from sales history and current stock." },
      { key: "product-planning", label: "Product planning", href: "/planning/product-planning", icon: "planning", status: "planned", summary: "Decide which styles and quantities to make next, using the forecast and the SKU master." },
      { key: "purchase-planning", label: "Purchase planning", href: "/planning/purchase-planning", icon: "purchase", status: "planned", summary: "Turn the plan into purchase proposals and raise FOB POs with source Forecast, into the same QR, inward and reporting flow." },
    ],
  },
  {
    key: "administration",
    label: "Administration",
    phase: "admin",
    items: [
      { key: "users", label: "Users & access", href: "/users", icon: "users", status: "live", adminOnly: true },
      { key: "settings", label: "Settings", href: "/settings", icon: "settings", status: "live" },
    ],
  },
];

type AccessCheck = (permission: Permission) => boolean;

export function isItemVisible(item: NavItem, isAdmin: boolean, can: AccessCheck): boolean {
  if (item.adminOnly && !isAdmin) return false;
  if (item.status === "planned") return SHOW_PLANNED_MODULES;
  return !item.permission || can(item.permission);
}

export function visibleGroups(isAdmin: boolean, can: AccessCheck): NavGroup[] {
  return NAV_GROUPS.map((group) => ({ ...group, items: group.items.filter((item) => isItemVisible(item, isAdmin, can)) })).filter((group) => group.items.length > 0);
}

export function isItemActive(item: NavItem, pathname: string): boolean {
  if (item.href === "/") return pathname === "/";
  return [item.href, ...(item.match ?? [])].some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}
