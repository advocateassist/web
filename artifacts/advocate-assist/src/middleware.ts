import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";
import { NextResponse } from "next/server";

const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const { nextUrl } = req;
  const session = req.auth;
  const isAuthenticated = !!session;

  // Always allow: NextAuth internal routes, sign-in UI, health probe, and public pages
  const isAuthPath =
    nextUrl.pathname.startsWith("/api/auth") ||
    nextUrl.pathname.startsWith("/auth") ||
    nextUrl.pathname === "/api/healthz" ||
    nextUrl.pathname === "/about" ||
    nextUrl.pathname === "/terms" ||
    nextUrl.pathname === "/founder";

  if (isAuthPath) return NextResponse.next();

  // Dev-only preview routes — bypass auth so screens can be previewed
  if (nextUrl.pathname.startsWith("/preview-dev")) return NextResponse.next();

  // ── Unauthenticated API calls → 401 (not a redirect) ──────────────────────
  if (!isAuthenticated && nextUrl.pathname.startsWith("/api/")) {
    return new NextResponse(
      JSON.stringify({ error: "Authentication required." }),
      { status: 401, headers: { "Content-Type": "application/json" } }
    );
  }

  // ── Unauthenticated page request → sign-in page ───────────────────────────
  if (!isAuthenticated) {
    return NextResponse.redirect(new URL("/auth/signin", nextUrl));
  }

  const isOnboarded = req.cookies.get("aa_onboarded")?.value === "1";
  const isOnboardingPage = nextUrl.pathname === "/onboarding";

  // ── Authenticated but not onboarded → onboarding ─────────────────────────
  if (!isOnboarded && !isOnboardingPage) {
    return NextResponse.redirect(new URL("/onboarding", nextUrl));
  }

  // ── Already onboarded → block re-visiting onboarding ─────────────────────
  if (isOnboarded && isOnboardingPage) {
    return NextResponse.redirect(new URL("/", nextUrl));
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:png|svg|jpg|jpeg|gif|webp)$).*)",
  ],
};
