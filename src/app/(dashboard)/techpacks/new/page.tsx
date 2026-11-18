import Link from "next/link";
import { requirePermission } from "@/lib/dal";
import { getPeople } from "@/lib/techpacks";
import { TechpackForm } from "@/components/TechpackForm";

export default async function NewTechpackPage() {
  await requirePermission("techpacks_manage");
  const people = await getPeople();
  return <div className="space-y-5"><div><Link href="/techpacks" className="text-sm font-medium text-neutral-700 hover:underline">← Tech packs</Link><h1 className="mt-2 text-2xl font-semibold tracking-tight">Create a tech pack</h1><p className="mt-1 text-sm text-[#737373]">Capture the style once, then create the SKUs that belong to it.</p></div><TechpackForm people={people} /></div>;
}
