import { query } from "./db";
import type { StyleProgress, WorkflowCounts } from "./workflow";
import type { PpStatus } from "./production";

const LIVE_PO_STATUSES = "('draft','issued','partly_received','closed')";
const ISSUED_PO_STATUSES = "('issued','partly_received','closed')";

type StyleProgressRow = {
  fabric_assigned: boolean;
  trim_assigned: boolean;
  sku_count: number;
  pp_status: PpStatus;
  pp_rework_count: number;
  po_count: number;
  issued_po_count: number;
  open_po_count: number;
  pieces_received: number;
};

export async function getStyleProgress(techpackId: number): Promise<StyleProgress | null> {
  const { rows } = await query<StyleProgressRow>(`
    SELECT
      EXISTS (SELECT 1 FROM sku_material_tags m JOIN material_tags t ON t.id = m.tag_id JOIN erp_skus s ON s.id = m.sku_id
              WHERE s.techpack_id = $1 AND t.kind = 'fabric') AS fabric_assigned,
      EXISTS (SELECT 1 FROM sku_material_tags m JOIN material_tags t ON t.id = m.tag_id JOIN erp_skus s ON s.id = m.sku_id
              WHERE s.techpack_id = $1 AND t.kind = 'trim') AS trim_assigned,
      (SELECT count(*)::int FROM erp_skus WHERE techpack_id = $1) AS sku_count,
      k.pp_status, k.pp_rework_count,
      (SELECT count(DISTINCT p.id)::int FROM fob_po_items i JOIN fob_pos p ON p.id = i.fob_po_id
        WHERE i.techpack_id = $1 AND p.status IN ${LIVE_PO_STATUSES}) AS po_count,
      (SELECT count(DISTINCT p.id)::int FROM fob_po_items i JOIN fob_pos p ON p.id = i.fob_po_id
        WHERE i.techpack_id = $1 AND p.status IN ${ISSUED_PO_STATUSES}) AS issued_po_count,
      (SELECT count(DISTINCT p.id)::int FROM fob_po_items i JOIN fob_pos p ON p.id = i.fob_po_id
        WHERE i.techpack_id = $1 AND p.status IN ('issued','partly_received')) AS open_po_count,
      (SELECT count(s.id)::int FROM inward_scans s JOIN fob_po_items i ON i.id = s.item_id WHERE i.techpack_id = $1) AS pieces_received
    FROM techpacks k WHERE k.id = $1`, [techpackId]);
  const row = rows[0];
  if (!row) return null;
  return {
    fabricAssigned: row.fabric_assigned,
    trimAssigned: row.trim_assigned,
    skuCount: row.sku_count,
    ppStatus: row.pp_status,
    reworkRounds: row.pp_rework_count,
    poCount: row.po_count,
    issuedPoCount: row.issued_po_count,
    openPoCount: row.open_po_count,
    piecesReceived: row.pieces_received,
  };
}

export async function getWorkflowCounts(): Promise<WorkflowCounts> {
  const { rows } = await query<WorkflowCounts>(`
    SELECT
      (SELECT count(*)::int FROM techpacks) AS styles,
      (SELECT count(DISTINCT s.techpack_id)::int FROM sku_material_tags m JOIN material_tags t ON t.id = m.tag_id JOIN erp_skus s ON s.id = m.sku_id WHERE t.kind = 'fabric') AS "fabricStyles",
      (SELECT count(DISTINCT s.techpack_id)::int FROM sku_material_tags m JOIN material_tags t ON t.id = m.tag_id JOIN erp_skus s ON s.id = m.sku_id WHERE t.kind = 'trim') AS "trimStyles",
      (SELECT count(DISTINCT techpack_id)::int FROM erp_skus) AS "styledWithSkus",
      (SELECT count(*)::int FROM erp_skus) AS skus,
      (SELECT count(*)::int FROM techpacks WHERE pp_status = 'pending') AS "ppPending",
      (SELECT count(*)::int FROM techpacks WHERE pp_status = 'rejected') AS "ppRework",
      (SELECT count(*)::int FROM techpacks WHERE pp_status = 'approved') AS "ppApproved",
      (SELECT count(*)::int FROM fob_pos WHERE status IN ${LIVE_PO_STATUSES}) AS pos,
      (SELECT count(*)::int FROM fob_pos WHERE status IN ${ISSUED_PO_STATUSES}) AS "issuedPos",
      (SELECT coalesce(sum(i.quantity), 0)::int FROM fob_po_items i JOIN fob_pos p ON p.id = i.fob_po_id WHERE p.status IN ${ISSUED_PO_STATUSES}) AS "piecesOrdered",
      (SELECT count(*)::int FROM inward_scans) AS "piecesReceived"`);
  return rows[0];
}
