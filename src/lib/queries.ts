import { query } from "./db";

export type Kpis = {
  revenue: number;
  prevRevenue: number;
  orders: number;
  prevOrders: number;
  aov: number;
  prevAov: number;
  returningRate: number;
  newCustomers: number;
};

export async function getKpis(): Promise<Kpis> {
  const { rows } = await query<{
    revenue: string;
    prev_revenue: string;
    orders: string;
    prev_orders: string;
  }>(
    `SELECT
      COALESCE(SUM(total) FILTER (WHERE created_at >= now() - interval '30 days'), 0) AS revenue,
      COALESCE(SUM(total) FILTER (WHERE created_at >= now() - interval '60 days' AND created_at < now() - interval '30 days'), 0) AS prev_revenue,
      COUNT(*) FILTER (WHERE created_at >= now() - interval '30 days') AS orders,
      COUNT(*) FILTER (WHERE created_at >= now() - interval '60 days' AND created_at < now() - interval '30 days') AS prev_orders
    FROM orders`
  );
  const r = rows[0];
  const revenue = Number(r.revenue);
  const prevRevenue = Number(r.prev_revenue);
  const orders = Number(r.orders);
  const prevOrders = Number(r.prev_orders);

  const { rows: cust } = await query<{ returning: string; total: string; fresh: string }>(
    `SELECT
      COUNT(*) FILTER (WHERE orders_count > 1) AS returning,
      COUNT(*) AS total,
      COUNT(*) FILTER (WHERE created_at >= now() - interval '30 days') AS fresh
    FROM customers`
  );
  const c = cust[0];

  return {
    revenue,
    prevRevenue,
    orders,
    prevOrders,
    aov: orders ? revenue / orders : 0,
    prevAov: prevOrders ? prevRevenue / prevOrders : 0,
    returningRate: Number(c.total) ? (Number(c.returning) / Number(c.total)) * 100 : 0,
    newCustomers: Number(c.fresh),
  };
}

export type SeriesPoint = { label: string; value: number };

export async function getRevenueSeries(days = 30): Promise<SeriesPoint[]> {
  const { rows } = await query<{ day: string; total: string }>(
    `SELECT date_trunc('day', created_at)::date AS day, SUM(total) AS total
     FROM orders
     WHERE created_at >= now() - ($1 || ' days')::interval
     GROUP BY 1 ORDER BY 1`,
    [days]
  );
  const byDay = new Map(rows.map((r) => [new Date(r.day).toDateString(), Number(r.total)]));
  const out: SeriesPoint[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(Date.now() - i * 864e5);
    out.push({
      label: new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(d),
      value: byDay.get(d.toDateString()) ?? 0,
    });
  }
  return out;
}

export type OrderRow = {
  id: number;
  order_number: string;
  created_at: string;
  customer_name: string;
  channel: string;
  financial_status: string;
  fulfillment_status: string;
  items_count: number;
  total: string;
};

export async function getRecentOrders(limit = 8): Promise<OrderRow[]> {
  const { rows } = await query<OrderRow>(
    `SELECT o.id, o.order_number, o.created_at, c.name AS customer_name, o.channel,
            o.financial_status, o.fulfillment_status, o.items_count, o.total
     FROM orders o JOIN customers c ON c.id = o.customer_id
     ORDER BY o.created_at DESC LIMIT $1`,
    [limit]
  );
  return rows;
}

export type ProductRow = {
  id: number;
  title: string;
  product_type: string;
  status: string;
  price: string;
  inventory: number;
  sku: string;
  sales: number;
  color: string;
};

export async function getTopProducts(limit = 5) {
  const { rows } = await query<ProductRow & { revenue: string }>(
    `SELECT id, title, product_type, status, price, inventory, sku, sales, color,
            (price * sales) AS revenue
     FROM products WHERE status = 'active'
     ORDER BY (price * sales) DESC LIMIT $1`,
    [limit]
  );
  return rows;
}

export async function getMonthlyRevenue(months = 6): Promise<SeriesPoint[]> {
  const { rows } = await query<{ label: string; total: string }>(
    `SELECT to_char(date_trunc('month', created_at), 'Mon') AS label, SUM(total) AS total
     FROM orders
     WHERE created_at >= date_trunc('month', now()) - ($1 || ' months')::interval
     GROUP BY date_trunc('month', created_at)
     ORDER BY date_trunc('month', created_at)`,
    [months - 1]
  );
  return rows.map((r) => ({ label: r.label, value: Number(r.total) }));
}

export async function getChannelBreakdown() {
  const { rows } = await query<{ channel: string; orders: string; total: string }>(
    `SELECT channel, COUNT(*) AS orders, SUM(total) AS total
     FROM orders GROUP BY channel ORDER BY SUM(total) DESC`
  );
  return rows.map((r) => ({ channel: r.channel, orders: Number(r.orders), total: Number(r.total) }));
}

export async function getWeekdayOrders(): Promise<SeriesPoint[]> {
  const { rows } = await query<{ dow: string; cnt: string }>(
    `SELECT EXTRACT(DOW FROM created_at) AS dow, COUNT(*) AS cnt
     FROM orders GROUP BY 1 ORDER BY 1`
  );
  const names = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const byDay = new Map(rows.map((r) => [Number(r.dow), Number(r.cnt)]));
  return names.map((label, i) => ({ label, value: byDay.get(i) ?? 0 }));
}
