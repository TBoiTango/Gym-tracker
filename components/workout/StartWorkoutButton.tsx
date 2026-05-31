"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { PlanDay } from "@/types";
import Button from "@/components/ui/Button";

export default function StartWorkoutButton({
  userId,
  planDay,
}: {
  userId: string;
  planDay: PlanDay;
}) {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(false);

  const handleStart = async () => {
    setLoading(true);

    const { data: session, error } = await supabase
      .from("workout_sessions")
      .insert({
        user_id: userId,
        plan_day: planDay.day_name,
      })
      .select()
      .single();

    if (error || !session) {
      console.error(error);
      setLoading(false);
      return;
    }

    router.push(`/workout/${session.id}`);
  };

  return (
    <Button onClick={handleStart} loading={loading} className="w-full text-lg py-4">
      Start Workout 💪
    </Button>
  );
}
