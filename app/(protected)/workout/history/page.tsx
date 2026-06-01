// Workout history — list of past sessions with delete and edit options.
// Also includes exercise search to drill into per-exercise history.
import { redirect } from "next/navigation";
import Link from "next/link";
import { createServerClient } from "@/lib/supabase/server";
import HistoryList from "@/components/workout/HistoryList";
import ExerciseSearch from "@/components/workout/ExerciseSearch";
import type { ExerciseLog } from "@/types";

export default async function HistoryPage() {
  const supabase = createServerClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) redirect("/login");

  const { data: sessions } = await supabase
    .from("workout_sessions")
    .select("id, plan_day, started_at, completed_at, session_type")
    .eq("user_id", session.user.id)
    .order("started_at", { ascending: false })
    .limit(100);

  // Fetch all exercise names logged by this user (for search suggestions)
  const sessionIds = (sessions ?? []).map((s) => s.id);
  const { data: logs } = sessionIds.length
    ? await supabase
        .from("exercise_logs")
        .select("exercise_name")
        .in("session_id", sessionIds)
    : { data: [] };

  const exerciseNames = Array.from(
    new Set((logs ?? []).map((l: Pick<ExerciseLog, "exercise_name">) => l.exercise_name))
  ).sort();

  return (
    <main className="mx-auto max-w-lg px-4 py-8">
      <Link href="/dashboard" className="mb-6 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-300">
        ← Dashboard
      </Link>
      <h1 className="text-2xl font-bold mb-6">Workout History</h1>

      {/* Exercise search */}
      <ExerciseSearch exerciseNames={exerciseNames} />

      <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500 mb-3">Sessions</h2>
      <HistoryList sessions={sessions ?? []} />
    </main>
  );
}
