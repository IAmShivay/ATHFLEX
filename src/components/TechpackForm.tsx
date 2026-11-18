"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { saveTechpack, type TechpackState } from "@/app/actions/techpacks";
import { buildSkuMatrix } from "@/lib/sku-matrix";
import type { PersonOption, Techpack } from "@/lib/techpacks";
import { useFormErrors } from "@/lib/use-form-errors";
import { FieldError, FormAlert } from "./FormErrors";
import { ShopifyVariantSelect } from "./ShopifyVariantSelect";
import { TechpackUploadField } from "./TechpackUploadField";

const input = "mt-1.5 w-full rounded-none border border-[#d4d4d4] bg-white px-3 py-2.5 text-sm text-[#1a1a1a] outline-none placeholder:text-[#737373] focus:border-neutral-600 focus:ring-2 focus:ring-neutral-600/15";
const label = "block text-sm font-medium text-[#303030]";

export function TechpackForm({ people, existing }: { people: PersonOption[]; existing?: Techpack }) {
  const [state, action, pending] = useActionState<TechpackState, FormData>(saveTechpack, {});
  const [source, setSource] = useState("");
  const [mappings, setMappings] = useState<Record<string, string>>({});
  const [uploadCount, setUploadCount] = useState(0);
  const [uploadReset, setUploadReset] = useState(0);
  const [localError, setLocalError] = useState("");
  const errorRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const { errors: validationErrors, formProps, describe, dismiss } = useFormErrors(state.fieldErrors, formRef);
  const errors = localError ? { ...validationErrors, files: localError } : validationErrors;
  useEffect(() => {
    if (state.error) errorRef.current?.focus();
  }, [state.error]);
  const [fields, setFields] = useState<Record<string, string>>({
    name: existing?.name ?? "", code: existing?.code ?? "", director_id: String(existing?.director_id ?? ""),
    designer_id: String(existing?.designer_id ?? ""), season: existing?.season ?? "", theme: existing?.theme ?? "",
    brand_sku: existing?.brand_sku ?? "", order_type: existing?.order_type ?? "New", key_features: existing?.key_features ?? "",
    fabric_details: existing?.fabric_details ?? "", color_family: existing?.color_family ?? "", tpg_code: existing?.tpg_code ?? "",
    target_cost: existing?.target_cost ?? "", dropbox_url: existing?.dropbox_url ?? "", description: existing?.description ?? "",
    neck_type: existing?.neck_type ?? "", size_type: existing?.size_type ?? "", collection_type: existing?.collection_type ?? "",
    remarks: existing?.remarks ?? "", colors: "", sizes: "",
  });
  const update = (key: string, value: string) => setFields((current) => ({ ...current, [key]: value }));
  const preview = useMemo(() => {
    if (!fields.code || !fields.colors || !fields.sizes) return { rows: [], error: "" };
    try { return { rows: buildSkuMatrix(fields.brand_sku || fields.code, fields.colors, fields.sizes), error: "" }; }
    catch (error) { return { rows: [], error: error instanceof Error ? error.message : "Check the SKU details." }; }
  }, [fields.code, fields.brand_sku, fields.colors, fields.sizes]);
  const textField = (key: string, title: string, options?: { required?: boolean; type?: string; placeholder?: string; readonly?: boolean; max?: number; multiline?: boolean }) => (
    <label className={label}>{title}{options?.required && <span className="text-neutral-600"> *</span>}
      {options?.multiline ? <textarea id={`techpack-${key}`} name={key} rows={3} value={fields[key]} onChange={(e) => update(key, e.target.value)} maxLength={options.max ?? 3000} placeholder={options.placeholder} className={input} {...describe(key, `techpack-${key}`)} /> : <input id={`techpack-${key}`} name={key} type={options?.type ?? "text"} value={fields[key]} onChange={(e) => update(key, e.target.value)} required={options?.required} readOnly={options?.readonly} maxLength={options?.max ?? 200} placeholder={options?.placeholder} className={`${input} ${options?.readonly ? "bg-[#f6f6f6] text-[#737373]" : ""}`} {...describe(key, `techpack-${key}`)} />}
      <FieldError errors={errors} name={key} inputId={`techpack-${key}`} />
    </label>
  );
  return (
    <form ref={formRef} action={action} {...formProps} className="space-y-5" onReset={() => { setUploadCount(0); setUploadReset((value) => value + 1); }} onSubmit={(event) => {
      formProps.onSubmit(event);
      setLocalError("");
      const files = Array.from(event.currentTarget.querySelectorAll<HTMLInputElement>('input[type="file"]')).flatMap((input) => Array.from(input.files ?? []));
      if ((!existing && !files.length) || files.some((file) => file.size > 5 * 1024 * 1024) || files.length > 10 || files.reduce((sum, file) => sum + file.size, 0) > 15 * 1024 * 1024) {
        event.preventDefault();
        setLocalError(!files.length ? "Add at least one file in step 3 before creating this tech pack." : "Choose up to 10 files, each at most 5 MB, totaling no more than 15 MB.");
      }
    }}>
      <nav aria-label="Tech pack form sections" className="sticky top-16 z-20 flex border border-neutral-300 bg-white">
        <a href="#pack-details" className="flex-1 border-r border-neutral-300 px-3 py-3 text-sm font-medium hover:bg-neutral-100">01 <span className="ml-1">Details</span></a>
        {!existing && <a href="#pack-skus" className="flex-1 border-r border-neutral-300 px-3 py-3 text-sm font-medium hover:bg-neutral-100">02 <span className="ml-1">SKUs</span></a>}
        <a href="#pack-files" className="flex-1 px-3 py-3 text-sm font-medium hover:bg-neutral-100">{existing ? "02" : "03"} <span className="ml-1">Files</span></a>
      </nav>
      {existing && <input type="hidden" name="id" value={existing.id} />}
      {state.error && <div ref={errorRef} tabIndex={-1} role="alert" className="border border-danger border-l-4 bg-white px-4 py-3 text-sm"><p className="font-semibold text-danger">Could not save</p><p className="mt-1 text-danger">{state.error}</p></div>}
      <section id="pack-details" className="rounded-none border border-[#d4d4d4] bg-white p-5 shadow-none sm:p-6">
        <div className="mb-5 flex items-start gap-3"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-none bg-neutral-700 text-sm font-semibold text-white">1</span><div><h2 className="font-semibold">Tech pack details</h2><p className="mt-1 text-sm text-[#737373]">The source of your product information. Fields marked <span className="text-neutral-600">*</span> are required.</p></div></div>
        {!existing && <details className="mb-6 border border-neutral-300 bg-neutral-50 p-4"><summary className="text-sm font-medium">Start with a Shopify product <span className="font-normal text-[#737373]">(optional)</span></summary><div className="pt-4">
          <ShopifyVariantSelect value={source} label="Shopify product to use as a starting point" emptyLabel="Enter details manually" onChange={(value, selected) => { setSource(value); if (selected) update("name", selected.product); }} />
          <p className="mt-2 text-xs text-[#737373]">Selecting a variant fills the tech pack name. Map each color and size below, or do it later.</p></div></details>}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {textField("name", "Tech pack name", { required: true })}
          {textField("code", "Tech pack code", { required: true, readonly: Boolean(existing), max: 60 })}
          {([['director_id','Director'],['designer_id','Designer']] as const).map(([key,title]) => <label key={key} className={label}>{title} <span className="text-neutral-600">*</span><select name={key} required value={fields[key]} onChange={(e) => update(key, e.target.value)} className={input} id={`techpack-${key}`} {...describe(key, `techpack-${key}`)}><option value="">Select {title.toLowerCase()}</option>{people.map((person) => <option key={person.id} value={person.id} disabled={!person.is_active && String(person.id) !== String(existing?.[key])}>{person.name} · {person.email}{!person.is_active ? " (inactive)" : ""}</option>)}</select><FieldError errors={errors} name={key} inputId={`techpack-${key}`} /></label>)}
          <div className={label}>Month<input className={`${input} bg-[#f6f6f6] text-[#737373]`} value={existing?.created_month?.slice(0, 7) ?? "Set automatically when saved"} readOnly /></div>
          {textField("season", "Season", { required: true, placeholder: "e.g. AW26" })}
          {textField("theme", "Theme", { required: true })}
          {textField("brand_sku", "Brand / base SKU", { readonly: Boolean(existing), placeholder: "Uses tech pack code if blank", max: 60 })}
          <label className={label}>Order type <span className="text-neutral-600">*</span><select id="techpack-order_type" name="order_type" required value={fields.order_type} onChange={(e) => update("order_type", e.target.value)} className={input} {...describe("order_type", "techpack-order_type")}><option>New</option><option>Repeat</option><option>Reorder</option></select><FieldError errors={errors} name="order_type" inputId="techpack-order_type" /></label>
          {textField("key_features", "Key features", { max: 3000, multiline: true })}
          {textField("fabric_details", "Fabric details", { max: 3000, multiline: true })}
          {textField("color_family", "Color family", { required: true })}
          {textField("tpg_code", "TPG code", { required: true })}
          {textField("target_cost", "Target cost", { type: "text", placeholder: "0.00" })}
          {textField("dropbox_url", "Dropbox link", { type: "url", placeholder: "https://…", max: 1000 })}
          {textField("description", "Description", { max: 3000, multiline: true })}
          {textField("neck_type", "Neck type")}
          {textField("size_type", "Size type", { placeholder: "e.g. Standard S to XL" })}
          {textField("collection_type", "Collection type")}
          {textField("remarks", "Remarks", { max: 3000, multiline: true })}
          <label className="flex items-center gap-2 self-end pb-3 text-sm font-medium text-[#303030]"><input type="checkbox" name="d2c_exclusive" defaultChecked={existing?.d2c_exclusive} className="h-4 w-4 accent-neutral-700" /> D2C exclusive</label>
        </div>
      </section>
      {!existing && <section id="pack-skus" className="rounded-none border border-[#d4d4d4] bg-white p-5 shadow-none sm:p-6">
        <div className="mb-5 flex items-start gap-3"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-none bg-neutral-700 text-sm font-semibold text-white">2</span><div><h2 className="font-semibold">Create SKUs</h2><p className="mt-1 text-sm text-[#737373]">One SKU is generated for every color and size, using BASE-COLOR-SIZE.</p></div></div>
        <div className="grid gap-4 sm:grid-cols-2">{textField("colors", "Colors", { required: true, placeholder: "Black, Navy, White", max: 1500 })}{textField("sizes", "Sizes", { required: true, placeholder: "S, M, L, XL", max: 1500 })}</div>
        <p className="mt-2 text-xs text-[#737373]">Separate colors and sizes with commas. The base is the brand SKU, or the tech pack code if blank.</p>
        <FormAlert message={preview.error} className="mt-3" />
        {preview.rows.length > 0 && <div className="mt-4 overflow-x-auto rounded-none border border-[#d4d4d4]"><div className="border-b border-[#d4d4d4] bg-[#fafafa] px-3 py-2 text-xs font-semibold uppercase tracking-wide text-[#737373]">{preview.rows.length} generated SKU{preview.rows.length === 1 ? "" : "s"} · map Shopify variants if known</div><table className="w-full text-left text-sm"><thead className="text-xs text-[#737373]"><tr><th className="px-3 py-2">ERP SKU</th><th className="px-3 py-2">Shopify variant</th></tr></thead><tbody>{preview.rows.map((row) => <tr key={row.sku} className="border-t border-[#eee]"><td className="whitespace-nowrap px-3 py-2 font-medium">{row.sku}<span className="block text-xs font-normal text-[#737373]">{row.color} · {row.size}</span></td><td className="min-w-64 px-3 py-2"><ShopifyVariantSelect name={`map_${row.sku}`} label={`Shopify variant for ${row.sku}`} value={mappings[row.sku] ?? ""} onChange={(value) => setMappings((current) => ({ ...current, [row.sku]: value }))} /></td></tr>)}</tbody></table></div>}
      </section>}
      <section id="pack-files" className="rounded-none border border-[#d4d4d4] bg-white p-5 shadow-none sm:p-6" onChange={(event) => {
        setUploadCount(Array.from(event.currentTarget.querySelectorAll<HTMLInputElement>('input[type="file"]')).reduce((sum, input) => sum + (input.files?.length ?? 0), 0));
        setLocalError("");
        dismiss("files");
      }}>
        <div className="mb-4 flex items-start gap-3"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-none bg-neutral-700 text-sm font-semibold text-white">{existing ? "2" : "3"}</span><div><h2 className="font-semibold">Product images &amp; files {!existing && <span className="text-neutral-600">*</span>}</h2><p className="mt-1 text-sm text-[#737373]">{existing ? "Add product photos or supporting files." : "Upload at least one product photo or supporting file."} PDF, JPG, PNG, WebP or XLSX · 5 MB each, 15 MB total.</p></div></div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{([['front','Front'],['back','Back'],['size_chart','Size chart'],['other','Other files']] as const).map(([key,title]) => <TechpackUploadField key={`${key}-${uploadReset}`} category={key} title={title} />)}</div>
        <FieldError errors={errors} name="files" inputId="techpack-files" className="mt-3 text-sm" />
      </section>
      <footer className="sticky bottom-0 z-20 flex flex-wrap items-center justify-between gap-3 border border-neutral-300 bg-white p-4">
        <p aria-live="polite" className="text-xs text-neutral-600">{preview.error ? "Review colors and sizes in step 2" : existing ? "Edit tech pack" : `${preview.rows.length} SKUs ready`} · {uploadCount} file{uploadCount === 1 ? "" : "s"} selected</p>
        <div className="flex items-center gap-3"><Link href={existing ? `/techpacks/${existing.id}` : "/techpacks"} className="border border-neutral-300 px-4 py-2.5 text-sm font-medium hover:bg-neutral-100">{existing ? "Back to overview" : "Cancel"}</Link><button type="submit" disabled={pending || (!existing && !!preview.error)} className="bg-neutral-950 px-5 py-2.5 text-sm font-semibold text-white hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-50">{pending ? "Saving…" : existing ? "Save changes" : "Create tech pack & SKUs"}</button></div>
      </footer>
    </form>
  );
}
