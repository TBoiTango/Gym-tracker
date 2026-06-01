// Analytics dashboard — volume trends, PRs, consistency, top exercises.
import { redirect } from "next/navigation";
import Link from "next/link";
import { createServerClient } from "@/lib/supabase/server";
import type { ExerciseLog } from "@/types";
import Card from "@/components/ui/Card";
import VolumeChart from "@/components/analytics/VolumeChart";
import PRList from "@/components/analytics/PRList";

export default async function AnalyticsPage() {
  const supabase = createServerClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) redirect("/login");

  const userId = session.user.id;

  // All completed sessions
  const { data: sessions } = await supabase
    .from("workout_sessions")
    .select("id, plan_day, started_at, completed_at")
    .eq("user_id", userId)
    .not("completed_at", "is", null)
    .order("started_at", { ascending: true });

  // All exercise logs
  const sessionIds = (sessions ?? []).map((s) => s.id);
  const { data: logs } = sessionIds.length
    ? await supabase.from("exercise_logs").select("*").in("session_id", sessionIds)
    : { data: [] };

  const exerciseLogs: ExerciseLog[] = logs ?? [];
  const completedSessions = sessions ?? [];

  // ── Stats ────────────────────────────────────────────────────────────────
  const totalSessions = completedSessions.length;

  const totalVolume = exerciseLogs.reduce((sum, log) => {
    for (let i = 0; i < log.sets_completed; i++) {
      sum += (log.weight_per_set[i] ?? 0) * (log.reps_per_set[i] ?? 0);
    }
    return sum;
  }, 0);

  const totalSets = exerciseLogs.reduce((sum, log) => sum + log.sets_completed, 0);

  // Best lift (highest single weight logged) per exercise
  const prMap = new Map<string, number>();
  for (const log of exerciseLogs) {
    const maxWeight = Math.max(...(log.weight_per_set as number[]));
    if (!prMap.has(log.exercise_name) || maxWeight > prMap.get(log.exercise_name)!) {
      prMap.set(log.exercise_name, maxWeight);
    }
  }
  const prs = Array.from(prMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  // Most frequent exercises
  const freqMap = new Map<string, number>();
  for (const log of exerciseLogs) {
    freqMap.set(log.exercise_name, (freqMap.get(log.exercise_name) ?? 0) + 1);
  }
  const topExercises = Array.from(freqMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  // Weekly volume — last 8 weeks
  const weeklyVolume = buildWeeklyVolume(completedSessions, exerciseLogs, 8);

  // Consistency — sessions per week for last 8 weeks
  const weeklySessions = buildWeeklySessions(completedSessions, 8);

  return (
    <main className="mx-auto max-w-lg px-4 py-8 space-y-6">
      <Link href="/dashboard" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-300">
        ← Dashboard
      </Link>

      <h1 className="text-2xl font-bold">Your Progress 📊</h1>

      {/* Top stats */}
      <div className="grid grid-cols-3 gap-3">
        <StatCard label="Workouts" value={String(totalSessions)} />
        <StatCard label="Total Sets" value={String(totalSets)} />
        <StatCard label="Total Volume" value={`${Math.round(totalVolume / 1000)}k lbs`} />
      </div>

      {/* Weekly volume chart */}
      <Card>
        <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-4">
          Weekly Volume (lbs) — last 8 weeks
        </p>
        {weeklyVolume.every((w) => w.volume === 0) ? (
          <p className="text-sm text-gray-500">No data yet — complete some workouts first!</p>
        ) : (
          <VolumeChart data={weeklyVolume} />
        )}
      </Card>

      {/* Weekly session consistency */}
      <Card>
        <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-4">
          Sessions per Week — last 8 weeks
        </p>
        <div className="flex items-end gap-2 h-16">
          {weeklySessions.map((w, i) => {
            const maxSessions = Math.max(...weeklySessions.map((x) => x.count), 1);
            const height = Math.max((w.count / maxSessions) * 100, 4);
            return (
              <div key={i} className="flex flex-col items-center gap-1 flex-1">
                <div
                  className="w-full rounded-t-sm bg-orange-500 transition-all"
                  style={{ height: `${height}%` }}
                />
                <span className="text-xs text-gray-600">{w.label}</span>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Personal records */}
      <Card>
        <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-4">
          Personal Records (Best Weight)
        </p>
        {prs.length === 0 ? (
          <p className="text-sm text-gray-500">No lifts logged yet.</p>
        ) : (
          <PRList prs={prs} />
        )}
      </Card>

      {/* Most trained exercises */}
      <Card>
        <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-4">
          Most Trained Exercises
        </p>
        {topExercises.length === 0 ? (
          <p className="text-sm text-gray-500">No data yet.</p>
        ) : (
          <div className="space-y-3">
            {topExercises.map(([name, count], i) => {
              const maxCount = topExercises[0][1];
              return (
                <div key={name}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-medium">{name}</span>
                    <span className="text-gray-400">{count}× logged</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-gray-800">
                    <div
                      className="h-1.5 rounded-full bg-orange-500"
                      style={{ width: `${(count / maxCount) * 100}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* Day breakdown */}
      {completedSessions.length > 0 && (
        <Card>
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-4">
            Most Trained Days
          </p>
          <DayBreakdown sessions={completedSessions} />
        </Card>
      )}
    </main>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function getWeekLabel(date: Date): string {
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function buildWeeklyVolume(
  sessions: { id: string; started_at: string }[],
  logs: ExerciseLog[],
  weeks: number
) {
  const logsBySession = new Map<string, ExerciseLog[]>();
  for (const log of logs) {
    if (!logsBySession.has(log.session_id)) logsBySession.set(log.session_id, []);
    logsBySession.get(log.session_id)!.push(log);
  }

  const results = [];
  const now = new Date();

  for (let w = weeks - 1; w >= 0; w--) {
    const start = new Date(now);
    start.setDate(start.getDate() - (w + 1) * 7);
    const end = new Date(now);
    end.setDate(end.getDate() - w * 7);

    const weekSessions = sessions.filter((s) => {
      const d = new Date(s.started_at);
      return d >= start && d < end;
    });

    let volume = 0;
    for (const s of weekSessions) {
      for (const log of logsBySession.get(s.id) ?? []) {
        for (let i = 0; i < log.sets_completed; i++) {
          volume += (log.weight_per_set[i] ?? 0) * (log.reps_per_set[i] ?? 0);
        }
      }
    }

    results.push({ label: getWeekLabel(start), volume: Math.round(volume) });
  }

  return results;
}

function buildWeeklySessions(
  sessions: { started_at: string }[],
  weeks: number
) {
  const results = [];
  const now = new Date();

  for (let w = weeks - 1; w >= 0; w--) {
    const start = new Date(now);
    start.setDate(start.getDate() - (w + 1) * 7);
    const end = new Date(now);
    end.setDate(end.getDate() - w * 7);

    const count = sessions.filter((s) => {
      const d = new Date(s.started_at);
      return d >= start && d < end;
    }).length;

    results.push({ label: start.toLocaleDateString("en-US", { month: "short", day: "numeric" }), count });
  }

  return results;
}

function DayBreakdown({ sessions }: { sessions: { plan_day: string }[] }) {
  const dayCount = new Map<string, number>();
  for (const s of sessions) {
    dayCount.set(s.plan_day, (dayCount.get(s.plan_day) ?? 0) + 1);
  }
  const sorted = Array.from(dayCount.entries()).sort((a, b) => b[1] - a[1]);
  const max = sorted[0]?.[1] ?? 1;

  return (
    <div className="space-y-3">
      {sorted.map(([day, count]) => (
        <div key={day}>
          <div className="flex justify-between text-sm mb-1">
            <span className="font-medium">{day}</span>
            <span className="text-gray-400">{count} sessions</span>
          </div>
          <div className="h-1.5 rounded-full bg-gray-800">
            <div className="h-1.5 rounded-full bg-purple-500" style={{ width: `${(count / max) * 100}%` }} />
          </div>
        </div>
      ))}
    </div>
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
