// Post-workout summary — sets completed, muscle groups, intensity, smart volume.
import { redirect } from "next/navigation";
import Link from "next/link";
import { createServerClient } from "@/lib/supabase/server";
import type { ExerciseLog } from "@/types";
import Card from "@/components/ui/Card";

interface Props {
  params: { sessionId: string };
}

// Exercises that are bodyweight — don't count lbs toward volume
const BODYWEIGHT_KEYWORDS = [
  "pull-up", "pull up", "pullup", "chin-up", "chin up", "chinup",
  "dip", "push-up", "push up", "pushup", "bodyweight", "body weight",
  "hanging", "inverted row", "muscle-up", "muscle up",
  "pistol squat", "nordic", "glute bridge", "hip thrust",
  "plank", "dead bug", "ab wheel", "leg raise", "sit-up", "sit up",
  "crunch", "mountain climber", "burpee",
];

// Cardio keywords — show time/distance, not lbs
const CARDIO_KEYWORDS = [
  "treadmill", "rowing", "rower", "bike", "cycling", "elliptical",
  "stair", "jump rope", "battle rope", "sprint", "run", "jog",
  "cardio", "intervals",
];

function isBodyweight(name: string) {
  const lower = name.toLowerCase();
  return BODYWEIGHT_KEYWORDS.some((kw) => lower.includes(kw));
}

function isCardio(name: string) {
  const lower = name.toLowerCase();
  return CARDIO_KEYWORDS.some((kw) => lower.includes(kw));
}

export default async function SessionSummaryPage({ params }: Props) {
  const supabase = createServerClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) redirect("/login");

  const { data: workoutSession } = await supabase
    .from("workout_sessions")
    .select("id, plan_day, started_at, completed_at, user_id, exercises_data")
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

  // ── Metrics ──────────────────────────────────────────────────────────────

  // Total sets completed
  const totalSets = exerciseLogs.reduce((sum, log) => sum + log.sets_completed, 0);

  // Total reps
  const totalReps = exerciseLogs.reduce((sum, log) =>
    sum + (log.reps_per_set as number[]).reduce((a, b) => a + b, 0), 0);

  // Smart volume — skip bodyweight and cardio exercises
  let liftingVolume = 0;
  for (const log of exerciseLogs) {
    if (isBodyweight(log.exercise_name) || isCardio(log.exercise_name)) continue;
    for (let i = 0; i < log.sets_completed; i++) {
      liftingVolume += ((log.weight_per_set as number[])[i] ?? 0) * ((log.reps_per_set as number[])[i] ?? 0);
    }
  }

  // Session duration
  const duration = workoutSession.completed_at
    ? Math.round(
        (new Date(workoutSession.completed_at).getTime() -
          new Date(workoutSession.started_at).getTime()) / 60000
      )
    : null;

  // Intensity score (0–100): based on avg weight relative to rep range
  // Higher weight + lower reps = higher intensity
  const intensityScores: number[] = [];
  for (const log of exerciseLogs) {
    if (isCardio(log.exercise_name) || log.sets_completed === 0) continue;
    const weights = log.weight_per_set as number[];
    const reps = log.reps_per_set as number[];
    const avgWeight = weights.reduce((a, b) => a + b, 0) / weights.length;
    const avgReps = reps.reduce((a, b) => a + b, 0) / reps.length;
    if (avgWeight > 0) {
      // Lower reps + higher weight = higher intensity (rough estimate)
      const score = Math.min(100, Math.round((avgWeight / (avgReps * 2)) * 10));
      intensityScores.push(score);
    }
  }
  const intensityScore = intensityScores.length
    ? Math.min(100, Math.round(intensityScores.reduce((a, b) => a + b, 0) / intensityScores.length))
    : null;

  const intensityLabel = intensityScore === null ? null
    : intensityScore >= 75 ? "High 🔥"
    : intensityScore >= 45 ? "Moderate 💪"
    : "Light 🌱";

  // Muscle groups trained (from plan day data if available)
  const planDay = workoutSession.plan_day ?? "";

  // Exercise breakdown
  const liftingExercises = exerciseLogs.filter(
    (l) => !isCardio(l.exercise_name)
  );
  const cardioExercises = exerciseLogs.filter((l) => isCardio(l.exercise_name));

  return (
    <main className="mx-auto max-w-lg px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Session Complete 🎉</h1>
        <p className="text-gray-400 mt-1">{planDay}</p>
        {duration !== null && (
          <p className="text-sm text-gray-500 mt-0.5">
            {new Date(workoutSession.started_at).toLocaleDateString("en-GB", {
              weekday: "long", day: "numeric", month: "short",
            })} · {duration} min
          </p>
        )}
      </div>

      {/* Key stats */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <StatCard label="Sets Completed" value={String(totalSets)} />
        <StatCard label="Total Reps" value={String(totalReps)} />
        {liftingVolume > 0 && (
          <StatCard
            label="Lifting Volume"
            value={`${Math.round(liftingVolume).toLocaleString()} lbs`}
          />
        )}
        {intensityLabel && (
          <StatCard label="Intensity" value={intensityLabel} />
        )}
      </div>

      {/* Lifting breakdown */}
      {liftingExercises.length > 0 && (
        <Card className="mb-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-3">
            Lifting
          </p>
          <div className="space-y-4">
            {liftingExercises.map((log) => {
              const bw = isBodyweight(log.exercise_name);
              return (
                <div key={log.id}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-medium">{log.exercise_name}</span>
                    <span className="text-gray-500 text-xs">{log.sets_completed} sets</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {(log.reps_per_set as number[]).map((reps, i) => (
                      <span key={i} className="rounded-lg bg-gray-800 px-2 py-1 text-xs text-gray-300">
                        {bw
                          ? `${reps} reps`
                          : `${(log.weight_per_set as number[])[i]} lbs × ${reps}`}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Cardio breakdown */}
      {cardioExercises.length > 0 && (
        <Card className="mb-6">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-3">
            Cardio
          </p>
          <div className="space-y-2">
            {cardioExercises.map((log) => (
              <div key={log.id} className="flex justify-between text-sm">
                <span className="font-medium">{log.exercise_name}</span>
                <span className="text-gray-400">
                  {(log.reps_per_set as number[])[0] ?? `${log.sets_completed} set`}
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Link
        href="/dashboard"
        className="block w-full rounded-xl bg-orange-500 py-4 text-center text-lg font-semibold text-white hover:bg-orange-600 transition-colors"
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
