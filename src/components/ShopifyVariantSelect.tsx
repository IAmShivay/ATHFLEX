"use client";

import { useEffect, useState } from "react";
import type { ShopifyOption } from "@/lib/techpacks";

const input = "w-full rounded-none border border-[#d4d4d4] bg-white px-3 py-2 text-sm text-[#1a1a1a] outline-none placeholder:text-[#737373] focus:border-neutral-600 focus:ring-2 focus:ring-neutral-600/15";
function title(option: ShopifyOption) { return option.product + " · " + option.variant + (option.sku ? " · " + option.sku : " · no SKU"); }

export function ShopifyVariantSelect({ value, onChange, name, label, initialOption, emptyLabel = "Unmapped" }: { value: string; onChange: (value: string, option?: ShopifyOption) => void; name?: string; label: string; initialOption?: ShopifyOption; emptyLabel?: string }) {
  const [search, setSearch] = useState("");
  const [active, setActive] = useState(false);
  const [options, setOptions] = useState<ShopifyOption[]>([]);
  const [picked, setPicked] = useState(initialOption);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!active) return;
    const controller = new AbortController();
    let current = true;
    const timer = setTimeout(async () => {
      setBusy(true);
      setError("");
      try {
        const response = await fetch("/api/shopify/variants?q=" + encodeURIComponent(search), { signal: controller.signal });
        const data = await response.json() as { options?: ShopifyOption[]; error?: string };
        if (!current) return;
        setOptions(data.options ?? []);
        setError(data.error ?? (!response.ok ? "Could not load variants. Try searching again." : ""));
      } catch {
        if (current) { setOptions([]); setError("Could not load variants. Try searching again."); }
      } finally { if (current) setBusy(false); }
    }, 300);
    return () => { current = false; clearTimeout(timer); controller.abort(); };
  }, [active, search]);

  const selected = options.find((option) => option.id === value) ?? (picked?.id === value ? picked : undefined);
  return <div className="space-y-1.5">
    <input type="search" aria-label={"Search " + label} value={search} maxLength={100}
      onFocus={() => { if (!active) { setBusy(true); setActive(true); } }}
      onChange={(event) => { setSearch(event.target.value); setBusy(true); setActive(true); }}
      placeholder="Search product, variant or SKU" className={input} />
    <select name={name} aria-label={label} value={value} aria-busy={busy} onFocus={() => { if (!active) { setBusy(true); setActive(true); } }}
      onChange={(event) => { const option = options.find((item) => item.id === event.target.value); setPicked(option); onChange(event.target.value, option); }} className={input}>
      <option value="">{emptyLabel}</option>
      {selected && !options.some((option) => option.id === selected.id) && <option value={selected.id}>{title(selected)}</option>}
      {options.map((option) => <option key={option.id} value={option.id}>{title(option)}</option>)}
    </select>
    <p aria-live="polite" role={error ? "alert" : "status"} className="text-xs text-[#737373]">{busy ? "Searching Shopify…" : error || (!active ? "Search when you are ready to map this SKU." : !options.length ? "No matching variants. Try another product name or SKU." : options.length + (options.length === 30 ? "+" : "") + " matches. Refine your search to find a variant.")}</p>
  </div>;
}
