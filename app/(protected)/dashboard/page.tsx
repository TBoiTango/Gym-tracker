// Dashboard — shows weekly ring, active plan, last session, streak, and variation suggestions.
import { redirect } from "next/navigation";
import Link from "next/link";
import { createServerClient } from "@/lib/supabase/server";
import Card from "@/components/ui/Card";
import WeeklyRing from "@/components/dashboard/WeeklyRing";
import StreakCounter from "@/components/dashboard/StreakCounter";
import PlanSuggestionBanner from "@/components/dashboard/PlanSuggestionBanner";
import SignOutButton from "@/components/dashboard/SignOutButton";

export default async function DashboardPage() {
  const supabase = createServerClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) redirect("/login");

  const userId = session.user.id;

  // Fetch everything in parallel
  const [profileRes, planRes, sessionsRes, suggestionRes] = await Promise.all([
    supabase.from("profiles").select("*").eq("user_id", userId).single(),
    supabase
      .from("workout_plans")
      .select("id, split_type, plan_data, created_at")
      .eq("user_id", userId)
      .eq("is_active", true)
      .maybeSingle(),
    supabase
      .from("workout_sessions")
      .select("id, plan_day, started_at, completed_at")
      .eq("user_id", userId)
      .order("started_at", { ascending: false })
      .limit(30),
    supabase
      .from("plan_suggestions")
      .select("*")
      .eq("user_id", userId)
      .is("accepted", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const profile = profileRes.data;
  const plan = planRes.data;
  const sessions = sessionsRes.data ?? [];
  const workoutStyle = (profile as { workout_style?: string } | null)?.workout_style ?? "split";

  if (!profile?.name) redirect("/setup");
  // Only redirect to setup/plan if user has a split-based style but no plan
  if (!plan && workoutStyle === "split") redirect("/setup/plan");

  // Completed sessions in the last 7 days
  const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const completedThisWeek = sessions.filter(
    (s) => s.completed_at && s.started_at >= oneWeekAgo
  ).length;

  const planDays = plan
    ? (plan.plan_data as { days: { day_name: string; muscle_focus: string; exercises: unknown[] }[] }).days
    : [];
  const weeklyTarget = planDays.length > 0 ? Math.min(planDays.length, 7) : 5;

  // Determine today's planned workout day using a simple rotation (split users only)
  const completedSessions = sessions.filter((s) => s.completed_at);
  const todayIndex = planDays.length > 0 ? completedSessions.length % planDays.length : 0;
  const todayPlan = planDays[todayIndex] ?? null;

  const lastSession = sessions[0];
  const suggestion = suggestionRes.data;

  // Check if 4 weeks have passed since plan creation — trigger suggestion check
  const planAgeWeeks = plan
    ? (Date.now() - new Date(plan.created_at).getTime()) / (1000 * 60 * 60 * 24 * 7)
    : 0;
  const shouldSuggestVariation = planAgeWeeks >= 4 && !suggestion;

  const isNoSplit = workoutStyle === "no_split";
  const isCardioOnly = workoutStyle === "cardio_only";
  const isFlexible = isNoSplit || isCardioOnly;

  return (
    <main className="mx-auto max-w-lg px-4 py-8 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Hey, {profile.name} 👋</h1>
          <p className="text-sm text-gray-400 mt-0.5">Ready to train?</p>
        </div>
        <StreakCounter sessions={sessions} />
      </div>

      {/* Weekly progress ring */}
      <Card>
        <WeeklyRing completed={completedThisWeek} target={weeklyTarget} />
      </Card>

      {/* Today's workout CTA — split vs flexible */}
      {isCardioOnly ? (
        <Card className="border-blue-500/30 bg-blue-500/5">
          <p className="text-xs font-semibold uppercase tracking-wider text-blue-400 mb-1">Today</p>
          <p className="text-lg font-bold">Cardio Session</p>
          <p className="text-sm text-gray-400 mt-0.5">Log your cardio workout below</p>
          <div className="mt-4">
            <Link
              href="/workout/cardio"
              className="block rounded-xl bg-blue-500 py-3 text-center font-semibold text-white hover:bg-blue-600 active:bg-blue-700 transition-colors"
            >
              🏃 Log Cardio
            </Link>
          </div>
        </Card>
      ) : isNoSplit ? (
        <Card className="border-orange-500/30 bg-orange-500/5">
          <p className="text-xs font-semibold uppercase tracking-wider text-orange-400 mb-1">Today</p>
          <p className="text-lg font-bold">Free Session</p>
          <p className="text-sm text-gray-400 mt-0.5">Build your own workout</p>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <Link
              href="/workout/free"
              className="block rounded-xl bg-orange-500 py-3 text-center font-semibold text-white hover:bg-orange-600 transition-colors"
            >
              Start Session
            </Link>
            <Link
              href="/workout/cardio"
              className="block rounded-xl border border-gray-600 py-3 text-center text-sm font-semibold text-gray-300 hover:border-orange-500 hover:text-orange-400 transition-colors"
            >
              🏃 Cardio
            </Link>
          </div>
        </Card>
      ) : todayPlan ? (
        <Card className="border-orange-500/30 bg-orange-500/5">
          <div className="flex items-start justify-between mb-1">
            <p className="text-xs font-semibold uppercase tracking-wider text-orange-400">Today</p>
            <Link href="/workout" className="text-xs text-gray-500 hover:text-gray-300 transition-colors">
              Change day →
            </Link>
          </div>
          <p className="text-lg font-bold">{todayPlan.day_name}</p>
          <p className="text-sm text-gray-400 mt-0.5">{todayPlan.muscle_focus}</p>
          <p className="text-sm text-gray-500 mt-0.5">{(todayPlan.exercises as unknown[]).length} exercises</p>
          <div className="mt-4 grid grid-cols-3 gap-2">
            <Link
              href={`/workout?day=${encodeURIComponent(todayPlan.day_name)}`}
              className="col-span-3 block rounded-xl bg-orange-500 py-3 text-center font-semibold text-white hover:bg-orange-600 active:bg-orange-700 transition-colors"
            >
              Start Workout
            </Link>
            <Link
              href="/workout/cardio"
              className="block rounded-xl border border-gray-600 py-2.5 text-center text-sm font-semibold text-gray-300 hover:border-orange-500 hover:text-orange-400 transition-colors"
            >
              🏃 Cardio
            </Link>
            <Link
              href="/workout/free"
              className="col-span-2 block rounded-xl border border-gray-600 py-2.5 text-center text-sm font-semibold text-gray-300 hover:border-gray-400 transition-colors"
            >
              Free Session
            </Link>
          </div>
        </Card>
      ) : null}

      {/* Last session summary */}
      {lastSession && (
        <Card>
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1">
            Last session
          </p>
          <p className="font-semibold">{lastSession.plan_day}</p>
          <p className="text-sm text-gray-400">
            {new Date(lastSession.started_at).toLocaleDateString("en-GB", {
              weekday: "long", day: "numeric", month: "short",
            })}
            {lastSession.completed_at ? " · Completed" : " · Incomplete"}
          </p>
        </Card>
      )}

      {/* Active plan overview (split users only) */}
      {planDays.length > 0 && (
        <Card>
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-3">
            Your plan
          </p>
          <div className="space-y-2">
            {planDays.map((day, i) => (
              <div key={i} className="flex items-center gap-3">
                <span className="text-xs font-mono text-gray-600 w-5">{i + 1}</span>
                <div>
                  <p className="text-sm font-semibold leading-tight">{day.day_name}</p>
                  <p className="text-xs text-gray-500">{day.muscle_focus}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* AI variation suggestion banner (shown if suggestion exists or 4 weeks up) */}
      {suggestion && <PlanSuggestionBanner suggestion={suggestion} />}

      {shouldSuggestVariation && !suggestion && (
        <SuggestVariationTrigger userId={userId} />
      )}

      {/* Nav links */}
      <div className="grid grid-cols-2 gap-3">
        <Link href="/workout/history" className="rounded-xl border border-gray-700 py-3 text-center text-sm text-gray-400 hover:border-gray-500">
          History
        </Link>
        <Link href="/analytics" className="rounded-xl border border-gray-700 py-3 text-center text-sm text-gray-400 hover:border-gray-500">
          Analytics
        </Link>
        <Link href="/settings" className="rounded-xl border border-gray-700 py-3 text-center text-sm text-gray-400 hover:border-gray-500">
          Settings
        </Link>
        <SignOutButton />
      </div>
    </main>
  );
}

// Server component that just renders a link to trigger variation suggestion
function SuggestVariationTrigger({ userId }: { userId: string }) {
  return (
    <Card className="border-purple-500/30 bg-purple-500/5">
      <p className="font-semibold text-purple-300">4 weeks complete 🎉</p>
      <p className="text-sm text-gray-400 mt-1">
        Your plan is 4 weeks old. Time for a fresh variation to keep making progress.
      </p>
      <Link
        href="/workout/suggest"
        className="mt-4 block w-full rounded-xl border border-purple-500 py-3 text-center text-sm font-semibold text-purple-300 hover:bg-purple-500/10"
      >
        Get AI Variation
      </Link>
    </Card>
  );
}
