"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { pool } from "@/lib/db";
import { requirePermission } from "@/lib/dal";
import { DEFAULT_PO_SOURCE, poNumberForSequence, styleSkuLabel } from "@/lib/production";
import type { PpStatus } from "@/lib/production";
import { fieldError, formFailure, ValidationError, type FormErrorState } from "@/lib/form-errors";

const DUPLICATE_RECORD_MESSAGE = "That record already exists.";
const GENERIC_FAILURE_MESSAGE = "Could not save the change. Please try again.";
const invalidRecordMessage = (label: string) => `${label}: choose a valid option.`;
const invalidDateMessage = (label: string) => `${label} must be a valid date.`;
const SCAN_INPUT_FIELD = { scan: "code", manual: "piece_no" } as const;

export type ProductionState = FormErrorState & {
  success?: string;
  scan?: {
    po_id: number;
    po_number: string;
    sku_label: string;
    size: string;
    piece_no: number;
    entry_type: "scanned" | "manual";
    received: number;
    ordered: number;
    complete: boolean;
  };
};

const FIELD_LABELS: Record<string, string> = {
  name: "Jobber name",
  contact_name: "Contact person",
  phone: "Phone",
  email: "Email",
  jobber_id: "Jobber",
  po_id: "FOB PO",
  item_id: "Style and size",
  piece_no: "Piece number",
  po_date: "PO date",
  delivery_date: "Delivery date",
  rate: "Rate",
  operation_type: "Operation type",
  code: "Piece QR code",
  notes: "Notes",
  note: "Reason / note",
};

function labelOf(name: string): string {
  const known = FIELD_LABELS[name];
  if (known) return known;
  const deliveryMatch = /^delivery_\d+$/.test(name);
  if (deliveryMatch) return "Delivery date";
  const text = name.replaceAll("_", " ");
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function field(form: FormData, name: string, max = 200): string {
  const value = form.get(name);
  if (typeof value !== "string") return "";
  const text = value.trim();
  if (text.length > max) throw fieldError(name, `${labelOf(name)} is too long.`);
  return text;
}

function required(form: FormData, name: string, max = 200): string {
  const value = field(form, name, max);
  if (!value) throw fieldError(name, `${labelOf(name)} is required.`);
  return value;
}

function positiveId(form: FormData, name: string): number {
  const value = Number(field(form, name));
  if (!Number.isSafeInteger(value) || value < 1) throw fieldError(name, invalidRecordMessage(labelOf(name)));
  return value;
}

function optionalId(form: FormData, name: string): number | null {
  const raw = field(form, name);
  if (!raw) return null;
  const value = Number(raw);
  if (!Number.isSafeInteger(value) || value < 1) throw fieldError(name, invalidRecordMessage(labelOf(name)));
  return value;
}

function dateField(form: FormData, name: string): string {
  const value = required(form, name, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw fieldError(name, invalidDateMessage(labelOf(name)));
  const parsed = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) throw fieldError(name, invalidDateMessage(labelOf(name)));
  return value;
}

function failure(error: unknown, defaultField?: string): ProductionState {
  return formFailure(error, {
    fallback: GENERIC_FAILURE_MESSAGE,
    logLabel: "Production operation failed",
    defaultField,
    duplicate: { message: DUPLICATE_RECORD_MESSAGE },
  });
}

function revalidateProduction(poId?: number) {
  revalidatePath("/");
  revalidatePath("/techpacks");
  revalidatePath("/purchase-orders");
  revalidatePath("/inward");
  revalidatePath("/reports");
  revalidatePath("/jobbers");
  revalidatePath("/pp-approvals");
  revalidatePath("/products");
  if (poId) revalidatePath(`/purchase-orders/${poId}`);
}

export async function decidePpSample(_previous: ProductionState, form: FormData): Promise<ProductionState> {
  const actor = await requirePermission("pp_approve");
  try {
    const techpackId = positiveId(form, "techpack_id");
    const decision = field(form, "decision");
    if (decision !== "approved" && decision !== "rejected" && decision !== "pending") {
      throw new ValidationError("Choose approve, reject or reset.");
    }
    const notes = field(form, "notes", 2000);
    if (decision === "rejected" && !notes) throw fieldError("notes", "Add a reason when rejecting a PP sample.");
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const pack = await client.query<{ pp_status: PpStatus }>("SELECT pp_status FROM techpacks WHERE id = $1 FOR UPDATE", [techpackId]);
      if (!pack.rows[0]) throw new ValidationError("This tech pack no longer exists.");
      if (decision !== "approved") {
        const active = await client.query<{ count: number }>(`
          SELECT count(*)::int AS count FROM fob_po_items i
          JOIN fob_pos p ON p.id = i.fob_po_id
          WHERE i.techpack_id = $1 AND p.status IN ('draft','issued','partly_received')`, [techpackId]);
        if (active.rows[0].count > 0) throw new ValidationError("This style is on an open or draft FOB PO. Close or cancel that PO before changing its PP status.");
      }
      await client.query(`
        UPDATE techpacks SET pp_status = $1, pp_notes = $2,
          pp_submitted_at = COALESCE(pp_submitted_at, now()),
          pp_decided_at = now(), pp_decided_by = $3, updated_at = now()
        WHERE id = $4`, [decision, notes || null, actor.id, techpackId]);
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
    revalidateProduction();
    revalidatePath(`/techpacks/${techpackId}`);
    revalidatePath("/pp-approvals");
    return {
      success:
        decision === "approved"
          ? "PP sample approved. This style can now be added to a FOB PO."
          : decision === "rejected"
            ? "PP sample rejected. The style stays locked until it is approved."
            : "PP status reset to pending.",
    };
  } catch (error) {
    return failure(error);
  }
}

export async function resubmitPpSample(_previous: ProductionState, form: FormData): Promise<ProductionState> {
  await requirePermission("techpacks_manage");
  try {
    const techpackId = positiveId(form, "techpack_id");
    const result = await pool.query<{ pp_rework_count: number }>(
      `UPDATE techpacks SET pp_status = 'pending', pp_rework_count = pp_rework_count + 1,
         pp_submitted_at = now(), updated_at = now()
       WHERE id = $1 AND pp_status = 'rejected'
       RETURNING pp_rework_count`, [techpackId]);
    const updated = result.rows[0];
    if (!updated) throw new ValidationError("Only a rejected sample can be resubmitted for approval.");
    revalidateProduction();
    revalidatePath(`/techpacks/${techpackId}`);
    revalidatePath("/pp-approvals");
    return { success: `Sample resubmitted for approval (rework round ${updated.pp_rework_count}).` };
  } catch (error) {
    return failure(error);
  }
}

export async function saveJobber(_previous: ProductionState, form: FormData): Promise<ProductionState> {
  await requirePermission("production_manage");
  try {
    const id = optionalId(form, "id");
    const name = required(form, "name", 120).replace(/\s+/g, " ");
    const contact = field(form, "contact_name", 120);
    const phone = field(form, "phone", 40);
    const email = field(form, "email", 254).toLowerCase();
    const active = form.get("is_active") === "on";
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw fieldError("email", "Enter a valid email address.");
    if (id) {
      const result = await pool.query(
        "UPDATE jobbers SET name=$1, contact_name=$2, phone=$3, email=$4, is_active=$5, updated_at=now() WHERE id=$6",
        [name, contact || null, phone || null, email || null, active, id]);
      if (!result.rowCount) throw new ValidationError("This jobber no longer exists.");
    } else {
      await pool.query(
        "INSERT INTO jobbers (name, contact_name, phone, email, is_active) VALUES ($1,$2,$3,$4,$5)",
        [name, contact || null, phone || null, email || null, active]);
    }
    revalidateProduction();
    return { success: id ? "Jobber updated." : "Jobber created." };
  } catch (error) {
    return formFailure(error, {
      fallback: GENERIC_FAILURE_MESSAGE,
      logLabel: "Production operation failed",
      duplicate: { message: "A jobber with this name already exists.", field: "name" },
    });
  }
}

export async function setJobberActive(form: FormData): Promise<void> {
  await requirePermission("production_manage");
  const id = positiveId(form, "id");
  const active = form.get("active") === "true";
  await pool.query("UPDATE jobbers SET is_active=$1, updated_at=now() WHERE id=$2", [active, id]);
  revalidateProduction();
}

export async function assignJobberToTechpack(_previous: ProductionState, form: FormData): Promise<ProductionState> {
  const actor = await requirePermission("production_manage");
  try {
    const techpackId = positiveId(form, "techpack_id");
    const jobberId = positiveId(form, "jobber_id");
    const rate = required(form, "rate", 20);
    const operation = required(form, "operation_type", 120);
    if (!/^\d{1,9}(\.\d{1,2})?$/.test(rate)) throw fieldError("rate", "Enter a valid rate with up to two decimals.");
    const jobber = await pool.query("SELECT id FROM jobbers WHERE id=$1 AND is_active", [jobberId]);
    if (!jobber.rows[0]) throw fieldError("jobber_id", "Choose an active jobber.");
    const pack = await pool.query("SELECT id FROM techpacks WHERE id=$1", [techpackId]);
    if (!pack.rows[0]) throw new ValidationError("This tech pack no longer exists.");
    await pool.query(`
      INSERT INTO techpack_jobbers (techpack_id, jobber_id, rate, operation_type, created_by)
      VALUES ($1,$2,$3,$4,$5)
      ON CONFLICT (techpack_id, jobber_id)
      DO UPDATE SET rate=EXCLUDED.rate, operation_type=EXCLUDED.operation_type`,
      [techpackId, jobberId, rate, operation, actor.id]);
    revalidateProduction();
    revalidatePath(`/techpacks/${techpackId}`);
    return { success: "Jobber rate saved for this style." };
  } catch (error) {
    return failure(error);
  }
}

export async function removeTechpackJobber(form: FormData): Promise<ProductionState> {
  await requirePermission("production_manage");
  try {
    const techpackId = positiveId(form, "techpack_id");
    const jobberId = positiveId(form, "jobber_id");
    const used = await pool.query<{ count: number }>(`
      SELECT count(*)::int AS count FROM fob_po_items i
      JOIN fob_pos p ON p.id = i.fob_po_id
      WHERE i.techpack_id = $1 AND p.jobber_id = $2 AND p.status <> 'cancelled'`, [techpackId, jobberId]);
    if (used.rows[0].count > 0) throw new ValidationError("This jobber is on an active FOB PO for the style. Close or cancel the PO first.");
    await pool.query("DELETE FROM techpack_jobbers WHERE techpack_id=$1 AND jobber_id=$2", [techpackId, jobberId]);
    revalidateProduction();
    revalidatePath(`/techpacks/${techpackId}`);
    return { success: "Jobber removed from this style." };
  } catch (error) {
    return failure(error);
  }
}

export async function createPurchaseOrder(_previous: ProductionState, form: FormData): Promise<ProductionState> {
  const actor = await requirePermission("production_manage");
  let createdId: number | null = null;
  try {
    const jobberId = positiveId(form, "jobber_id");
    const poDate = dateField(form, "po_date");
    const notes = field(form, "notes", 2000);
    const requested = new Map<number, { delivery: string; quantities: Map<string, number> }>();
    for (const key of form.keys()) {
      const match = /^qty_(\d+)_(.+)$/.exec(key);
      if (!match) continue;
      const techpackId = Number(match[1]);
      const size = match[2];
      const raw = form.get(key);
      if (typeof raw !== "string" || !raw.trim()) continue;
      const quantity = Number(raw);
      if (!Number.isSafeInteger(quantity) || quantity < 0 || quantity > 10000) {
        throw fieldError(key, "Enter a whole-piece quantity between 1 and 10,000.");
      }
      if (!quantity) continue;
      const entry = requested.get(techpackId) ?? { delivery: "", quantities: new Map<string, number>() };
      entry.quantities.set(size, quantity);
      requested.set(techpackId, entry);
    }
    if (!requested.size) throw new ValidationError("Add a quantity for at least one style and size.");
    let totalPieces = 0;
    for (const [techpackId, entry] of requested) {
      const deliveryKey = `delivery_${techpackId}`;
      if (!field(form, deliveryKey, 10)) {
        throw fieldError(deliveryKey, "Choose a delivery date for this style.");
      }
      entry.delivery = dateField(form, deliveryKey);
      if (entry.delivery < poDate) throw fieldError(deliveryKey, "Delivery date cannot be before the PO date.");
      totalPieces += [...entry.quantities.values()].reduce((sum, value) => sum + value, 0);
    }
    if (totalPieces > 5000) throw new ValidationError("A single FOB PO can contain up to 5,000 pieces. Split it into smaller POs.");

    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const jobber = await client.query<{ id: number; name: string }>("SELECT id, name FROM jobbers WHERE id=$1 AND is_active FOR SHARE", [jobberId]);
      if (!jobber.rows[0]) throw fieldError("jobber_id", "Choose an active jobber.");
      const ids = [...requested.keys()];
      const packs = await client.query<{
        id: number;
        name: string;
        code: string;
        color_family: string;
        description: string | null;
        pp_status: PpStatus;
      }>("SELECT id,name,code,color_family,description,pp_status FROM techpacks WHERE id = ANY($1::int[]) FOR SHARE", [ids]);
      if (packs.rows.length !== ids.length) throw new ValidationError("One of the selected styles no longer exists.");
      for (const pack of packs.rows) {
        if (pack.pp_status !== "approved") throw new ValidationError(`${pack.code} does not have an approved PP sample and cannot be ordered.`);
      }
      const assignments = await client.query<{ techpack_id: number }>(
        "SELECT techpack_id FROM techpack_jobbers WHERE jobber_id=$1 AND techpack_id = ANY($2::int[])", [jobberId, ids]);
      if (assignments.rows.length !== ids.length) throw fieldError("jobber_id", "Choose a jobber listed on every selected style.");
      const sizes = await client.query<{ techpack_id: number; size: string }>(
        "SELECT DISTINCT techpack_id, size FROM erp_skus WHERE techpack_id = ANY($1::int[])", [ids]);
      const validSizes = new Set(sizes.rows.map((row) => `${row.techpack_id}:${row.size}`));
      for (const [techpackId, entry] of requested) {
        for (const size of entry.quantities.keys()) {
          if (!validSizes.has(`${techpackId}:${size}`)) throw new ValidationError("A selected size is no longer available for this style.");
        }
      }

      const seq = await client.query<{ value: number }>("SELECT nextval('fob_po_number_seq')::int AS value");
      const poNumber = poNumberForSequence(seq.rows[0].value);
      const po = await client.query<{ id: number }>(
        "INSERT INTO fob_pos (po_number, jobber_id, po_date, notes, created_by, source) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id",
        [poNumber, jobberId, poDate, notes || null, actor.id, DEFAULT_PO_SOURCE]);
      createdId = po.rows[0].id;

      const itemRows: {
        techpack_id: number;
        size: string;
        quantity: number;
        delivery_date: string;
      }[] = [];
      for (const [techpackId, entry] of requested) {
        for (const [size, quantity] of entry.quantities) {
          itemRows.push({ techpack_id: techpackId, size, quantity, delivery_date: entry.delivery });
        }
      }
      const insertedItems = await client.query<{ id: number; techpack_id: number; size: string }>(`
        INSERT INTO fob_po_items (fob_po_id, techpack_id, size, quantity, delivery_date, original_delivery_date)
        SELECT $1, x.techpack_id, x.size, x.quantity, x.delivery_date::date, x.delivery_date::date
        FROM jsonb_to_recordset($2::jsonb) AS x(techpack_id int, size text, quantity int, delivery_date text)
        RETURNING id, techpack_id, size`,
        [createdId, JSON.stringify(itemRows)]);
      const packMap = new Map(packs.rows.map((pack) => [pack.id, pack]));
      const quantities = new Map<string, number>();
      for (const [techpackId, entry] of requested) {
        for (const [size, quantity] of entry.quantities) quantities.set(`${techpackId}:${size}`, quantity);
      }
      const pieces: { item_id: number; piece_no: number; code: string }[] = [];
      for (const item of insertedItems.rows) {
        const pack = packMap.get(item.techpack_id);
        if (!pack) continue;
        const quantity = quantities.get(`${item.techpack_id}:${item.size}`) ?? 0;
        const sku = styleSkuLabel(pack);
        for (let pieceNo = 1; pieceNo <= quantity; pieceNo++) {
          pieces.push({ item_id: item.id, piece_no: pieceNo, code: `${poNumber}_${sku}_${item.size}_${String(pieceNo).padStart(3, "0")}` });
        }
      }
      await client.query(`
        INSERT INTO fob_pieces (item_id, piece_no, code)
        SELECT x.item_id, x.piece_no, x.code
        FROM jsonb_to_recordset($1::jsonb) AS x(item_id int, piece_no int, code text)`,
        [JSON.stringify(pieces)]);
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
    revalidateProduction(createdId ?? undefined);
    redirect(`/purchase-orders/${createdId}`);
  } catch (error) {
    if (typeof error === "object" && error !== null && "digest" in error) throw error;
    return failure(error);
  }
}

export async function updatePurchaseOrderStatus(_previous: ProductionState, form: FormData): Promise<ProductionState> {
  const actor = await requirePermission("production_manage");
  try {
    const poId = positiveId(form, "po_id");
    const action = field(form, "action");
    const client = await pool.connect();
    let message = "";
    try {
      await client.query("BEGIN");
      const result = await client.query<{ po_number: string; status: string }>(
        "SELECT po_number, status FROM fob_pos WHERE id=$1 FOR UPDATE", [poId]);
      const po = result.rows[0];
      if (!po) throw new ValidationError("This FOB PO no longer exists.");
      if (action === "issue") {
        if (po.status !== "draft") throw new ValidationError("Only a draft PO can be issued.");
        await client.query("UPDATE fob_pos SET status='issued', issued_at=now(), updated_at=now() WHERE id=$1", [poId]);
        message = `${po.po_number} issued. The QR sheet is ready to share with the jobber.`;
      } else if (action === "close") {
        if (!["issued", "partly_received"].includes(po.status)) throw new ValidationError("Only an issued or partly received PO can be closed.");
        await client.query("UPDATE fob_pos SET status='closed', closed_at=now(), closed_by=$2, updated_at=now() WHERE id=$1", [poId, actor.id]);
        const short = await client.query<{ shortfall: number }>(`
          SELECT coalesce(sum(i.quantity - coalesce(s.received, 0)), 0)::int AS shortfall
          FROM fob_po_items i
          LEFT JOIN (SELECT item_id, count(*)::int AS received FROM inward_scans GROUP BY item_id) s ON s.item_id = i.id
          WHERE i.fob_po_id = $1`, [poId]);
        message = short.rows[0].shortfall > 0
          ? `${po.po_number} closed with a shortfall of ${short.rows[0].shortfall} pieces.`
          : `${po.po_number} closed. All pieces were received.`;
      } else if (action === "cancel") {
        if (!["draft", "issued"].includes(po.status)) throw new ValidationError("Only a draft or issued PO can be cancelled.");
        const scans = await client.query<{ count: number }>("SELECT count(*)::int AS count FROM inward_scans WHERE fob_po_id=$1", [poId]);
        if (scans.rows[0].count > 0) throw new ValidationError("This PO already has inward scans. Close it with a shortfall instead.");
        await client.query("UPDATE fob_pos SET status='cancelled', updated_at=now() WHERE id=$1", [poId]);
        message = `${po.po_number} cancelled.`;
      } else {
        throw new ValidationError("Choose a valid PO action.");
      }
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
    revalidateProduction(poId);
    return { success: message };
  } catch (error) {
    return failure(error);
  }
}

export async function updateItemDeliveryDate(_previous: ProductionState, form: FormData): Promise<ProductionState> {
  await requirePermission("production_manage");
  try {
    const itemId = positiveId(form, "item_id");
    const deliveryDate = dateField(form, "delivery_date");
    const client = await pool.connect();
    let poId = 0;
    let originalDate = "";
    try {
      await client.query("BEGIN");
      const result = await client.query<{
        po_id: number;
        po_date: string;
        original_delivery_date: string;
        status: string;
      }>(`
        SELECT i.fob_po_id AS po_id, to_char(p.po_date,'YYYY-MM-DD') AS po_date,
               to_char(i.original_delivery_date,'YYYY-MM-DD') AS original_delivery_date, p.status
        FROM fob_po_items i
        JOIN fob_pos p ON p.id = i.fob_po_id
        WHERE i.id = $1
        FOR UPDATE OF i, p`, [itemId]);
      const item = result.rows[0];
      if (!item) throw new ValidationError("This PO line no longer exists.");
      if (!["draft", "issued", "partly_received"].includes(item.status)) {
        throw new ValidationError("Delivery dates cannot be changed after the PO is closed or cancelled.");
      }
      if (deliveryDate < item.po_date) throw fieldError("delivery_date", "Delivery date cannot be before the PO date.");
      await client.query("UPDATE fob_po_items SET delivery_date = $1 WHERE id = $2", [deliveryDate, itemId]);
      poId = item.po_id;
      originalDate = item.original_delivery_date;
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
    revalidateProduction(poId);
    return {
      success: `Delivery date revised. The original date (${new Date(`${originalDate}T00:00:00`).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}) is retained and on-time is still judged against it.`,
    };
  } catch (error) {
    return failure(error, "delivery_date");
  }
}

type ScanPieceRow = {
  piece_id: number;
  piece_no: number;
  piece_status: string;
  scanned_at: string | null;
  item_id: number;
  techpack_id: number;
  size: string;
  quantity: number;
  po_id: number;
  po_number: string;
  po_status: string;
  code: string;
  color_family: string;
  description: string | null;
  product_name: string;
};

async function performScan(input: {
  piece: ScanPieceRow;
  entryType: "scanned" | "manual";
  note: string;
  actorId: number;
}): Promise<ProductionState["scan"]> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const locked = await client.query<{ status: string; scanned_at: string | null }>(
      "SELECT status, scanned_at FROM fob_pieces WHERE id=$1 FOR UPDATE", [input.piece.piece_id]);
    if (!locked.rows[0]) throw new ValidationError("This piece no longer exists.");
    if (locked.rows[0].status !== "pending") {
      const when = locked.rows[0].scanned_at ? ` at ${new Date(locked.rows[0].scanned_at).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}` : "";
      throw new ValidationError(`Piece ${String(input.piece.piece_no).padStart(3, "0")} was already scanned${when}.`);
    }
    const po = await client.query<{ status: string; po_number: string }>(
      "SELECT status, po_number FROM fob_pos WHERE id=$1 FOR UPDATE", [input.piece.po_id]);
    if (!po.rows[0]) throw new ValidationError("This FOB PO no longer exists.");
    if (!["issued", "partly_received"].includes(po.rows[0].status)) {
      throw new ValidationError(po.rows[0].status === "draft" ? "Issue the FOB PO before scanning inward pieces." : "This FOB PO is not open for inward scanning.");
    }
    await client.query(`
      INSERT INTO inward_scans (piece_id, fob_po_id, item_id, entry_type, scanned_by, note)
      VALUES ($1,$2,$3,$4,$5,$6)`,
      [input.piece.piece_id, input.piece.po_id, input.piece.item_id, input.entryType, input.actorId, input.note || null]);
    await client.query(
      "UPDATE fob_pieces SET status=$1, scanned_at=now(), scanned_by=$2 WHERE id=$3",
      [input.entryType === "manual" ? "manual" : "scanned", input.actorId, input.piece.piece_id]);
    const progress = await client.query<{ received: number; ordered: number; pending: number }>(`
      SELECT
        (SELECT count(s.id)::int FROM inward_scans s WHERE s.fob_po_id = $1) AS received,
        (SELECT coalesce(sum(i.quantity), 0)::int FROM fob_po_items i WHERE i.fob_po_id = $1) AS ordered,
        (SELECT coalesce(sum(i.quantity), 0)::int FROM fob_po_items i WHERE i.fob_po_id = $1)
          - (SELECT count(s.id)::int FROM inward_scans s WHERE s.fob_po_id = $1) AS pending`, [input.piece.po_id]);
    const pending = progress.rows[0].pending;
    await client.query(`
      UPDATE fob_pos SET
        status = CASE WHEN $2 = 0 THEN 'closed' ELSE 'partly_received' END,
        closed_at = CASE WHEN $2 = 0 THEN now() ELSE closed_at END,
        updated_at = now()
      WHERE id = $1`, [input.piece.po_id, pending]);
    await client.query("COMMIT");
    return {
      po_id: input.piece.po_id,
      po_number: input.piece.po_number,
      sku_label: styleSkuLabel(input.piece),
      size: input.piece.size,
      piece_no: input.piece.piece_no,
      entry_type: input.entryType,
      received: progress.rows[0].received,
      ordered: progress.rows[0].ordered,
      complete: pending === 0,
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function scanPiece(_previous: ProductionState, form: FormData): Promise<ProductionState> {
  const actor = await requirePermission("inward");
  let poId: number | undefined;
  const mode = form.get("mode") === "manual" ? "manual" : "scan";
  try {
    let piece: ScanPieceRow | undefined;
    if (mode === "manual") {
      const po = positiveId(form, "po_id");
      const itemId = positiveId(form, "item_id");
      const pieceNo = positiveId(form, "piece_no");
      if (pieceNo > 10000) throw fieldError("piece_no", "Enter a valid piece number.");
      poId = po;
      const result = await pool.query<ScanPieceRow>(`
        SELECT fp.id AS piece_id, fp.piece_no, fp.status AS piece_status, fp.scanned_at,
               i.id AS item_id, i.techpack_id, i.size, i.quantity,
               p.id AS po_id, p.po_number, p.status AS po_status,
               t.code, t.color_family, t.description, t.name AS product_name
        FROM fob_pieces fp
        JOIN fob_po_items i ON i.id = fp.item_id
        JOIN fob_pos p ON p.id = i.fob_po_id
        JOIN techpacks t ON t.id = i.techpack_id
        WHERE fp.item_id = $1 AND fp.piece_no = $2 AND i.fob_po_id = $3`, [itemId, pieceNo, po]);
      piece = result.rows[0];
      if (!piece) throw new ValidationError("That piece number was not found on the selected style and PO.");
    } else {
      const code = required(form, "code", 500);
      const result = await pool.query<ScanPieceRow>(`
        SELECT fp.id AS piece_id, fp.piece_no, fp.status AS piece_status, fp.scanned_at,
               i.id AS item_id, i.techpack_id, i.size, i.quantity,
               p.id AS po_id, p.po_number, p.status AS po_status,
               t.code, t.color_family, t.description, t.name AS product_name
        FROM fob_pieces fp
        JOIN fob_po_items i ON i.id = fp.item_id
        JOIN fob_pos p ON p.id = i.fob_po_id
        JOIN techpacks t ON t.id = i.techpack_id
        WHERE lower(fp.code) = lower($1)`, [code]);
      piece = result.rows[0];
      if (!piece) throw new ValidationError("QR not found. Check the code, or use manual entry if the QR is damaged.");
    }
    poId = piece.po_id;
    if (!["issued", "partly_received"].includes(piece.po_status)) {
      throw new ValidationError(piece.po_status === "draft" ? "Issue the FOB PO before scanning inward pieces." : "This FOB PO is not open for inward scanning.");
    }
    if (piece.piece_status !== "pending") {
      const when = piece.scanned_at ? ` at ${new Date(piece.scanned_at).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}` : "";
      throw new ValidationError(`Piece ${String(piece.piece_no).padStart(3, "0")} was already scanned${when}.`);
    }
    const scan = await performScan({ piece, entryType: mode === "manual" ? "manual" : "scanned", note: field(form, "note", 300), actorId: actor.id });
    revalidateProduction(poId);
    return {
      success: `Piece ${String(scan!.piece_no).padStart(3, "0")} received · ${scan!.sku_label} · ${scan!.size} · ${scan!.received} of ${scan!.ordered} pieces scanned.`,
      scan,
    };
  } catch (error) {
    if (poId) revalidateProduction(poId);
    return failure(error, SCAN_INPUT_FIELD[mode]);
  }
}
