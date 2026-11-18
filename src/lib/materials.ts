import { query } from "./db";

export type MaterialKind = "fabric" | "trim";
export type MaterialTag = { id: number; kind: MaterialKind; name: string };
export type MaterialAssignment = MaterialTag & { sku_id: number };
export async function getMaterialTags(): Promise<MaterialTag[]> {
  return (await query<MaterialTag>("SELECT id,kind,name FROM material_tags ORDER BY lower(name),id")).rows;
}
export async function getMaterialAssignments(techpackId: number): Promise<MaterialAssignment[]> {
  return (await query<MaterialAssignment>(`SELECT t.id,t.kind,t.name,m.sku_id FROM sku_material_tags m JOIN material_tags t ON t.id=m.tag_id JOIN erp_skus s ON s.id=m.sku_id WHERE s.techpack_id=$1 ORDER BY t.kind,lower(t.name)`, [techpackId])).rows;
}
