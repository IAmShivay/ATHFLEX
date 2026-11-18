"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { pool } from "@/lib/db";
import { requirePermission } from "@/lib/dal";
import { buildSkuMatrix } from "@/lib/sku-matrix";
import type { ShopifyOption } from "@/lib/techpacks";
import { getSelectedShopifyVariants } from "@/lib/shopify-variants";
import { storeFile, discardNewUpload, type StoredFile } from "@/lib/file-storage";
import { fieldError, fieldErrorsFrom, formFailure, ValidationError, type FieldErrors, type FormErrorState } from "@/lib/form-errors";

export type TechpackState = FormErrorState & { success?: string };
type Upload = { category: string; name: string; mime: string; data: Buffer };

const UPLOADS_FIELD = "files";
const INVALID_RECORD_MESSAGE = "Choose a valid person or record.";
const REQUIRED_DETAILS = [
  ["name", "Tech pack name"],
  ["code", "Tech pack code"],
  ["season", "Season"],
  ["theme", "Theme"],
  ["order_type", "Order type"],
  ["color_family", "Color family"],
  ["tpg_code", "TPG code"],
] as const;

function labelOf(name: string): string {
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

function positiveId(value: string): number {
  const id = Number(value);
  if (!Number.isSafeInteger(id) || id < 1) throw new ValidationError(INVALID_RECORD_MESSAGE);
  return id;
}

function dropboxError(url: string): string | null {
  let parsed: URL;
  try { parsed = new URL(url); } catch { return "Enter a valid Dropbox link."; }
  return parsed.protocol === "https:" ? null : "Dropbox links must use HTTPS.";
}

async function readUploads(form: FormData, requireOne: boolean): Promise<Upload[]> {
  const entries = ["front", "back", "size_chart", "other"].flatMap((category) =>
    form.getAll(`file_${category}`).filter((entry): entry is File => typeof entry !== "string" && entry.size > 0).map((file) => ({ category, file }))
  );
  if (requireOne && !entries.length) throw fieldError(UPLOADS_FIELD, "Upload at least one tech pack file.");
  if (entries.length > 10 || entries.reduce((sum, entry) => sum + entry.file.size, 0) > 15 * 1024 * 1024) throw fieldError(UPLOADS_FIELD, "Upload up to 10 files totaling no more than 15 MB.");
  const uploads: Upload[] = [];
  for (const { category, file } of entries) {
    if (file.size > 5 * 1024 * 1024) throw fieldError(UPLOADS_FIELD, "Each file must be 5 MB or smaller.");
    const data = Buffer.from(await file.arrayBuffer());
    const name = file.name.split(/[\\/]/).pop()?.replace(/[\x00-\x1f\x7f]/g, "").slice(0, 180) || "attachment";
    const ext = name.split(".").pop()?.toLowerCase();
    const pdf = ext === "pdf" && data.subarray(0, 5).toString() === "%PDF-";
    const png = ext === "png" && data.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
    const jpeg = (ext === "jpg" || ext === "jpeg") && data.subarray(0, 3).equals(Buffer.from([255, 216, 255]));
    const webp = ext === "webp" && data.subarray(0, 4).toString() === "RIFF" && data.subarray(8, 12).toString() === "WEBP";
    const xlsx = ext === "xlsx" && data.subarray(0, 4).equals(Buffer.from([80, 75, 3, 4]));
    if (!pdf && !png && !jpeg && !webp && !xlsx) throw fieldError(UPLOADS_FIELD, `Unsupported or invalid file: ${name}. Use PDF, JPG, PNG, WebP or XLSX.`);
    uploads.push({ category, name, data, mime: pdf ? "application/pdf" : png ? "image/png" : jpeg ? "image/jpeg" : webp ? "image/webp" : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  }
  return uploads;
}

function parseDetails(form: FormData) {
  const errors: FieldErrors = {};
  const person = (key: "director_id" | "designer_id", title: string): number => {
    const value = Number(field(form, key));
    if (Number.isSafeInteger(value) && value >= 1) return value;
    errors[key] = `Select a ${title}.`;
    return 0;
  };
  const name = field(form, "name");
  const code = field(form, "code", 60);
  const director = person("director_id", "director");
  const designer = person("designer_id", "designer");
  const season = field(form, "season");
  const theme = field(form, "theme");
  const brandSku = field(form, "brand_sku", 60).toUpperCase();
  const orderType = field(form, "order_type");
  const colorFamily = field(form, "color_family");
  const tpg = field(form, "tpg_code");
  const cost = field(form, "target_cost", 20);
  const dropbox = field(form, "dropbox_url", 1000);
  const entered: Record<(typeof REQUIRED_DETAILS)[number][0], string> = { name, code, season, theme, order_type: orderType, color_family: colorFamily, tpg_code: tpg };
  for (const [key, title] of REQUIRED_DETAILS) if (!entered[key]) errors[key] = `${title} is required.`;
  if (code && !/^[A-Za-z0-9][A-Za-z0-9_-]{0,59}$/.test(code)) errors.code = "Tech pack code must use letters, numbers, hyphens or underscores.";
  if (brandSku && !/^[A-Z0-9][A-Z0-9_-]{0,59}$/.test(brandSku)) errors.brand_sku = "Brand SKU must use letters, numbers, hyphens or underscores.";
  if (cost && !/^\d{1,10}(\.\d{1,2})?$/.test(cost)) errors.target_cost = "Enter a valid target cost with up to two decimal places.";
  const dropboxProblem = dropbox ? dropboxError(dropbox) : null;
  if (dropboxProblem) errors.dropbox_url = dropboxProblem;
  if (Object.keys(errors).length) throw fieldErrorsFrom(errors);
  return {
    name, code, director, designer, season, theme, brandSku, orderType,
    features: field(form, "key_features", 3000), fabric: field(form, "fabric_details", 3000),
    colorFamily, tpg, cost: cost || null, dropbox: dropbox || null,
    description: field(form, "description", 3000), d2c: form.get("d2c_exclusive") === "on",
    neck: field(form, "neck_type"), sizeType: field(form, "size_type"),
    collection: field(form, "collection_type"), remarks: field(form, "remarks", 3000),
  };
}

function failure(error: unknown): TechpackState {
  return formFailure(error, {
    fallback: "Could not save the tech pack. Please try again.",
    logLabel: "Tech pack operation failed",
    duplicate: { message: "This tech pack code, ERP SKU or Shopify variant is already in use.", field: "code" },
    exposeMessage: true,
  });
}

export async function saveTechpack(_prev: TechpackState, form: FormData): Promise<TechpackState> {
  const actor = await requirePermission("techpacks_manage");
  let id: number | null = null;
  const storedUploads: StoredFile[] = [];
  let commitStarted = false;
  try {
    const rawId = field(form, "id");
    id = rawId ? positiveId(rawId) : null;
    const data = parseDetails(form);
    const uploads = await readUploads(form, !id);
    const matrix = id ? [] : buildSkuMatrix(data.brandSku || data.code, field(form, "colors", 1500), field(form, "sizes", 1500));
    const selected = matrix.map((entry) => field(form, `map_${entry.sku}`, 100));
    let options: ShopifyOption[] = [];
    if (selected.some(Boolean)) {
      const response = await getSelectedShopifyVariants(selected.filter(Boolean));
      if (response.error) throw new Error("Shopify could not be checked. Save without mappings and link variants later.");
      options = response.options;
      if (selected.some((value) => value && !options.some((option) => option.id === value))) throw new Error("A selected Shopify variant is no longer available.");
      const mapped = selected.filter(Boolean);
      if (new Set(mapped).size !== mapped.length) throw new Error("Each Shopify variant can only be mapped to one ERP SKU.");
    }
    for (const file of uploads) storedUploads.push(await storeFile(file.data, file.mime));
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const existing = id ? await client.query("SELECT code, brand_sku, director_id, designer_id FROM techpacks WHERE id=$1 FOR UPDATE", [id]) : null;
      if (id && !existing?.rows[0]) throw new Error("This tech pack no longer exists.");
      const people = await client.query("SELECT id FROM users WHERE is_active AND id = ANY($1::int[])", [[data.director, data.designer]]);
      const personErrors: FieldErrors = {};
      if (!people.rows.some((row) => row.id === data.director) && existing?.rows[0]?.director_id !== data.director) personErrors.director_id = "Choose an active director.";
      if (!people.rows.some((row) => row.id === data.designer) && existing?.rows[0]?.designer_id !== data.designer) personErrors.designer_id = "Choose an active designer.";
      if (Object.keys(personErrors).length) throw fieldErrorsFrom(personErrors);
      const values = [data.name,data.code,data.director,data.designer,data.season,data.theme,data.brandSku || null,data.orderType,data.features,data.fabric,data.colorFamily,data.tpg,data.cost,data.dropbox,data.description,data.d2c,data.neck,data.sizeType,data.collection,data.remarks];
      if (id) {
        if (existing?.rows[0].code !== data.code || (existing?.rows[0].brand_sku || "") !== data.brandSku) throw fieldError("code", "The code and base SKU cannot be changed after SKUs are created.");
        await client.query(`UPDATE techpacks SET name=$1,code=$2,director_id=$3,designer_id=$4,season=$5,theme=$6,brand_sku=$7,order_type=$8,key_features=$9,fabric_details=$10,color_family=$11,tpg_code=$12,target_cost=$13,dropbox_url=$14,description=$15,d2c_exclusive=$16,neck_type=$17,size_type=$18,collection_type=$19,remarks=$20,updated_at=now() WHERE id=$21`, [...values,id]);
        await client.query("UPDATE erp_skus SET product_name=$1, updated_at=now() WHERE techpack_id=$2", [data.name,id]);
      } else {
        const result = await client.query(`INSERT INTO techpacks (name,code,director_id,designer_id,season,theme,brand_sku,order_type,key_features,fabric_details,color_family,tpg_code,target_cost,dropbox_url,description,d2c_exclusive,neck_type,size_type,collection_type,remarks,created_month,created_by) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,date_trunc('month',now() AT TIME ZONE 'Asia/Kolkata')::date,$21) RETURNING id`, [...values,actor.id]);
        id = result.rows[0].id as number;
        const skuRows = matrix.map((item, index) => {
          const linked = options.find((option) => option.id === selected[index]);
          return { sku:item.sku, color:item.color, size:item.size, store:linked?.store ?? null, product_id:linked?.productId ?? null, variant_id:linked?.id ?? null, product:linked?.product ?? null, variant:linked?.variant ?? null, shopify_sku:linked?.sku ?? null };
        });
        await client.query(`INSERT INTO erp_skus (techpack_id,sku,product_name,color,size,shopify_store_domain,shopify_product_id,shopify_variant_id,shopify_product_name,shopify_variant_name,shopify_sku)
          SELECT $1,x.sku,$2,x.color,x.size,x.store,x.product_id,x.variant_id,x.product,x.variant,x.shopify_sku
          FROM jsonb_to_recordset($3::jsonb) AS x(sku text,color text,size text,store text,product_id text,variant_id text,product text,variant text,shopify_sku text)`, [id,data.name,JSON.stringify(skuRows)]);
      }
      for (let i = 0; i < uploads.length; i++) {
        const file=uploads[i],stored=storedUploads[i];
        await client.query("INSERT INTO techpack_files (techpack_id,category,original_name,mime_type,size_bytes,content,uploaded_by,storage_backend,object_key,object_bucket) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)", [id,file.category,file.name,file.mime,file.data.length,stored.content,actor.id,stored.backend,stored.key,stored.bucket]);
      }
      commitStarted = true;
      await client.query("COMMIT");
    } catch (error) { await client.query("ROLLBACK"); throw error; } finally { client.release(); }
  } catch (error) {
    if (!commitStarted) {
      const cleanup = await Promise.allSettled(storedUploads.map(discardNewUpload));
      for (const result of cleanup) if (result.status === "rejected") console.error("New upload cleanup failed", result.reason);
    }
    return failure(error);
  }
  revalidatePath("/techpacks");
  revalidatePath("/products");
  revalidatePath(`/techpacks/${id}`);
  redirect(`/techpacks/${id}`);
}

export async function mapSku(_prev: TechpackState, form: FormData): Promise<TechpackState> {
  await requirePermission("techpacks_manage");
  try {
    const id = positiveId(field(form, "sku_id"));
    const techpack = positiveId(field(form, "techpack_id"));
    const variant = field(form, "shopify_variant_id", 100);
    let option: ShopifyOption | undefined;
    if (variant) {
      const result = await getSelectedShopifyVariants([variant]);
      if (result.error) throw new Error("Shopify could not be reached. Try again later.");
      option = result.options.find((entry) => entry.id === variant);
      if (!option) throw new Error("The selected Shopify variant is no longer available.");
    }
    const result = await pool.query(`UPDATE erp_skus SET shopify_store_domain=$1,shopify_product_id=$2,shopify_variant_id=$3,shopify_product_name=$4,shopify_variant_name=$5,shopify_sku=$6,updated_at=now() WHERE id=$7 AND techpack_id=$8`, [option?.store ?? null,option?.productId ?? null,option?.id ?? null,option?.product ?? null,option?.variant ?? null,option?.sku ?? null,id,techpack]);
    if (!result.rowCount) throw new Error("This SKU no longer exists.");
    revalidatePath(`/techpacks/${techpack}`);
    revalidatePath("/products");
    return { success: variant ? "Shopify variant mapped." : "Shopify mapping removed." };
  } catch (error) { return failure(error); }
}

export async function addSkuCombinations(_prev: TechpackState, form: FormData): Promise<TechpackState> {
  await requirePermission("techpacks_manage");
  try {
    const id = positiveId(field(form, "techpack_id"));
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const { rows } = await client.query("SELECT name, code, brand_sku FROM techpacks WHERE id=$1 FOR UPDATE", [id]);
      if (!rows[0]) throw new Error("This tech pack no longer exists.");
      const matrix = buildSkuMatrix(rows[0].brand_sku || rows[0].code, field(form, "colors", 1500), field(form, "sizes", 1500));
      await client.query(`INSERT INTO erp_skus (techpack_id,sku,product_name,color,size)
        SELECT $1,x.sku,$2,x.color,x.size FROM jsonb_to_recordset($3::jsonb) AS x(sku text,color text,size text)`, [id,rows[0].name,JSON.stringify(matrix)]);
      await client.query("COMMIT");
    } catch (error) { await client.query("ROLLBACK"); throw error; } finally { client.release(); }
    revalidatePath(`/techpacks/${id}`);
    revalidatePath("/products");
    return { success: "SKU combinations added." };
  } catch (error) { return failure(error); }
}
