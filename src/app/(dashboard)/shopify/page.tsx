import { redirect } from "next/navigation";

export default async function ShopifyPage({ searchParams }: PageProps<"/shopify">) {
  const sp = await searchParams;
  const next = new URLSearchParams();
  for (const key of ["error", "connected", "synced", "disconnected"]) {
    const value=sp[key];
    if (typeof value === "string") next.set(key,value);
  }
  redirect(`/settings${next.size ? `?${next}` : ""}#shopify`);
}
