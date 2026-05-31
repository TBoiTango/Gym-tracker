// Protected layout — verifies the user is logged in on the server.
// The middleware handles redirects for unauthenticated users,
// but this double-check protects against edge cases.
import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const supabase = createServerClient();
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) redirect("/login");

  return <>{children}</>;
}
