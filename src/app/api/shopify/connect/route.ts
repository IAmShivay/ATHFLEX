import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";
import { appOrigin, buildAuthorizeUrl, generateState, oauthConfigured } from "@/lib/shopify";
import { getOptionalUser } from "@/lib/dal";
import { hasPermission } from "@/lib/permissions";

const STATE_COOKIE = "shopify_oauth_state";

export async function GET(req: NextRequest) {
  const user = await getOptionalUser();
  if (!user) {
    return NextResponse.redirect(new URL("/login", appOrigin(req.nextUrl.origin)));
  }
  if (!hasPermission(user, "shopify")) return new NextResponse("Forbidden", { status: 403 });

  if (!oauthConfigured()) {
    return NextResponse.redirect(new URL("/settings?error=not_configured#shopify", appOrigin(req.nextUrl.origin)));
  }

  const state = generateState();
  const authorizeUrl = buildAuthorizeUrl(state, appOrigin(req.nextUrl.origin));
  if (!authorizeUrl) {
    return NextResponse.redirect(new URL("/settings?error=not_configured#shopify", appOrigin(req.nextUrl.origin)));
  }

  const store = await cookies();
  store.set(STATE_COOKIE, state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 600,
    path: "/",
  });

  return NextResponse.redirect(authorizeUrl);
}
