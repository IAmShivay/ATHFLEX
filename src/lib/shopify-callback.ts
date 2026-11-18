import { createHmac, timingSafeEqual } from "node:crypto";

export function verifyShopifyCallback(params: URLSearchParams, secret: string | undefined, expectedShop: string | null): boolean {
  if (!secret || !expectedShop || params.get("shop")?.toLowerCase() !== expectedShop.toLowerCase()) return false;
  const entries = [...params.entries()];
  if (new Set(entries.map(([key]) => key)).size !== entries.length) return false;
  const hmac = params.get("hmac");
  if (!hmac || !/^[a-f0-9]{64}$/i.test(hmac)) return false;
  const message = entries.filter(([key]) => key !== "hmac").sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0).map(([key, value]) => `${key}=${value}`).join("&");
  const expected = createHmac("sha256", secret).update(message).digest();
  return timingSafeEqual(expected, Buffer.from(hmac, "hex"));
}
