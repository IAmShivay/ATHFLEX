"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/dal";
import { pool, query } from "@/lib/db";
import type { MaterialTag } from "@/lib/materials";
import type { FormErrorState } from "@/lib/form-errors";

export type MaterialResult = FormErrorState & { success?: string; tag?: MaterialTag };
function id(value: FormDataEntryValue | null): number {
  const n = Number(value);
  if (!Number.isSafeInteger(n) || n < 1) throw new Error("Choose a valid record.");
  return n;
}

export async function createMaterialTag(form: FormData): Promise<MaterialResult> {
  const actor = await requirePermission("techpacks_manage");
  const kind = String(form.get("kind") ?? "");
  const name = String(form.get("name") ?? "").trim().replace(/\s+/g, " ");
  if (kind !== "fabric" && kind !== "trim") return { error: "Choose fabric or trim." };
  if (!name || name.length > 120 || /[\x00-\x1f\x7f]/.test(name)) return { fieldErrors: { name: "Enter a tag name of 1–120 characters." } };
  try {
    const { rows } = await query<MaterialTag>(`INSERT INTO material_tags(kind,name,created_by) VALUES ($1,$2,$3) ON CONFLICT (kind,lower(name)) DO UPDATE SET name=material_tags.name RETURNING id,kind,name`, [kind,name,actor.id]);
    revalidatePath("/techpacks", "layout");
    return { tag: rows[0], success: "Tag ready to use." };
  } catch (error) { console.error("Material tag creation failed", error); return { error: "Could not create the tag. Please try again." }; }
}

export async function applyMaterialTags(form: FormData): Promise<MaterialResult> {
  const actor = await requirePermission("techpacks_manage");
  try {
    const packId = id(form.get("techpack_id"));
    const kind = String(form.get("kind") ?? "");
    const scope = String(form.get("scope") ?? "");
    const ids = [...new Set(form.getAll("tag_ids").map(id))];
    if ((kind !== "fabric" && kind !== "trim") || !ids.length || ids.length > 50) return { error: "Select between 1 and 50 tags." };
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const pack = await client.query("SELECT id FROM techpacks WHERE id=$1 FOR UPDATE", [packId]);
      if (!pack.rows.length) throw new Error("This tech pack no longer exists.");
      const tags = await client.query("SELECT id FROM material_tags WHERE kind=$1 AND id=ANY($2::int[])", [kind,ids]);
      if (tags.rows.length !== ids.length) throw new Error("Some selected tags are no longer available.");
      const skuIds = await client.query<{ id: number }>("SELECT id FROM erp_skus WHERE techpack_id=$1 AND ($2='all' OR ($3::int IS NOT NULL AND id=$3) OR ($4::text IS NOT NULL AND color=$4))", [packId,scope,scope.startsWith("sku:") ? id(scope.slice(4)) : null,scope.startsWith("color:") ? scope.slice(6) : null]);
      if (!skuIds.rows.length) throw new Error("Choose SKUs belonging to this tech pack.");
      await client.query(`INSERT INTO sku_material_tags(sku_id,tag_id,assigned_by) SELECT s,t,$3 FROM unnest($1::int[]) s CROSS JOIN unnest($2::int[]) t ON CONFLICT (sku_id,tag_id) DO NOTHING`, [skuIds.rows.map((sku) => sku.id),ids,actor.id]);
      await client.query("COMMIT");
    } catch (error) { await client.query("ROLLBACK"); throw error; } finally { client.release(); }
    revalidatePath(`/techpacks/${packId}`);
    return { success: "Tags applied. Existing assignments were kept." };
  } catch (error) {
    if (error instanceof Error && !("code" in error)) return { error: error.message };
    console.error("Material assignment failed",error); return { error: "Could not apply the tags." };
  }
}

export async function removeMaterialTag(form: FormData): Promise<MaterialResult> {
  await requirePermission("techpacks_manage");
  try {
    const packId=id(form.get("techpack_id")),skuId=id(form.get("sku_id")),tagId=id(form.get("tag_id"));
    await query("DELETE FROM sku_material_tags m USING erp_skus s WHERE m.sku_id=s.id AND s.techpack_id=$1 AND m.sku_id=$2 AND m.tag_id=$3", [packId,skuId,tagId]);
    revalidatePath(`/techpacks/${packId}`);
    return { success: "Assignment removed. The tag remains available for reuse." };
  } catch (error) { console.error("Material removal failed",error); return { error: "Could not remove the assignment." }; }
}

export type MaterialMasterState = FormErrorState & { success?: string };

export async function saveMaterialMaster(_previous: MaterialMasterState, form: FormData): Promise<MaterialMasterState> {
  const actor = await requirePermission("techpacks_manage");
  const kind = String(form.get("kind") ?? "");
  const name = String(form.get("name") ?? "").trim().replace(/\s+/g, " ");
  if (kind !== "fabric" && kind !== "trim") return { error: "Choose fabric or trim." };
  const label = kind === "fabric" ? "Fabric" : "Trim";
  if (!name) return { fieldErrors: { name: `${label} name is required.` } };
  if (name.length > 120 || /[\x00-\x1f\x7f]/.test(name)) return { fieldErrors: { name: `${label} name must be 1–120 characters, without control characters.` } };
  try {
    const { rows } = await query(`INSERT INTO material_tags(kind,name,created_by) VALUES ($1,$2,$3) ON CONFLICT (kind,lower(name)) DO NOTHING RETURNING id`, [kind, name, actor.id]);
    if (!rows.length) return { fieldErrors: { name: `${label} “${name}” already exists in the master.` } };
    revalidatePath("/materials", "layout");
    revalidatePath("/techpacks", "layout");
    return { success: `${label} “${name}” added to the master.` };
  } catch (error) {
    console.error("Material master creation failed", error);
    return { error: `Could not add the ${kind}. Please try again.` };
  }
}
