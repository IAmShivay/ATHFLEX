import Link from "next/link";

export default function FilterTabs({
  tabs,
  active,
  basePath,
  extraParams,
}: {
  tabs: { key: string; label: string; count?: number }[];
  active: string;
  basePath: string;
  extraParams?: Record<string, string | undefined>;
}) {
  return (
    <div aria-label="Filter by status" className="flex flex-wrap gap-1 border border-neutral-300 bg-white p-1">
      {tabs.map((t) => {
        const isActive = t.key === active;
        const next = new URLSearchParams();
        Object.entries(extraParams ?? {}).forEach(([k, v]) => {
          if (v) next.set(k, v);
        });
        if (t.key && t.key !== "all") next.set("status", t.key);
        const qs = next.toString();
        return (
          <Link
            key={t.key || "all"}
            href={qs ? `${basePath}?${qs}` : basePath}
            aria-current={isActive ? "page" : undefined}
            className={`rounded-none px-3 py-1.5 text-sm transition-colors ${
              isActive ? "bg-neutral-950 font-medium text-white" : "text-[#616161] hover:bg-neutral-100 hover:text-[#1a1a1a]"
            }`}
          >
            {t.label}
            {typeof t.count === "number" && (
              <span className={`ml-1.5 text-xs ${isActive ? "text-neutral-300" : "text-[#737373]"}`}>{t.count}</span>
            )}
          </Link>
        );
      })}
    </div>
  );
}
