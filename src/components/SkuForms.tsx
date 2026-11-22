"use client";

import { useActionState, useState } from "react";
import { addSkuCombinations, mapSku, type TechpackState } from "@/app/actions/techpacks";
import type { ErpSku } from "@/lib/techpacks";
import { useFormErrors } from "@/lib/use-form-errors";
import { FieldError, FormAlert } from "./FormErrors";
import { ShopifyVariantSelect } from "./ShopifyVariantSelect";

const input = "rounded-none border border-[#d4d4d4] bg-white px-3 py-2 text-sm outline-none focus:border-neutral-600 focus:ring-2 focus:ring-neutral-600/15";
const button = "rounded-none bg-[#1a1a1a] px-3 py-2 text-xs font-semibold text-white hover:bg-[#333] disabled:opacity-50";
function Notice({ state }: { state: TechpackState }) { return state.error ? <FormAlert message={state.error} className="mt-2" compact /> : state.success ? <p role="status" className="mt-2 text-xs text-neutral-700">{state.success}</p> : null; }

export function SkuMappingForm({ sku, techpackId }: { sku: ErpSku; techpackId: number }) {
  const [state, action, pending] = useActionState<TechpackState, FormData>(mapSku, {});
  const [selected, setSelected] = useState(sku.shopify_variant_id ?? "");
  const initialOption = sku.shopify_variant_id ? { id: sku.shopify_variant_id, productId: "", product: sku.shopify_product_name ?? sku.product_name, variant: sku.shopify_variant_name ?? "Saved variant", sku: sku.shopify_sku, store: sku.shopify_store_domain ?? "" } : undefined;
  return <form action={action} className="min-w-72"><input type="hidden" name="sku_id" value={sku.id} /><input type="hidden" name="techpack_id" value={techpackId} /><div className="flex items-start gap-2"><div className="min-w-0 flex-1"><ShopifyVariantSelect initialOption={initialOption} value={selected} onChange={setSelected} name="shopify_variant_id" label={"Shopify mapping for " + sku.sku} /></div><button className={button} disabled={pending}>{pending ? "Saving…" : "Save"}</button></div><Notice state={state} /></form>;
}

export function AddSkuForm({ techpackId }: { techpackId: number }) {
  const [state, action, pending] = useActionState<TechpackState, FormData>(addSkuCombinations, {});
  const { errors, formProps, describe } = useFormErrors(state);
  const colorsId = `add-sku-colors-${techpackId}`;
  const sizesId = `add-sku-sizes-${techpackId}`;
  return <form action={action} {...formProps} className="mt-4 rounded-none bg-[#fafafa] p-4"><input type="hidden" name="techpack_id" value={techpackId} /><h3 className="text-sm font-semibold">Add more SKU combinations</h3><p className="mt-1 text-xs text-[#737373]">Enter new colors and sizes as comma-separated lists. Every color is paired with every size.</p><div className="mt-3 flex flex-wrap items-start gap-2"><div className="min-w-40 flex-1"><input id={colorsId} name="colors" required maxLength={1500} placeholder="Colors, e.g. Navy" aria-label="Additional colors" className={`${input} w-full`} {...describe("colors", colorsId)} /><FieldError errors={errors} name="colors" inputId={colorsId} /></div><div className="min-w-40 flex-1"><input id={sizesId} name="sizes" required maxLength={1500} placeholder="Sizes, e.g. S, M, L" aria-label="Additional sizes" className={`${input} w-full`} {...describe("sizes", sizesId)} /><FieldError errors={errors} name="sizes" inputId={sizesId} /></div><button className={button} disabled={pending}>{pending ? "Adding…" : "Add SKUs"}</button></div><Notice state={state} /></form>;
}
