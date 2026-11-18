import { query } from "./db";

export async function getErpOverview() {
  const [counts,recent,colors] = await Promise.all([
    query<{ packs:number;skus:number;mapped:number;fabric:number;trim:number;files:number }>(`SELECT
      (SELECT count(*)::int FROM techpacks) AS packs,
      (SELECT count(*)::int FROM erp_skus) AS skus,
      (SELECT count(*)::int FROM erp_skus WHERE shopify_variant_id IS NOT NULL) AS mapped,
      (SELECT count(DISTINCT m.sku_id)::int FROM sku_material_tags m JOIN material_tags t ON t.id=m.tag_id WHERE t.kind='fabric') AS fabric,
      (SELECT count(DISTINCT m.sku_id)::int FROM sku_material_tags m JOIN material_tags t ON t.id=m.tag_id WHERE t.kind='trim') AS trim,
      (SELECT count(*)::int FROM techpack_files) AS files`),
    query<{id:number;name:string;code:string;season:string;skus:number}>(`SELECT t.id,t.name,t.code,t.season,count(s.id)::int AS skus FROM techpacks t LEFT JOIN erp_skus s ON s.techpack_id=t.id GROUP BY t.id ORDER BY t.created_at DESC,t.id DESC LIMIT 8`),
    query<{color:string;skus:number;mapped:number}>(`SELECT color,count(*)::int AS skus,count(shopify_variant_id)::int AS mapped FROM erp_skus GROUP BY color ORDER BY count(*) DESC,color`),
  ]);
  return { counts:counts.rows[0],recent:recent.rows,colors:colors.rows };
}
