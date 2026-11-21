import { query } from "./db";
import type { PoSource } from "./po-source";

export { DEFAULT_PO_SOURCE, PO_SOURCES, PO_SOURCE_LABELS, type PoSource } from "./po-source";

export type PpStatus = "pending" | "approved" | "rejected";
export type PoStatus = "draft" | "issued" | "partly_received" | "closed" | "cancelled";


export type Jobber = {
  id: number;
  name: string;
  contact_name: string | null;
  phone: string | null;
  email: string | null;
  is_active: boolean;
  techpack_count: number;
  open_po_count: number;
};

export type JobberOption = { id: number; name: string; is_active: boolean };

export type TechpackJobber = {
  jobber_id: number;
  name: string;
  rate: string;
  operation_type: string;
  is_active: boolean;
};

export type TechpackJobberable = {
  id: number;
  name: string;
  code: string;
  color_family: string;
  description: string | null;
  pp_status: PpStatus;
  sku_label: string;
  sizes: string[];
  jobber_ids: number[];
  jobbers: { id: number; name: string; rate: string; operation_type: string }[];
};

export type PurchaseOrderListRow = {
  id: number;
  po_number: string;
  status: PoStatus;
  source: PoSource;
  po_date: string;
  jobber: string;
  jobber_id: number;
  styles: number;
  items: number;
  ordered: number;
  received: number;
  next_delivery: string | null;
};

export type PurchaseOrderItem = {
  id: number;
  techpack_id: number;
  code: string;
  color_family: string;
  description: string | null;
  product_name: string;
  pp_status: PpStatus;
  sku_label: string;
  size: string;
  quantity: number;
  received: number;
  pending: number;
  delivery_date: string;
  original_delivery_date: string;
  last_scan_at: string | null;
  rate: string | null;
  operation_type: string | null;
};

export type PurchaseOrderDetail = {
  id: number;
  po_number: string;
  status: PoStatus;
  source: PoSource;
  source_ref: string | null;
  po_date: string;
  notes: string | null;
  issued_at: string | null;
  closed_at: string | null;
  created_at: string;
  jobber_id: number;
  jobber: string;
  contact_name: string | null;
  phone: string | null;
  email: string | null;
  items: PurchaseOrderItem[];
};

export type ScanLogRow = {
  id: number;
  po_number: string;
  po_id: number;
  sku_label: string;
  size: string;
  piece_no: number;
  entry_type: "scanned" | "manual";
  scanned_at: string;
  scanned_by: string;
};

export type InwardQueueRow = {
  id: number;
  po_number: string;
  jobber: string;
  status: PoStatus;
  ordered: number;
  received: number;
  last_scan_at: string | null;
};

export type ManualEntryItem = {
  id: number;
  sku_label: string;
  size: string;
  quantity: number;
  received: number;
};

export type ManualEntryPo = {
  id: number;
  po_number: string;
  status: PoStatus;
  items: ManualEntryItem[];
};

const SIZE_ORDER = ["XXS", "XS", "S", "M", "L", "XL", "XXL", "2XL", "3XL", "4XL", "5XL"];

export function compareSizes(a: string, b: string): number {
  const ai = SIZE_ORDER.indexOf(a.toUpperCase());
  const bi = SIZE_ORDER.indexOf(b.toUpperCase());
  if (ai >= 0 || bi >= 0) return (ai < 0 ? 999 : ai) - (bi < 0 ? 999 : bi) || a.localeCompare(b);
  const an = Number(a);
  const bn = Number(b);
  if (Number.isFinite(an) && Number.isFinite(bn)) return an - bn;
  return a.localeCompare(b);
}

function slugPart(value: string): string {
  return value
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^A-Za-z0-9._-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export function styleSkuLabel(pack: {
  code: string;
  color_family: string;
  description?: string | null;
  name?: string;
}): string {
  return [pack.code, pack.color_family, pack.description || pack.name || "Style"].map(slugPart).filter(Boolean).join("-");
}

export function poNumberForSequence(value: number): string {
  return `FOB-${String(value).padStart(4, "0")}`;
}

export function ppStatusLabel(status: PpStatus): string {
  return status === "approved" ? "PP approved" : status === "rejected" ? "PP rejected" : "PP pending";
}

export function poStatusLabel(status: PoStatus): string {
  return status === "partly_received"
    ? "Partly received"
    : status === "closed"
      ? "Closed"
      : status === "cancelled"
        ? "Cancelled"
        : status === "issued"
          ? "Issued"
          : "Draft";
}

export async function getJobbers(): Promise<Jobber[]> {
  const { rows } = await query<Jobber>(`
    SELECT j.id, j.name, j.contact_name, j.phone, j.email, j.is_active,
           count(DISTINCT tj.techpack_id)::int AS techpack_count,
           count(DISTINCT p.id) FILTER (WHERE p.status IN ('issued','partly_received'))::int AS open_po_count
    FROM jobbers j
    LEFT JOIN techpack_jobbers tj ON tj.jobber_id = j.id
    LEFT JOIN fob_pos p ON p.jobber_id = j.id
    GROUP BY j.id
    ORDER BY j.is_active DESC, j.name, j.id`);
  return rows;
}

export async function getActiveJobberOptions(): Promise<JobberOption[]> {
  const { rows } = await query<JobberOption>("SELECT id, name, is_active FROM jobbers WHERE is_active ORDER BY name, id");
  return rows;
}

export async function getTechpackJobbers(techpackId: number): Promise<TechpackJobber[]> {
  const { rows } = await query<TechpackJobber>(`
    SELECT j.id AS jobber_id, j.name, tj.rate, tj.operation_type, j.is_active
    FROM techpack_jobbers tj
    JOIN jobbers j ON j.id = tj.jobber_id
    WHERE tj.techpack_id = $1
    ORDER BY j.name`, [techpackId]);
  return rows;
}

export async function getTechpackJobberable(techpackId: number): Promise<TechpackJobberable | null> {
  const { rows } = await query<{
    id: number;
    name: string;
    code: string;
    color_family: string;
    description: string | null;
    pp_status: PpStatus;
  }>("SELECT id, name, code, color_family, description, pp_status FROM techpacks WHERE id = $1", [techpackId]);
  const pack = rows[0];
  if (!pack) return null;
  const [sizes, jobbers] = await Promise.all([
    query<{ size: string }>("SELECT DISTINCT size FROM erp_skus WHERE techpack_id = $1", [techpackId]),
    query<{ id: number; name: string; rate: string; operation_type: string; is_active: boolean }>(`
      SELECT j.id, j.name, tj.rate, tj.operation_type, j.is_active
      FROM techpack_jobbers tj JOIN jobbers j ON j.id = tj.jobber_id
      WHERE tj.techpack_id = $1 ORDER BY j.name`, [techpackId]),
  ]);
  return {
    ...pack,
    sku_label: styleSkuLabel(pack),
    sizes: sizes.rows.map((row) => row.size).sort(compareSizes),
    jobber_ids: jobbers.rows.filter((row) => row.is_active).map((row) => row.id),
    jobbers: jobbers.rows.map((row) => ({ id: row.id, name: row.name, rate: row.rate, operation_type: row.operation_type })),
  };
}

export async function getPpApprovedTechpacksForOrders(): Promise<TechpackJobberable[]> {
  const { rows: packs } = await query<{
    id: number;
    name: string;
    code: string;
    color_family: string;
    description: string | null;
    pp_status: PpStatus;
  }>("SELECT id, name, code, color_family, description, pp_status FROM techpacks WHERE pp_status = 'approved' ORDER BY code, id");
  if (!packs.length) return [];
  const ids = packs.map((pack) => pack.id);
  const [sizes, jobbers] = await Promise.all([
    query<{ techpack_id: number; size: string }>(
      "SELECT DISTINCT techpack_id, size FROM erp_skus WHERE techpack_id = ANY($1::int[])", [ids]
    ),
    query<{ techpack_id: number; jobber_id: number; name: string; rate: string; operation_type: string; is_active: boolean }>(`
      SELECT tj.techpack_id, j.id AS jobber_id, j.name, tj.rate, tj.operation_type, j.is_active
      FROM techpack_jobbers tj JOIN jobbers j ON j.id = tj.jobber_id
      WHERE tj.techpack_id = ANY($1::int[]) ORDER BY j.name`, [ids]),
  ]);
  return packs.map((pack) => {
    const packJobbers = jobbers.rows.filter((row) => row.techpack_id === pack.id);
    return {
      ...pack,
      sku_label: styleSkuLabel(pack),
      sizes: sizes.rows.filter((row) => row.techpack_id === pack.id).map((row) => row.size).sort(compareSizes),
      jobber_ids: packJobbers.filter((row) => row.is_active).map((row) => row.jobber_id),
      jobbers: packJobbers.map((row) => ({ id: row.jobber_id, name: row.name, rate: row.rate, operation_type: row.operation_type })),
    };
  });
}

export async function getPurchaseOrders(status?: string): Promise<PurchaseOrderListRow[]> {
  const allowed = ["draft", "issued", "partly_received", "closed", "cancelled"];
  const filtered = status && allowed.includes(status) ? status : null;
  const { rows } = await query<PurchaseOrderListRow>(`
    SELECT p.id, p.po_number, p.status, p.source, to_char(p.po_date, 'YYYY-MM-DD') AS po_date,
           j.name AS jobber, p.jobber_id,
           coalesce(it.styles, 0)::int AS styles,
           coalesce(it.items, 0)::int AS items,
           coalesce(it.ordered, 0)::int AS ordered,
           coalesce(r.received, 0)::int AS received,
           to_char(it.next_delivery, 'YYYY-MM-DD') AS next_delivery
    FROM fob_pos p
    JOIN jobbers j ON j.id = p.jobber_id
    LEFT JOIN (
      SELECT fob_po_id, count(DISTINCT techpack_id)::int AS styles,
             count(*)::int AS items, sum(quantity)::int AS ordered,
             min(delivery_date) AS next_delivery
      FROM fob_po_items GROUP BY fob_po_id
    ) it ON it.fob_po_id = p.id
    LEFT JOIN (
      SELECT i.fob_po_id, count(s.id)::int AS received
      FROM fob_po_items i JOIN inward_scans s ON s.item_id = i.id
      GROUP BY i.fob_po_id
    ) r ON r.fob_po_id = p.id
    WHERE ($1::text IS NULL OR p.status = $1)
    ORDER BY p.po_date DESC, p.id DESC`, [filtered]);
  return rows;
}

export async function getPurchaseOrder(id: number): Promise<PurchaseOrderDetail | null> {
  const { rows } = await query<Omit<PurchaseOrderDetail, "items">>(`
    SELECT p.id, p.po_number, p.status, p.source, p.source_ref, to_char(p.po_date, 'YYYY-MM-DD') AS po_date, p.notes,
           p.issued_at, p.closed_at, p.created_at, p.jobber_id, j.name AS jobber,
           j.contact_name, j.phone, j.email
    FROM fob_pos p JOIN jobbers j ON j.id = p.jobber_id
    WHERE p.id = $1`, [id]);
  const po = rows[0];
  if (!po) return null;
  const items = await query<PurchaseOrderItem>(`
    SELECT i.id, i.techpack_id, t.code, t.color_family, t.description, t.name AS product_name,
           t.pp_status, i.size, i.quantity,
           count(s.id)::int AS received,
           (i.quantity - count(s.id))::int AS pending,
           to_char(i.delivery_date, 'YYYY-MM-DD') AS delivery_date,
           to_char(i.original_delivery_date, 'YYYY-MM-DD') AS original_delivery_date,
           max(s.scanned_at) AS last_scan_at,
           tj.rate, tj.operation_type
    FROM fob_po_items i
    JOIN fob_pos p ON p.id = i.fob_po_id
    JOIN techpacks t ON t.id = i.techpack_id
    LEFT JOIN techpack_jobbers tj ON tj.techpack_id = i.techpack_id AND tj.jobber_id = p.jobber_id
    LEFT JOIN inward_scans s ON s.item_id = i.id
    WHERE i.fob_po_id = $1
    GROUP BY i.id, t.code, t.color_family, t.description, t.name, t.pp_status, tj.rate, tj.operation_type
    ORDER BY t.code, i.size`, [id]);
  return {
    ...po,
    items: items.rows
      .map((item) => ({ ...item, sku_label: styleSkuLabel(item) }))
      .sort((a, b) => a.code.localeCompare(b.code) || compareSizes(a.size, b.size)),
  };
}

export async function getInwardQueue(): Promise<InwardQueueRow[]> {
  const { rows } = await query<InwardQueueRow>(`
    SELECT p.id, p.po_number, j.name AS jobber, p.status,
           coalesce(o.ordered, 0)::int AS ordered,
           coalesce(r.received, 0)::int AS received,
           r.last_scan_at
    FROM fob_pos p
    JOIN jobbers j ON j.id = p.jobber_id
    LEFT JOIN (
      SELECT fob_po_id, sum(quantity)::int AS ordered
      FROM fob_po_items GROUP BY fob_po_id
    ) o ON o.fob_po_id = p.id
    LEFT JOIN (
      SELECT i.fob_po_id, count(s.id)::int AS received, max(s.scanned_at) AS last_scan_at
      FROM fob_po_items i JOIN inward_scans s ON s.item_id = i.id
      GROUP BY i.fob_po_id
    ) r ON r.fob_po_id = p.id
    WHERE p.status IN ('issued','partly_received')
    ORDER BY p.po_date, p.id`);
  return rows;
}

export async function getManualEntryOptions(): Promise<ManualEntryPo[]> {
  const { rows } = await query<{
    po_id: number;
    po_number: string;
    status: PoStatus;
    item_id: number;
    code: string;
    color_family: string;
    description: string | null;
    product_name: string;
    size: string;
    quantity: number;
    received: number;
  }>(`
    SELECT p.id AS po_id, p.po_number, p.status, i.id AS item_id,
           t.code, t.color_family, t.description, t.name AS product_name,
           i.size, i.quantity, count(s.id)::int AS received
    FROM fob_pos p
    JOIN fob_po_items i ON i.fob_po_id = p.id
    JOIN techpacks t ON t.id = i.techpack_id
    LEFT JOIN inward_scans s ON s.item_id = i.id
    WHERE p.status IN ('issued','partly_received')
    GROUP BY p.id, i.id, t.code, t.color_family, t.description, t.name
    ORDER BY p.po_date, p.id, t.code, i.size`);
  const pos = new Map<number, ManualEntryPo>();
  for (const row of rows) {
    const po = pos.get(row.po_id) ?? { id: row.po_id, po_number: row.po_number, status: row.status, items: [] };
    po.items.push({
      id: row.item_id,
      sku_label: styleSkuLabel({ code: row.code, color_family: row.color_family, description: row.description, name: row.product_name }),
      size: row.size,
      quantity: row.quantity,
      received: row.received,
    });
    pos.set(row.po_id, po);
  }
  return [...pos.values()].map((po) => ({ ...po, items: po.items.sort((a, b) => a.sku_label.localeCompare(b.sku_label) || compareSizes(a.size, b.size)) }));
}

export async function getRecentScans(limit = 12): Promise<ScanLogRow[]> {
  const { rows } = await query<{
    id: number;
    po_number: string;
    po_id: number;
    code: string;
    color_family: string;
    description: string | null;
    product_name: string;
    size: string;
    piece_no: number;
    entry_type: "scanned" | "manual";
    scanned_at: string;
    scanned_by: string;
  }>(`
    SELECT s.id, p.po_number, p.id AS po_id, t.code, t.color_family, t.description,
           t.name AS product_name, i.size, fp.piece_no, s.entry_type, s.scanned_at, u.name AS scanned_by
    FROM inward_scans s
    JOIN fob_pos p ON p.id = s.fob_po_id
    JOIN fob_po_items i ON i.id = s.item_id
    JOIN techpacks t ON t.id = i.techpack_id
    JOIN fob_pieces fp ON fp.id = s.piece_id
    JOIN users u ON u.id = s.scanned_by
    ORDER BY s.scanned_at DESC, s.id DESC
    LIMIT $1`, [limit]);
  return rows.map((row) => ({
    id: row.id,
    po_number: row.po_number,
    po_id: row.po_id,
    sku_label: styleSkuLabel(row),
    size: row.size,
    piece_no: row.piece_no,
    entry_type: row.entry_type,
    scanned_at: row.scanned_at,
    scanned_by: row.scanned_by,
  }));
}

export async function getProductionSummary(): Promise<{
  pp_pending: number;
  open_pos: number;
  scanned_today: number;
  overdue_lines: number;
}> {
  const { rows } = await query<{ pp_pending: number; open_pos: number; scanned_today: number; overdue_lines: number }>(`
    SELECT
      (SELECT count(*)::int FROM techpacks WHERE pp_status = 'pending') AS pp_pending,
      (SELECT count(*)::int FROM fob_pos WHERE status IN ('issued','partly_received')) AS open_pos,
      (SELECT count(*)::int FROM inward_scans
        WHERE scanned_at >= date_trunc('day', now() AT TIME ZONE 'Asia/Kolkata') AT TIME ZONE 'Asia/Kolkata') AS scanned_today,
      (SELECT count(*)::int
        FROM fob_po_items i
        JOIN fob_pos p ON p.id = i.fob_po_id
        WHERE p.status IN ('issued','partly_received')
          AND i.delivery_date < (now() AT TIME ZONE 'Asia/Kolkata')::date
          AND (SELECT count(*) FROM inward_scans s WHERE s.item_id = i.id) < i.quantity) AS overdue_lines`);
  return rows[0];
}

export async function getTodayScanCounts(): Promise<{ scanned: number; manual: number }> {
  const { rows } = await query<{ scanned: number; manual: number }>(`
    SELECT count(*) FILTER (WHERE entry_type = 'scanned')::int AS scanned,
           count(*) FILTER (WHERE entry_type = 'manual')::int AS manual
    FROM inward_scans
    WHERE scanned_at >= date_trunc('day', now() AT TIME ZONE 'Asia/Kolkata') AT TIME ZONE 'Asia/Kolkata'`);
  return rows[0];
}
