import { query } from "./db";
import type { MaterialKind } from "./material-kinds";

export type { MaterialKind };
export { MATERIAL_KINDS, isMaterialKind } from "./material-kinds";
export type MaterialTag = { id: number; kind: MaterialKind; name: string };
export type MaterialAssignment = MaterialTag & { sku_id: number };
export async function getMaterialTags(): Promise<MaterialTag[]> {
  return (await query<MaterialTag>("SELECT id,kind,name FROM material_tags ORDER BY lower(name),id")).rows;
}
export async function getMaterialAssignments(techpackId: number): Promise<MaterialAssignment[]> {
  return (await query<MaterialAssignment>(`SELECT t.id,t.kind,t.name,m.sku_id FROM sku_material_tags m JOIN material_tags t ON t.id=m.tag_id JOIN erp_skus s ON s.id=m.sku_id WHERE s.techpack_id=$1 ORDER BY t.kind,lower(t.name)`, [techpackId])).rows;
}

export type MaterialMasterRow = MaterialTag & { created: string; sku_count: number; style_count: number };

export async function getMaterialMaster(kind: MaterialKind, search = ""): Promise<MaterialMasterRow[]> {
  const { rows } = await query<MaterialMasterRow>(`
    SELECT t.id, t.kind, t.name, to_char(t.created_at, 'DD Mon YYYY') AS created,
           count(DISTINCT m.sku_id)::int AS sku_count, count(DISTINCT s.techpack_id)::int AS style_count
    FROM material_tags t
    LEFT JOIN sku_material_tags m ON m.tag_id = t.id
    LEFT JOIN erp_skus s ON s.id = m.sku_id
    WHERE t.kind = $1 AND ($2 = '' OR t.name ILIKE '%' || $2 || '%')
    GROUP BY t.id ORDER BY lower(t.name), t.id`, [kind, search]);
  return rows;
}
