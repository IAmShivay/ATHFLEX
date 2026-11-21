import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/dal";
import { hasPermission } from "@/lib/permissions";
import { query } from "@/lib/db";
import { getPeople, type ErpSku, type Techpack, type TechpackFile } from "@/lib/techpacks";
import { TechpackForm } from "@/components/TechpackForm";
import { AddSkuForm, SkuMappingForm } from "@/components/SkuForms";
import { getMaterialAssignments, getMaterialTags } from "@/lib/materials";
import { MaterialTagsPanel } from "@/components/MaterialTagsPanel";
import { getActiveJobberOptions, getTechpackJobbers } from "@/lib/production";
import { PpApprovalPanel } from "@/components/PpApprovalPanel";
import { JobberRatesPanel } from "@/components/JobberRatesPanel";
import WorkflowTracker from "@/components/WorkflowTracker";
import { getStyleProgress } from "@/lib/workflow-data";
import { styleWorkflowStates } from "@/lib/workflow";

export default async function TechpackPage({ params }: PageProps<"/techpacks/[id]">) {
  const user = await requirePermission("techpacks");
  const { id: rawId } = await params;
  const id = Number(rawId);
  if (!Number.isSafeInteger(id) || id < 1) notFound();
  const [{ rows }, skus, files] = await Promise.all([
    query<Techpack>("SELECT *, to_char(created_month,'YYYY-MM') AS created_month FROM techpacks WHERE id=$1", [id]),
    query<ErpSku>("SELECT id,sku,product_name,color,size,shopify_store_domain,shopify_variant_id,shopify_product_name,shopify_variant_name,shopify_sku FROM erp_skus WHERE techpack_id=$1 ORDER BY color,size,sku", [id]),
    query<TechpackFile>("SELECT id,category,original_name,size_bytes,mime_type FROM techpack_files WHERE techpack_id=$1 ORDER BY created_at,id", [id]),
  ]);
  const pack = rows[0];
  if (!pack) notFound();
  const canEdit = hasPermission(user, "techpacks_manage");
  const canApprovePp = hasPermission(user, "pp_approve");
  const canManageJobbers = hasPermission(user, "production_manage");
  const peopleIds = [pack.director_id, pack.designer_id, ...(pack.pp_decided_by ? [pack.pp_decided_by] : [])];
  const [people, tags, assignments, techpackJobbers, jobberOptions, progress] = await Promise.all([
    getPeople(peopleIds),
    canEdit ? getMaterialTags() : Promise.resolve([]),
    getMaterialAssignments(id),
    getTechpackJobbers(id),
    canManageJobbers ? getActiveJobberOptions() : Promise.resolve([]),
    getStyleProgress(id),
  ]);
  const personName = (id: number) => people.find((person) => person.id === id)?.name ?? "Former team member";
  const fields = [["Director",personName(pack.director_id)],["Designer",personName(pack.designer_id)],["Month",pack.created_month],["Season",pack.season],["Theme",pack.theme],["Brand / base SKU",pack.brand_sku || pack.code],["Order type",pack.order_type],["Key features",pack.key_features],["Fabric details",pack.fabric_details],["Color family",pack.color_family],["TPG code",pack.tpg_code],["Target cost",pack.target_cost],["Description",pack.description],["D2C exclusive",pack.d2c_exclusive ? "Yes" : "No"],["Neck type",pack.neck_type],["Size type",pack.size_type],["Collection type",pack.collection_type],["Remarks",pack.remarks]];
  return <div className="space-y-5"><div className="flex flex-wrap items-end justify-between gap-3"><div><Link href="/techpacks" className="text-sm font-medium text-neutral-700 hover:underline">← Tech packs</Link><h1 className="mt-2 text-2xl font-semibold tracking-tight">{pack.name}</h1><p className="mt-1 text-sm text-[#737373]">{pack.code} · {pack.season} · {skus.rows.length} ERP SKUs</p></div>{canEdit&&<a href="#materials" className="border border-neutral-950 bg-neutral-950 px-4 py-2.5 text-sm font-medium text-white hover:bg-neutral-800">{assignments.length?"Manage fabric & trims":"Next: assign fabric & trims"} ↓</a>}</div>
    {progress && <WorkflowTracker title="This style's progress" description="Where this style is in the Phase 1 workflow. Select a step to open its module." states={styleWorkflowStates(progress)} />}
    <PpApprovalPanel techpackId={id} status={pack.pp_status} notes={pack.pp_notes} decidedAt={pack.pp_decided_at} decidedBy={pack.pp_decided_by ? personName(pack.pp_decided_by) : null} canDecide={canApprovePp} canResubmit={canEdit} reworkRounds={pack.pp_rework_count} />
    <section className="rounded-none border border-[#d4d4d4] bg-white p-5 shadow-none sm:p-6"><div className="flex flex-wrap items-center justify-between gap-2"><div><h2 className="font-semibold">Generated SKUs</h2><p className="mt-1 text-sm text-[#737373]">Each color and size is a separate ERP SKU. Link the matching Shopify variant when available.</p></div><span className="rounded-none bg-neutral-50 px-3 py-1 text-xs font-medium text-neutral-800">{skus.rows.filter((s) => s.shopify_variant_id).length} mapped</span></div>
      <div className="mt-4 overflow-x-auto"><table className="w-full text-left text-sm"><thead className="border-b border-[#d4d4d4] text-xs uppercase tracking-wide text-[#737373]"><tr><th className="py-3 pr-4 font-medium">ERP SKU</th><th className="py-3 pr-4 font-medium">Color / size</th><th className="py-3 pr-4 font-medium">Shopify</th>{canEdit && <th className="py-3 font-medium">Map variant</th>}</tr></thead><tbody className="divide-y divide-[#eee]">{skus.rows.map((sku) => <tr key={sku.id}><td className="py-3 pr-4 font-medium">{sku.sku}</td><td className="py-3 pr-4">{sku.color} · {sku.size}</td><td className="py-3 pr-4 text-[#737373]">{sku.shopify_variant_id ? <>{sku.shopify_product_name} · {sku.shopify_variant_name}<span className="block text-xs">{sku.shopify_sku || "No Shopify SKU"} · {sku.shopify_store_domain}</span></> : "Not mapped"}</td>{canEdit && <td className="py-3"><SkuMappingForm sku={sku} techpackId={id} /></td>}</tr>)}</tbody></table></div>
      {canEdit && <AddSkuForm techpackId={id} />}
    </section>
    <section className="border border-neutral-300 bg-white p-5 sm:p-6"><h2 className="font-semibold">Product images &amp; files</h2><p className="mt-1 text-sm text-neutral-500">Preview product photos or download the original file.</p><div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{files.rows.map((file) => <div key={file.id} className="border border-neutral-300">{["image/jpeg","image/png","image/webp"].includes(file.mime_type)&&<a href={`/api/techpacks/files/${file.id}?preview=1`} target="_blank" rel="noreferrer" aria-label={`View ${file.original_name}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={`/api/techpacks/files/${file.id}?preview=1`} alt={`${file.category.replace("_"," ")}: ${file.original_name}`} loading="lazy" className="h-56 w-full border-b border-neutral-200 bg-neutral-50 object-contain"/>
    </a>}<div className="p-3"><p className="break-all text-sm font-medium">{file.original_name}</p><p className="mt-1 text-xs text-neutral-500">{file.category.replace("_"," ")} · {(file.size_bytes/1024).toFixed(0)} KB</p><a href={`/api/techpacks/files/${file.id}`} className="mt-3 inline-block border border-neutral-300 px-3 py-1.5 text-xs font-medium hover:border-black">Download original</a></div></div>)}{!files.rows.length&&<p className="text-sm text-neutral-500">No files attached.</p>}</div></section>
    <MaterialTagsPanel tags={tags} assignments={assignments} skus={skus.rows} packId={id} canEdit={canEdit}/>
    <JobberRatesPanel techpackId={id} assignments={techpackJobbers} jobbers={jobberOptions} canEdit={canManageJobbers}/>
    <section className="rounded-none border border-[#d4d4d4] bg-white p-5 shadow-none sm:p-6"><h2 className="font-semibold">Tech pack details</h2><dl className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{fields.map(([name,value]) => <div key={name}><dt className="text-xs text-[#737373]">{name}</dt><dd className="mt-1 whitespace-pre-wrap text-sm font-medium">{value || "—"}</dd></div>)}{pack.dropbox_url && <div><dt className="text-xs text-[#737373]">Dropbox link</dt><dd className="mt-1 text-sm"><a href={pack.dropbox_url} target="_blank" rel="noreferrer" className="text-neutral-700 hover:underline">Open link ↗</a></dd></div>}</dl></section>
    {canEdit && <details className="group"><summary className="cursor-pointer rounded-none border border-[#d4d4d4] bg-white px-5 py-4 font-semibold shadow-none">Edit details and add files</summary><div className="mt-4"><TechpackForm existing={pack} people={people} /></div></details>}
  </div>;
}
