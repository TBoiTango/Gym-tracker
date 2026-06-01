// Workout history — list of past sessions with delete and edit options.
import { redirect } from "next/navigation";
import Link from "next/link";
import { createServerClient } from "@/lib/supabase/server";
import HistoryList from "@/components/workout/HistoryList";

export default async function HistoryPage() {
  const supabase = createServerClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) redirect("/login");

  const { data: sessions } = await supabase
    .from("workout_sessions")
    .select("id, plan_day, started_at, completed_at")
    .eq("user_id", session.user.id)
    .order("started_at", { ascending: false })
    .limit(100);

  return (
    <main className="mx-auto max-w-lg px-4 py-8">
      <Link href="/dashboard" className="mb-6 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-300">
        ← Dashboard
      </Link>
      <h1 className="text-2xl font-bold mb-6">Workout History</h1>
      <HistoryList sessions={sessions ?? []} />
    </main>
  );
}
