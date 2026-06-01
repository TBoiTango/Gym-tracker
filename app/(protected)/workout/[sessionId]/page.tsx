// Active workout session — loads exercises from the session row (generated on the fly).
import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";
import type { Exercise, PlanDay } from "@/types";
import ActiveSession from "@/components/workout/ActiveSession";

interface Props {
  params: { sessionId: string };
}

export default async function ActiveSessionPage({ params }: Props) {
  const supabase = createServerClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) redirect("/login");

  const { data: workoutSession } = await supabase
    .from("workout_sessions")
    .select("id, plan_day, completed_at, user_id, exercises_data")
    .eq("id", params.sessionId)
    .single();

  if (!workoutSession || workoutSession.user_id !== session.user.id) {
    redirect("/dashboard");
  }

  if (workoutSession.completed_at) {
    redirect(`/workout/${params.sessionId}/summary`);
  }

  // exercises_data is stored directly on the session row (set when workout was generated)
  const exercises: Exercise[] = (workoutSession.exercises_data as Exercise[]) ?? [];

  const planDay: PlanDay = {
    day_name: workoutSession.plan_day,
    muscle_focus: "",
    exercises,
  };

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
