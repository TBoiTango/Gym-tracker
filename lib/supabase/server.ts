// Server-side Supabase client — use this in Server Components and Route Handlers
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";

export const createServerClient = () =>
  createServerComponentClient({ cookies });
