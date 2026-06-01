// Post-workout summary — volume per muscle group and any PRs hit.
import { redirect } from "next/navigation";
import Link from "next/link";
import { createServerClient } from "@/lib/supabase/server";
import type { ExerciseLog } from "@/types";
import Card from "@/components/ui/Card";

interface Props {
  params: { sessionId: string };
}

export default async function SessionSummaryPage({ params }: Props) {
  const supabase = createServerClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) redirect("/login");

  const { data: workoutSession } = await supabase
    .from("workout_sessions")
    .select("id, plan_day, started_at, completed_at, user_id")
    .eq("id", params.sessionId)
    .single();

  if (!workoutSession || workoutSession.user_id !== session.user.id) {
    redirect("/dashboard");
  }

  const { data: logs } = await supabase
    .from("exercise_logs")
    .select("*")
    .eq("session_id", params.sessionId);

  const exerciseLogs: ExerciseLog[] = logs ?? [];

  // Calculate total volume per exercise (weight × reps summed across all sets)
  const volumeMap = new Map<string, number>();
  for (const log of exerciseLogs) {
    let vol = 0;
    for (let i = 0; i < log.sets_completed; i++) {
      vol += (log.weight_per_set[i] ?? 0) * (log.reps_per_set[i] ?? 0);
    }
    volumeMap.set(log.exercise_name, (volumeMap.get(log.exercise_name) ?? 0) + vol);
  }

  const totalVolume = Array.from(volumeMap.values()).reduce((a, b) => a + b, 0);

  const duration = workoutSession.completed_at
    ? Math.round(
        (new Date(workoutSession.completed_at).getTime() -
          new Date(workoutSession.started_at).getTime()) /
          60000
      )
    : null;

  return (
    <main className="mx-auto max-w-lg px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Session Complete 🎉</h1>
        <p className="text-gray-400 mt-1">{workoutSession.plan_day}</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <StatCard label="Exercises" value={exerciseLogs.length.toString()} />
        <StatCard label="Total Volume" value={`${Math.round(totalVolume).toLocaleString()} lbs`} />
        {duration !== null && <StatCard label="Duration" value={`${duration}m`} />}
      </div>

      {/* Volume breakdown */}
      <Card className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-3">
          Volume breakdown
        </p>
        <div className="space-y-3">
          {exerciseLogs.map((log) => {
            const vol = volumeMap.get(log.exercise_name) ?? 0;
            return (
              <div key={log.id}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="font-medium">{log.exercise_name}</span>
                  <span className="text-gray-400">{vol.toLocaleString()} lbs</span>
                </div>
                <p className="text-xs text-gray-500">
                  {log.sets_completed} sets ·{" "}
                  {log.reps_per_set.join(", ")} reps ·{" "}
                  {log.weight_per_set.join(", ")} lbs
                </p>
              </div>
            );
          })}
        </div>
      </Card>

      <Link
        href="/dashboard"
        className="block w-full rounded-xl bg-orange-500 py-4 text-center text-lg font-semibold text-white hover:bg-orange-600"
      >
        Back to Dashboard
      </Link>
    </main>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900 p-3 text-center">
      <p className="text-xl font-bold">{value}</p>
      <p className="text-xs text-gray-500 mt-0.5">{label}</p>
    </div>
  );
}
