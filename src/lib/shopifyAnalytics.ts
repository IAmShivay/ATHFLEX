import { fetchShopifyOrders } from "./shopify";

export type ShopifyAnalytics = {
  kpis: { revenue: number; prevRevenue: number };
  series: { label: string; value: number }[];
  monthly: { label: string; value: number }[];
  channels: { channel: string; orders: number; total: number }[];
  weekdays: { label: string; value: number }[];
};

const CHANNEL_LABELS: Record<string, string> = {
  web: "Online Store",
  pos: "POS",
  shopify_draft_order: "Draft Orders",
  instagram: "Instagram",
  facebook: "Facebook",
  whatsapp: "WhatsApp",
  mobile: "Mobile App",
};

function channelLabel(src: string | null): string {
  if (!src) return "Other";
  if (/^\d+$/.test(src)) return "App API";
  return (
    CHANNEL_LABELS[src] ??
    src.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
  );
}

const DAY = 864e5;

export async function getShopifyAnalytics(): Promise<ShopifyAnalytics | null> {
  const orders = await fetchShopifyOrders(200);
  if (!orders) return null;

  const valid = orders.filter((o) => !o.cancelled_at && !o.test && o.financial_status !== "voided");
  const now = Date.now();
  const inLast = (o: (typeof valid)[number], fromDaysAgo: number, toDaysAgo: number) => {
    const t = new Date(o.created_at).getTime();
    return t >= now - fromDaysAgo * DAY && t < now - toDaysAgo * DAY;
  };

  const cur = valid.filter((o) => inLast(o, 30, 0));
  const prev = valid.filter((o) => inLast(o, 60, 30));
  const kpis = {
    revenue: cur.reduce((s, o) => s + Number(o.total_price), 0),
    prevRevenue: prev.reduce((s, o) => s + Number(o.total_price), 0),
  };

  const byDay = new Map<string, number>();
  for (const o of cur) {
    const key = new Date(o.created_at).toDateString();
    byDay.set(key, (byDay.get(key) ?? 0) + Number(o.total_price));
  }
  const series = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now - i * DAY);
    series.push({
      label: new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(d),
      value: byDay.get(d.toDateString()) ?? 0,
    });
  }

  const monthKeys: { key: string; label: string }[] = [];
  const first = new Date();
  first.setDate(1);
  for (let i = 5; i >= 0; i--) {
    const m = new Date(first.getFullYear(), first.getMonth() - i, 1);
    monthKeys.push({
      key: `${m.getFullYear()}-${m.getMonth()}`,
      label: new Intl.DateTimeFormat("en-US", { month: "short" }).format(m),
    });
  }
  const byMonth = new Map<string, number>();
  for (const o of valid) {
    const d = new Date(o.created_at);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    byMonth.set(key, (byMonth.get(key) ?? 0) + Number(o.total_price));
  }
  const monthly = monthKeys.map((m) => ({ label: m.label, value: byMonth.get(m.key) ?? 0 }));

  const byChannel = new Map<string, { orders: number; total: number }>();
  for (const o of valid) {
    const label = channelLabel(o.source_name);
    const entry = byChannel.get(label) ?? { orders: 0, total: 0 };
    entry.orders++;
    entry.total += Number(o.total_price);
    byChannel.set(label, entry);
  }
  const channels = [...byChannel.entries()]
    .map(([channel, v]) => ({ channel, ...v }))
    .sort((a, b) => b.total - a.total);

  const names = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const dow = new Array(7).fill(0);
  for (const o of valid) dow[new Date(o.created_at).getDay()]++;
  const weekdays = names.map((label, i) => ({ label, value: dow[i] }));

  return { kpis, series, monthly, channels, weekdays };
}
