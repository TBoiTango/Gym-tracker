// Route protection middleware — runs on every request before the page renders.
// If the user hits a /dashboard, /setup, or /workout route without a session,
// they are redirected to /login automatically.
import { createMiddlewareClient } from "@supabase/auth-helpers-nextjs";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req, res });

  // Refresh the session cookie so it doesn't expire mid-visit.
  const { data: { session } } = await supabase.auth.getSession();

  const isProtectedRoute = req.nextUrl.pathname.startsWith("/dashboard") ||
    req.nextUrl.pathname.startsWith("/setup") ||
    req.nextUrl.pathname.startsWith("/workout");

  if (isProtectedRoute && !session) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("redirectTo", req.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  // If logged in and hitting auth pages, redirect to dashboard.
  const isAuthRoute = req.nextUrl.pathname === "/login" ||
    req.nextUrl.pathname === "/signup";

  if (isAuthRoute && session) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  return res;
}

export const config = {
  // Run middleware on all routes except static files and Next.js internals.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
