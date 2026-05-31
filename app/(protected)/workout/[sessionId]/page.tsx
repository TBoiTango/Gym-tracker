// Active workout session — the main logging UI.
// Each exercise has +/- buttons for weight and reps, and a "Log Set" button.
import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";
import type { PlanData, PlanDay } from "@/types";
import ActiveSession from "@/components/workout/ActiveSession";

interface Props {
  params: { sessionId: string };
}

export default async function ActiveSessionPage({ params }: Props) {
  const supabase = createServerClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) redirect("/login");

  // Load the workout session
  const { data: workoutSession } = await supabase
    .from("workout_sessions")
    .select("id, plan_day, completed_at, user_id")
    .eq("id", params.sessionId)
    .single();

  if (!workoutSession || workoutSession.user_id !== session.user.id) {
    redirect("/dashboard");
  }

  if (workoutSession.completed_at) {
    redirect(`/workout/${params.sessionId}/summary`);
  }

  // Load the active plan to get exercise details
  const { data: plan } = await supabase
    .from("workout_plans")
    .select("plan_data")
    .eq("user_id", session.user.id)
    .eq("is_active", true)
    .single();

  if (!plan) redirect("/dashboard");

  const planData = plan.plan_data as PlanData;
  const planDay: PlanDay | undefined = planData.days.find(
    (d) => d.day_name === workoutSession.plan_day
  );

  if (!planDay) redirect("/dashboard");

  // Load any logs already recorded in this session
  const { data: existingLogs } = await supabase
    .from("exercise_logs")
    .select("*")
    .eq("session_id", params.sessionId);

  return (
    <ActiveSession
      sessionId={params.sessionId}
      planDay={planDay}
      existingLogs={existingLogs ?? []}
    />
  );
}
