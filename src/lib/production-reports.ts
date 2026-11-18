import { query } from "./db";
import { compareSizes, styleSkuLabel } from "./production";

export type ReportFilters = {
  jobber?: number;
  po?: number;
  from?: string;
  to?: string;
};

export type LeadTimeRow = {
  po_id: number;
  po_number: string;
  po_date: string;
  status: string;
  jobber: string;
  techpack_id: number;
  sku_label: string;
  sizes: number;
  ordered: number;
  received: number;
  manual: number;
  po_date_label: string;
  last_receipt: string | null;
  lead_days: number | null;
  complete: boolean;
  on_time: boolean | null;
};

export type JobberOnTime = { name: string; total: number; on_time: number; percent: number };
export type LateJobber = { name: string; count: number; avg_days: number };
export type PendingJobber = { name: string; pending: number; overdue: number; max_days: number };

export type ProductionReport = {
  kpis: {
    po_count: number;
    ordered: number;
    received: number;
    manual: number;
    on_time_rate: number | null;
    avg_lead_days: number | null;
    pending: number;
    overdue: number;
  };
  lead_time: LeadTimeRow[];
  jobber_on_time: JobberOnTime[];
  late_jobbers: LateJobber[];
  pending_jobbers: PendingJobber[];
};

type ItemStatRow = {
  po_id: number;
  po_number: string;
  po_date: string;
  status: string;
  jobber_id: number;
  jobber: string;
  techpack_id: number;
  code: string;
  color_family: string;
  description: string | null;
  product_name: string;
  size: string;
  quantity: number;
  received: number;
  manual: number;
  last_scan_date: string | null;
  delivery_date: string;
  original_delivery_date: string;
};

function utcDay(value: string): number {
  const [year, month, day] = value.slice(0, 10).split("-").map(Number);
  return Date.UTC(year, month - 1, day);
}

function daysBetween(from: string, to: string): number {
  return Math.round((utcDay(to) - utcDay(from)) / 86400000);
}

function average(values: number[]): number | null {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
}

export async function getProductionReport(filters: ReportFilters = {}): Promise<ProductionReport> {
  const [todayResult, rowsResult] = await Promise.all([
    query<{ today: string }>("SELECT to_char(now() AT TIME ZONE 'Asia/Kolkata','YYYY-MM-DD') AS today"),
    query<ItemStatRow>(`
      SELECT p.id AS po_id, p.po_number, to_char(p.po_date,'YYYY-MM-DD') AS po_date, p.status,
             p.jobber_id, j.name AS jobber, i.techpack_id, t.code, t.color_family, t.description,
             t.name AS product_name, i.size, i.quantity,
             count(s.id)::int AS received,
             count(s.id) FILTER (WHERE s.entry_type = 'manual')::int AS manual,
             to_char(max(s.scanned_at) AT TIME ZONE 'Asia/Kolkata','YYYY-MM-DD') AS last_scan_date,
             to_char(i.delivery_date,'YYYY-MM-DD') AS delivery_date,
             to_char(i.original_delivery_date,'YYYY-MM-DD') AS original_delivery_date
      FROM fob_pos p
      JOIN jobbers j ON j.id = p.jobber_id
      JOIN fob_po_items i ON i.fob_po_id = p.id
      JOIN techpacks t ON t.id = i.techpack_id
      LEFT JOIN inward_scans s ON s.item_id = i.id
      WHERE p.status <> 'cancelled'
        AND ($1::int IS NULL OR p.jobber_id = $1)
        AND ($2::int IS NULL OR p.id = $2)
        AND ($3::date IS NULL OR p.po_date >= $3::date)
        AND ($4::date IS NULL OR p.po_date <= $4::date)
      GROUP BY p.id, j.name, i.id, t.code, t.color_family, t.description, t.name
      ORDER BY p.po_date DESC, p.id DESC, t.code, i.size`,
      [filters.jobber ?? null, filters.po ?? null, filters.from ?? null, filters.to ?? null]),
  ]);

  const today = todayResult.rows[0]?.today ?? new Date().toISOString().slice(0, 10);
  const rows = rowsResult.rows;
  const completeRows = rows.filter((row) => row.received >= row.quantity && row.last_scan_date);
  const onTimeComplete = completeRows.filter((row) => row.last_scan_date! <= row.original_delivery_date);
  const leadDays = rows.filter((row) => row.last_scan_date).map((row) => daysBetween(row.po_date, row.last_scan_date!));

  const groups = new Map<string, LeadTimeRow & { sizeSet: Set<string> }>();
  for (const row of rows) {
    const key = `${row.po_id}:${row.techpack_id}`;
    const pack = {
      code: row.code,
      color_family: row.color_family,
      description: row.description,
      name: row.product_name,
    };
    const existing = groups.get(key);
    if (!existing) {
      groups.set(key, {
        po_id: row.po_id,
        po_number: row.po_number,
        po_date: row.po_date,
        status: row.status,
        jobber: row.jobber,
        techpack_id: row.techpack_id,
        sku_label: styleSkuLabel(pack),
        sizes: 1,
        ordered: row.quantity,
        received: row.received,
        manual: row.manual,
        po_date_label: row.po_date,
        last_receipt: row.last_scan_date,
        lead_days: row.last_scan_date ? daysBetween(row.po_date, row.last_scan_date) : null,
        complete: row.received >= row.quantity,
        on_time: row.received >= row.quantity && row.last_scan_date ? row.last_scan_date <= row.original_delivery_date : null,
        sizeSet: new Set([row.size]),
      });
    } else {
      existing.ordered += row.quantity;
      existing.received += row.received;
      existing.manual += row.manual;
      existing.sizeSet.add(row.size);
      existing.sizes = existing.sizeSet.size;
      existing.complete = existing.complete && row.received >= row.quantity;
      existing.on_time =
        existing.complete && row.last_scan_date && existing.on_time !== false
          ? row.last_scan_date <= row.original_delivery_date
          : false;
      if (row.last_scan_date && (!existing.last_receipt || row.last_scan_date > existing.last_receipt)) {
        existing.last_receipt = row.last_scan_date;
      }
      if (row.last_scan_date) {
        existing.lead_days = daysBetween(row.po_date, row.last_scan_date);
      }
    }
  }
  const leadTime = [...groups.values()]
    .map((row) => {
      const { sizeSet, ...leadTimeRow } = row;
      void sizeSet;
      leadTimeRow.lead_days = leadTimeRow.last_receipt ? daysBetween(leadTimeRow.po_date, leadTimeRow.last_receipt) : null;
      return leadTimeRow;
    })
    .sort((a, b) => b.po_date.localeCompare(a.po_date) || a.po_number.localeCompare(b.po_number) || a.sku_label.localeCompare(b.sku_label));

  const onTimeByJobber = new Map<string, { total: number; on_time: number }>();
  for (const row of rows) {
    if (row.received < row.quantity || !row.last_scan_date) continue;
    const entry = onTimeByJobber.get(row.jobber) ?? { total: 0, on_time: 0 };
    entry.total += 1;
    if (row.last_scan_date <= row.original_delivery_date) entry.on_time += 1;
    onTimeByJobber.set(row.jobber, entry);
  }
  const jobberOnTime = [...onTimeByJobber.entries()]
    .map(([name, entry]) => ({ name, ...entry, percent: entry.total ? Math.round((entry.on_time / entry.total) * 100) : 0 }))
    .sort((a, b) => b.percent - a.percent || a.name.localeCompare(b.name));

  const lateByJobber = new Map<string, number[]>();
  for (const row of rows) {
    if (row.received < row.quantity || !row.last_scan_date) continue;
    const late = daysBetween(row.original_delivery_date, row.last_scan_date);
    if (late <= 0) continue;
    const values = lateByJobber.get(row.jobber) ?? [];
    values.push(late);
    lateByJobber.set(row.jobber, values);
  }
  const lateJobbers = [...lateByJobber.entries()]
    .map(([name, values]) => ({ name, count: values.length, avg_days: Math.round(average(values) ?? 0) }))
    .sort((a, b) => b.avg_days - a.avg_days || b.count - a.count);

  const pendingByJobber = new Map<string, { pending: number; overdue: number; max_days: number }>();
  for (const row of rows) {
    const pending = Math.max(0, row.quantity - row.received);
    if (!pending) continue;
    const entry = pendingByJobber.get(row.jobber) ?? { pending: 0, overdue: 0, max_days: 0 };
    entry.pending += pending;
    if (row.delivery_date < today) {
      entry.overdue += pending;
      entry.max_days = Math.max(entry.max_days, daysBetween(row.delivery_date, today));
    }
    pendingByJobber.set(row.jobber, entry);
  }
  const pendingJobbers = [...pendingByJobber.entries()]
    .map(([name, entry]) => ({ name, ...entry }))
    .sort((a, b) => b.pending - a.pending || a.name.localeCompare(b.name));

  const ordered = rows.reduce((sum, row) => sum + row.quantity, 0);
  const received = rows.reduce((sum, row) => sum + row.received, 0);
  const manual = rows.reduce((sum, row) => sum + row.manual, 0);
  const avgLead = average(leadDays);

  return {
    kpis: {
      po_count: new Set(rows.map((row) => row.po_id)).size,
      ordered,
      received,
      manual,
      on_time_rate: completeRows.length ? Math.round((onTimeComplete.length / completeRows.length) * 100) : null,
      avg_lead_days: avgLead === null ? null : Math.round(avgLead),
      pending: Math.max(0, ordered - received),
      overdue: pendingJobbers.reduce((sum, jobber) => sum + jobber.overdue, 0),
    },
    lead_time: leadTime,
    jobber_on_time: jobberOnTime,
    late_jobbers: lateJobbers,
    pending_jobbers: pendingJobbers,
  };
}

export function compareSkuSizes(a: { size: string }, b: { size: string }): number {
  return compareSizes(a.size, b.size);
}
