import type { PoStatus, PpStatus } from "@/lib/production";

const BASE = "inline-flex items-center whitespace-nowrap rounded-none px-2 py-0.5 text-xs font-medium ring-1 ring-inset";

export function PpBadge({ status }: { status: PpStatus }) {
  const style =
    status === "approved"
      ? "bg-neutral-950 text-white ring-neutral-950"
      : status === "rejected"
        ? "bg-neutral-200 text-neutral-900 ring-neutral-400"
        : "bg-white text-neutral-600 ring-neutral-400";
  return <span className={`${BASE} ${style}`}>{status === "approved" ? "PP approved" : status === "rejected" ? "PP rejected" : "PP pending"}</span>;
}

export function PoBadge({ status }: { status: PoStatus }) {
  const style =
    status === "closed"
      ? "bg-neutral-950 text-white ring-neutral-950"
      : status === "issued" || status === "partly_received"
        ? "bg-neutral-100 text-neutral-900 ring-neutral-400"
        : status === "cancelled"
          ? "bg-neutral-200 text-neutral-700 ring-neutral-300"
          : "bg-white text-neutral-600 ring-neutral-300";
  const label = status === "partly_received" ? "Partly received" : status.charAt(0).toUpperCase() + status.slice(1);
  return <span className={`${BASE} ${style}`}>{label}</span>;
}

export function ProgressBar({ value, total, className = "" }: { value: number; total: number; className?: string }) {
  const percent = total ? Math.min(100, Math.round((value / total) * 100)) : 0;
  return (
    <div className={`h-1.5 w-full bg-neutral-100 ${className}`} role="progressbar" aria-valuemin={0} aria-valuemax={total} aria-valuenow={value}>
      <div className="h-full bg-neutral-950" style={{ width: `${percent}%` }} />
    </div>
  );
}

export function EntryTypeBadge({ type }: { type: "scanned" | "manual" }) {
  return (
    <span className={`${BASE} ${type === "manual" ? "bg-neutral-200 text-neutral-800 ring-neutral-300" : "bg-white text-neutral-600 ring-neutral-300"}`}>
      {type === "manual" ? "Manual" : "Scanned"}
    </span>
  );
}
