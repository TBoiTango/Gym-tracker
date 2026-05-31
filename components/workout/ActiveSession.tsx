"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { PlanDay, ExerciseLog } from "@/types";
import ExerciseCard from "@/components/workout/ExerciseCard";
import Button from "@/components/ui/Button";

interface Props {
  sessionId: string;
  planDay: PlanDay;
  existingLogs: ExerciseLog[];
}

export default function ActiveSession({ sessionId, planDay, existingLogs }: Props) {
  const router = useRouter();
  const supabase = createClient();
  const [logs, setLogs] = useState<ExerciseLog[]>(existingLogs);
  const [finishing, setFinishing] = useState(false);

  const updateLog = (log: ExerciseLog) => {
    setLogs((prev) => {
      const idx = prev.findIndex((l) => l.id === log.id);
      if (idx === -1) return [...prev, log];
      const next = [...prev];
      next[idx] = log;
      return next;
    });
  };

  const finishWorkout = async () => {
    setFinishing(true);
    await supabase
      .from("workout_sessions")
      .update({ completed_at: new Date().toISOString() })
      .eq("id", sessionId);
    router.push(`/workout/${sessionId}/summary`);
  };

  return (
    <main className="mx-auto max-w-lg px-4 py-6">
      <div className="mb-6">
        <h1 className="text-xl font-bold">{planDay.day_name}</h1>
        <p className="text-sm text-gray-400">{planDay.muscle_focus}</p>
      </div>

      <div className="space-y-4 mb-8">
        {planDay.exercises.map((exercise, i) => {
          const log = logs.find((l) => l.exercise_name === exercise.name);
          return (
            <ExerciseCard
              key={i}
              exercise={exercise}
              sessionId={sessionId}
              existingLog={log}
              onLogUpdated={updateLog}
            />
          );
        })}
      </div>

      <Button
        onClick={finishWorkout}
        loading={finishing}
        className="w-full text-lg py-4"
      >
        Finish Workout ✅
      </Button>
    </main>
  );
}
