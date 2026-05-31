// Root page — check session server-side and redirect appropriately.
import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";

export default async function RootPage() {
  const supabase = createServerClient();
  const { data: { session } } = await supabase.auth.getSession();

  if (session) {
    // Check if setup is complete (profile has a name)
    const { data: profile } = await supabase
      .from("profiles")
      .select("name")
      .eq("user_id", session.user.id)
      .single();

    if (!profile?.name) {
      redirect("/setup");
    }
    redirect("/dashboard");
  }

  redirect("/login");
}
