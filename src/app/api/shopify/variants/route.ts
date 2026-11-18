import { getOptionalUser } from "@/lib/dal";
import { hasPermission } from "@/lib/permissions";
import { searchShopifyVariants } from "@/lib/shopify-variants";

export async function GET(request: Request) {
  const user = await getOptionalUser();
  const headers = { "Cache-Control": "private, no-store" };
  if (!user) return Response.json({ error: "Sign in to search Shopify." }, { status: 401, headers });
  if (!hasPermission(user, "techpacks_manage")) return Response.json({ error: "You do not have access to map Shopify variants." }, { status: 403, headers });
  const search = new URL(request.url).searchParams.get("q")?.trim() ?? "";
  if (search.length > 100) return Response.json({ error: "Search using 100 characters or fewer." }, { status: 400, headers });
  const result = await searchShopifyVariants(search);
  return Response.json(result, { status: result.error ? 502 : 200, headers });
}
