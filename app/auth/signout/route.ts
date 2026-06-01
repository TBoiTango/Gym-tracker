// POST /auth/signout — signs the user out and redirects to /login.
import { createServerClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { headers } from "next/headers";

export async function POST() {
  const supabase = createServerClient();
  await supabase.auth.signOut();

  // Use the request's host to build the redirect URL — works on localhost and Vercel.
  const headersList = headers();
  const host = headersList.get("host") ?? "localhost:3000";
  const proto = host.includes("localhost") ? "http" : "https";

  return NextResponse.redirect(`${proto}://${host}/login`);
}
