// Browser-side Supabase client — use this in Client Components ("use client")
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

export const createClient = () => createClientComponentClient();
