// Today's workout page — shows the planned exercises for the selected day.
// The user taps "Start Workout" to create a session and begin logging.
import { redirect } from "next/navigation";
import Link from "next/link";
import { createServerClient } from "@/lib/supabase/server";
import type { PlanData, PlanDay } from "@/types";
import Card from "@/components/ui/Card";
import StartWorkoutButton from "@/components/workout/StartWorkoutButton";

interface Props {
  searchParams: { day?: string };
}

export default async function WorkoutPage({ searchParams }: Props) {
  const supabase = createServerClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) redirect("/login");

  const { data: plan } = await supabase
    .from("workout_plans")
    .select("id, plan_data")
    .eq("user_id", session.user.id)
    .eq("is_active", true)
    .single();

  if (!plan) redirect("/setup/plan");

  const planData = plan.plan_data as PlanData;
  const dayName = searchParams.day;
  const planDay: PlanDay | undefined = dayName
    ? planData.days.find((d) => d.day_name === dayName)
    : planData.days[0];

  if (!planDay) redirect("/dashboard");

  return (
    <main className="mx-auto max-w-lg px-4 py-8">
      <Link href="/dashboard" className="mb-6 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-300">
        ← Dashboard
      </Link>

      <div className="mb-6">
        <h1 className="text-2xl font-bold">{planDay.day_name}</h1>
        <p className="text-sm text-gray-400 mt-1">{planDay.muscle_focus}</p>
      </div>

      {/* Exercise preview list */}
      <div className="space-y-3 mb-8">
        {planDay.exercises.map((ex, i) => (
          <Card key={i} padding="sm">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-semibold">{ex.name}</p>
                <p className="text-sm text-gray-400">
                  {ex.sets} sets × {ex.rep_range} reps · {ex.rest_seconds}s rest
                </p>
                <p className="text-xs text-gray-500 mt-1 italic">{ex.coaching_note}</p>
              </div>
              <span className="shrink-0 text-xs text-gray-600 font-mono pt-0.5">#{i + 1}</span>
            </div>
          </Card>
        ))}
      </div>

      <StartWorkoutButton userId={session.user.id} planDay={planDay} />
    </main>
  );
}
