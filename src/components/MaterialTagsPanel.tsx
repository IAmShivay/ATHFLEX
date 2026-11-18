"use client";

import { useMemo, useState, useTransition } from "react";
import { applyMaterialTags, createMaterialTag, removeMaterialTag, type MaterialResult } from "@/app/actions/materials";
import type { MaterialAssignment, MaterialKind, MaterialTag } from "@/lib/materials";
import type { ErpSku } from "@/lib/techpacks";
import { FieldError, FormAlert } from "./FormErrors";

const input="w-full border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:border-neutral-950";
const button="border border-neutral-950 bg-neutral-950 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50";

function TagPicker({ kind, tags, skus, packId }: { kind: MaterialKind; tags: MaterialTag[]; skus: ErpSku[]; packId: number }) {
  const [search,setSearch]=useState("");
  const [created,setCreated]=useState<MaterialTag[]>([]);
  const [selected,setSelected]=useState<number[]>([]);
  const [scope,setScope]=useState("all");
  const [notice,setNotice]=useState<MaterialResult>({});
  const [pending,startTransition]=useTransition();
  const catalog=useMemo(()=>Array.from(new Map([...tags,...created].filter((tag)=>tag.kind===kind).map((tag)=>[tag.id,tag])).values()).sort((a,b)=>a.name.localeCompare(b.name)),[tags,created,kind]);
  const normalized=search.trim().replace(/\s+/g," ");
  const exact=catalog.find((tag)=>tag.name.toLowerCase()===normalized.toLowerCase());
  const matching=catalog.filter((tag)=>tag.name.toLowerCase().includes(normalized.toLowerCase())).slice(0,40);
  const colors=[...new Set(skus.map((sku)=>sku.color))];
  const choose=(id:number)=>setSelected((current)=>current.includes(id)?current.filter((value)=>value!==id):[...current,id]);
  const create=()=>startTransition(async()=>{
    setNotice({});
    try {
      const form=new FormData();form.set("kind",kind);form.set("name",normalized);
      const result=await createMaterialTag(form);
      if(result.tag){const tag=result.tag;setCreated((current)=>[...current.filter((item)=>item.id!==tag.id),tag]);setSelected((current)=>current.includes(tag.id)?current:[...current,tag.id]);setSearch("");}
      setNotice(result);
    }catch{setNotice({error:"Could not create the tag. Please try again."});}
  });
  const apply=()=>startTransition(async()=>{
    setNotice({});
    try {const form=new FormData();form.set("techpack_id",String(packId));form.set("kind",kind);form.set("scope",scope);selected.forEach((id)=>form.append("tag_ids",String(id)));const result=await applyMaterialTags(form);setNotice(result);if(!result.error)setSelected([]);}
    catch{setNotice({error:"Could not apply the tags. Please try again."});}
  });
  return <section className="border border-neutral-300 bg-white p-5">
    <h3 className="font-semibold">{kind==="fabric"?"Fabric names":"Trim names"}</h3>
    <p className="mt-1 text-sm text-neutral-500">{kind==="fabric"?"Name each finished fabric and color, for example Cotton Jersey 180 GSM - Black.":"Create each trim once and reuse it, for example Drawcord - Black or Woven label."}</p>
    <label className="mt-4 block text-sm font-medium">Search or create {kind} tags<input id={`${kind}-tag-search`} aria-invalid={notice.fieldErrors?.name?true:undefined} aria-describedby={notice.fieldErrors?.name?`${kind}-tag-search-error`:undefined} className={`${input} mt-1.5`} value={search} onChange={(e)=>{setSearch(e.target.value);if(notice.fieldErrors)setNotice({});}} maxLength={120} placeholder={kind==="fabric"?"Cotton Jersey 180 GSM - Black":"Drawcord - Black"} onKeyDown={(e)=>{if(e.key==="Enter"){e.preventDefault();if(exact)choose(exact.id);else if(normalized&&!pending)create();}}} disabled={pending}/></label>
    <FieldError errors={notice.fieldErrors??{}} name="name" inputId={`${kind}-tag-search`}/>
    {normalized&&!exact&&<button type="button" onClick={create} disabled={pending} className="mt-2 max-w-full break-words border border-neutral-300 px-3 py-2 text-left text-sm hover:border-black disabled:opacity-50">+ Create “{normalized}”</button>}
    <div className="mt-3 flex max-h-52 flex-wrap gap-2 overflow-y-auto" aria-label={`${kind} tag choices`}>
      {matching.map((tag)=><button type="button" key={tag.id} onClick={()=>choose(tag.id)} aria-pressed={selected.includes(tag.id)} disabled={pending} className={`max-w-full break-words border px-2.5 py-1.5 text-left text-xs ${selected.includes(tag.id)?"border-neutral-950 bg-neutral-950 text-white":"border-neutral-300 bg-white text-neutral-700 hover:border-neutral-950"}`}>{selected.includes(tag.id)?"✓ ":""}{tag.name}</button>)}
      {!matching.length&&<p className="text-xs text-neutral-500">{normalized?"No matching tags. Create one to add it to the library.":"No tags yet. Enter a name to create the first one."}</p>}
    </div>
    {selected.some((id)=>!matching.some((tag)=>tag.id===id))&&<div className="mt-3 border-t border-neutral-200 pt-3"><p className="mb-2 text-xs text-neutral-500">Also selected</p><div className="flex flex-wrap gap-2">{catalog.filter((tag)=>selected.includes(tag.id)&&!matching.some((match)=>match.id===tag.id)).map((tag)=><button type="button" key={tag.id} onClick={()=>choose(tag.id)} className="border border-neutral-950 px-2 py-1 text-xs">{tag.name} ×</button>)}</div></div>}
    <label className="mt-5 block text-sm font-medium">Apply to<select aria-label={`Apply ${kind} tags to`} className={`${input} mt-1.5`} value={scope} onChange={(e)=>setScope(e.target.value)} disabled={pending}><option value="all">All SKUs in this tech pack</option>{colors.map((color)=><option key={color} value={`color:${color}`}>{color} — all sizes</option>)}{skus.map((sku)=><option key={sku.id} value={`sku:${sku.id}`}>{sku.sku}</option>)}</select></label>
    <div className="mt-3 flex items-center justify-between gap-3"><span className="text-xs text-neutral-500">{selected.length} selected</span><button type="button" className={button} onClick={apply} disabled={pending||!selected.length||!skus.length}>{pending?"Saving…":"Apply tags"}</button></div>
    <p className="mt-2 text-xs text-neutral-500">Adds the selected tags without replacing existing assignments.</p>
    <FormAlert message={notice.error} className="mt-3"/>{notice.success&&<p role="status" className="mt-3 text-sm">{notice.success}</p>}
  </section>;
}

export function MaterialTagsPanel({ tags, assignments, skus, packId, canEdit }: { tags:MaterialTag[]; assignments:MaterialAssignment[];skus:ErpSku[];packId:number;canEdit:boolean }) {
  const [pending,startTransition]=useTransition();
  const [message,setMessage]=useState("");
  const remove=(skuId:number,tagId:number)=>startTransition(async()=>{
    try{const form=new FormData();form.set("techpack_id",String(packId));form.set("sku_id",String(skuId));form.set("tag_id",String(tagId));const result=await removeMaterialTag(form);setMessage(result.error||result.success||"");}catch{setMessage("Could not remove the assignment.");}
  });
  return <section id="materials" className="space-y-4">
    <div><h2 className="text-lg font-semibold">Fabric &amp; trims</h2><p className="mt-1 text-sm text-neutral-500">Reusable material tags, assigned to the SKUs that use them.</p></div>
    {canEdit&&<div className="grid items-start gap-4 xl:grid-cols-2"><TagPicker kind="fabric" tags={tags} skus={skus} packId={packId}/><TagPicker kind="trim" tags={tags} skus={skus} packId={packId}/></div>}
    <div className="overflow-x-auto border border-neutral-300 bg-white"><table className="w-full text-left text-sm"><thead className="bg-neutral-50 text-xs uppercase tracking-wide text-neutral-500"><tr><th className="px-4 py-3">SKU</th><th className="px-4 py-3">Fabric</th><th className="px-4 py-3">Trims</th></tr></thead><tbody className="divide-y divide-neutral-200">{skus.map((sku)=><tr key={sku.id}><td className="whitespace-nowrap px-4 py-3 font-medium">{sku.sku}<span className="block text-xs font-normal text-neutral-500">{sku.color} · {sku.size}</span></td>{(["fabric","trim"] as const).map((kind)=><td key={kind} className="min-w-56 px-4 py-3"><div className="flex flex-wrap gap-1.5">{assignments.filter((tag)=>tag.sku_id===sku.id&&tag.kind===kind).map((tag)=><span key={tag.id} className="inline-flex max-w-full items-center gap-2 break-words border border-neutral-300 px-2 py-1 text-xs">{tag.name}{canEdit&&<button type="button" disabled={pending} aria-label={`Remove ${tag.name} from ${sku.sku}`} onClick={()=>remove(sku.id,tag.id)} className="px-1 font-semibold hover:bg-neutral-100 disabled:opacity-50">×</button>}</span>)}{!assignments.some((tag)=>tag.sku_id===sku.id&&tag.kind===kind)&&<span className="text-xs text-neutral-500">Not assigned</span>}</div></td>)}</tr>)}</tbody></table></div>
    {message&&<p role="status" className="text-sm">{message}</p>}
  </section>;
}
