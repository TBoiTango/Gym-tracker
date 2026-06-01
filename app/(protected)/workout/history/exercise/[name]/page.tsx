// Exercise history — every time this exercise was logged, with a simple trend.
import { redirect } from "next/navigation";
import Link from "next/link";
import { createServerClient } from "@/lib/supabase/server";
import type { ExerciseLog } from "@/types";
import Card from "@/components/ui/Card";

interface Props {
  params: { name: string };
}

export default async function ExerciseHistoryPage({ params }: Props) {
  const supabase = createServerClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) redirect("/login");

  const exerciseName = decodeURIComponent(params.name);

  // Get all logs for this exercise across all sessions
  const { data: sessions } = await supabase
    .from("workout_sessions")
    .select("id, plan_day, started_at")
    .eq("user_id", session.user.id)
    .not("completed_at", "is", null);

  const sessionIds = (sessions ?? []).map((s) => s.id);
  const sessionMap = new Map((sessions ?? []).map((s) => [s.id, s]));

  const { data: logs } = sessionIds.length
    ? await supabase
        .from("exercise_logs")
        .select("*")
        .in("session_id", sessionIds)
        .ilike("exercise_name", exerciseName)
    : { data: [] };

  const exerciseLogs: ExerciseLog[] = (logs ?? []).sort((a, b) =>
    new Date(sessionMap.get(a.session_id)?.started_at ?? 0).getTime() -
    new Date(sessionMap.get(b.session_id)?.started_at ?? 0).getTime()
  );

  // Best set per session (heaviest single set weight)
  const history = exerciseLogs.map((log) => {
    const sess = sessionMap.get(log.session_id);
    const weights = log.weight_per_set as number[];
    const reps = log.reps_per_set as number[];
    const bestWeight = weights.length ? Math.max(...weights) : 0;
    const totalVol = weights.reduce((sum, w, i) => sum + w * (reps[i] ?? 0), 0);
    return {
      date: sess?.started_at ? new Date(sess.started_at) : new Date(),
      planDay: sess?.plan_day ?? "",
      sets: log.sets_completed,
      reps,
      weights,
      bestWeight,
      totalVol,
    };
  });

  const maxWeight = history.length ? Math.max(...history.map((h) => h.bestWeight), 1) : 1;
  const pr = history.length ? Math.max(...history.map((h) => h.bestWeight)) : 0;

  return (
    <main className="mx-auto max-w-lg px-4 py-8">
      <Link href="/workout/history" className="mb-6 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-300">
        ← History
      </Link>

      <div className="mb-6">
        <h1 className="text-2xl font-bold">{exerciseName}</h1>
        <p className="text-sm text-gray-400 mt-1">
          {history.length} session{history.length !== 1 ? "s" : ""} logged
          {pr > 0 && ` · PR: ${pr} lbs`}
        </p>
      </div>

      {history.length === 0 ? (
        <p className="text-gray-500 text-sm">No logs found for this exercise yet.</p>
      ) : (
        <>
          {/* Mini trend chart */}
          {history.length > 1 && (
            <Card className="mb-6">
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-3">
                Best Weight Trend
              </p>
              <div className="flex items-end gap-1.5 h-20">
                {history.map((h, i) => {
                  const pct = maxWeight > 0 ? Math.max((h.bestWeight / maxWeight) * 100, 4) : 4;
                  return (
                    <div key={i} className="flex flex-col items-center gap-1 flex-1">
                      <div
                        className="w-full rounded-t-sm bg-orange-500"
                        style={{ height: `${pct}%` }}
                      />
                    </div>
                  );
                })}
              </div>
              <div className="flex justify-between text-xs text-gray-600 mt-1">
                <span>{history[0].date.toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</span>
                <span>{history[history.length - 1].date.toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</span>
              </div>
            </Card>
          )}

          {/* Session log */}
          <div className="space-y-4">
            {[...history].reverse().map((h, i) => (
              <Card key={i}>
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="font-semibold text-sm">
                      {h.date.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric" })}
                    </p>
                    <p className="text-xs text-gray-500">{h.planDay}</p>
                  </div>
                  {h.bestWeight > 0 && (
                    <span className="text-orange-400 text-sm font-semibold">{h.bestWeight} lbs</span>
                  )}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {h.weights.map((w, j) => (
                    <span key={j} className="rounded-lg bg-gray-800 px-2 py-1 text-xs text-gray-300">
                      {w > 0 ? `${w} lbs × ${h.reps[j]}` : `${h.reps[j]} reps`}
                    </span>
                  ))}
                </div>
              </Card>
            ))}
          </div>
        </>
      )}
    </main>
  );
}
