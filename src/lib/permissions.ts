export const PERMISSIONS = [
  { key: "dashboard", label: "Home", description: "View product development, tech pack and SKU summaries." },
  { key: "products", label: "Products", description: "View the product catalog and inventory." },
  { key: "techpacks", label: "Tech packs — view", description: "View tech packs, linked Shopify products and attachments." },
  { key: "techpacks_manage", label: "Tech packs — manage", description: "Create and edit tech packs, SKUs, Shopify mappings and attachments; includes view access." },
  { key: "pp_approve", label: "PP sample approval", description: "Approve or reject pre-production samples. A style cannot be ordered until its PP sample is approved." },
  { key: "production", label: "FOB POs — view", description: "View purchase orders, ordered quantities and piece-level receipts." },
  { key: "production_manage", label: "FOB POs — manage", description: "Create and issue FOB POs, manage jobbers and jobber rates, and close or cancel orders; includes FOB PO view access." },
  { key: "inward", label: "Inward scanning", description: "Scan piece QR codes and record manual inward entries when a QR is missing or damaged." },
  { key: "production_reports", label: "Production reports", description: "View lead time, jobber performance, pending and overdue reports." },
  { key: "analytics", label: "Analytics", description: "View ERP catalog coverage, material assignments and Shopify mapping progress." },
  { key: "shopify", label: "Shopify connection (Settings)", description: "Manage the Shopify connection and product sync from Settings." },
  { key: "store_settings", label: "Store settings", description: "View and edit store details." },
] as const;

export type Permission = (typeof PERMISSIONS)[number]["key"];
export type AccessUser = { role: string; permissions: string[] };

export function hasPermission(user: AccessUser, permission: Permission): boolean {
  return (
    user.role === "admin" ||
    user.permissions.includes(permission) ||
    (permission === "techpacks" && user.permissions.includes("techpacks_manage")) ||
    (permission === "production" && user.permissions.includes("production_manage"))
  );
}

export function isPermission(value: string): value is Permission {
  return PERMISSIONS.some((permission) => permission.key === value);
}
