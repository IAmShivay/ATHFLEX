import { requirePermission } from "@/lib/dal";
import { getManualEntryOptions } from "@/lib/production";
import { ManualEntryForm } from "@/components/ManualEntryForm";

export default async function ManualInwardPage() {
  await requirePermission("inward");
  const pos = await getManualEntryOptions();
  return <ManualEntryForm pos={pos} />;
}
