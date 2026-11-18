import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";
import { timingSafeEqual } from "node:crypto";
import { appOrigin, exchangeCodeForToken, saveToken, storeDomain } from "@/lib/shopify";
import { verifyShopifyCallback } from "@/lib/shopify-callback";
import { getOptionalUser } from "@/lib/dal";
import { hasPermission } from "@/lib/permissions";

const STATE_COOKIE = "shopify_oauth_state";

function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  return ba.length === bb.length && timingSafeEqual(ba, bb);
}

export async function GET(req: NextRequest) {
  const user = await getOptionalUser();
  const origin = appOrigin(req.nextUrl.origin);
  if (!user) {
    return NextResponse.redirect(new URL("/login", origin));
  }
  if (!hasPermission(user, "shopify")) return new NextResponse("Forbidden", { status: 403 });

  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state");
  const cookieState = (await cookies()).get(STATE_COOKIE)?.value;

  if (!code || !state || !cookieState || !safeEqual(state, cookieState)) {
    return NextResponse.redirect(new URL("/settings?error=state_mismatch#shopify", origin));
  }
  if (!verifyShopifyCallback(req.nextUrl.searchParams, process.env.SHOPIFY_CLIENT_SECRET, storeDomain())) {
    return NextResponse.redirect(new URL("/settings?error=invalid_callback#shopify", origin));
  }

  const result = await exchangeCodeForToken(code);
  const store = await cookies();
  store.delete(STATE_COOKIE);

  if (!result) {
    return NextResponse.redirect(new URL("/settings?error=token_exchange#shopify", origin));
  }

  try {
    await saveToken(result.access_token, result.scope);
  } catch (e) {
    console.error("failed to save shopify token", e);
    return NextResponse.redirect(new URL("/settings?error=save_failed#shopify", origin));
  }

  return NextResponse.redirect(new URL("/settings?connected=1#shopify", origin));
}
