"use client";

// The main logging card. Large +/- buttons so you can operate it with sweaty hands at the gym.
// Each set is logged individually. The card shows how many sets you've done vs target.
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Exercise, ExerciseLog } from "@/types";
import Card from "@/components/ui/Card";

interface Props {
  exercise: Exercise;
  sessionId: string;
  existingLog?: ExerciseLog;
  onLogUpdated: (log: ExerciseLog) => void;
}

export default function ExerciseCard({ exercise, sessionId, existingLog, onLogUpdated }: Props) {
  const supabase = createClient();

  // Current values the user is about to log for the next set
  const [weight, setWeight] = useState(
    existingLog?.weight_per_set.slice(-1)[0] ?? 20
  );
  const [reps, setReps] = useState(
    existingLog?.reps_per_set.slice(-1)[0] ?? parseInt(exercise.rep_range.split("-")[0]) ?? 10
  );
  const [notes, setNotes] = useState(existingLog?.notes ?? "");
  const [saving, setSaving] = useState(false);

  const setsLogged = existingLog?.sets_completed ?? 0;
  const targetSets = exercise.sets;
  const done = setsLogged >= targetSets;

  const logSet = async () => {
    setSaving(true);

    if (existingLog) {
      // Append set data to existing log row
      const { data, error } = await supabase
        .from("exercise_logs")
        .update({
          sets_completed: setsLogged + 1,
          reps_per_set: [...(existingLog.reps_per_set ?? []), reps],
          weight_per_set: [...(existingLog.weight_per_set ?? []), weight],
          notes: notes || existingLog.notes,
        })
        .eq("id", existingLog.id)
        .select()
        .single();

      if (data) onLogUpdated(data);
    } else {
      // Create a new log row for this exercise
      const { data, error } = await supabase
        .from("exercise_logs")
        .insert({
          session_id: sessionId,
          exercise_name: exercise.name,
          sets_completed: 1,
          reps_per_set: [reps],
          weight_per_set: [weight],
          notes: notes || null,
        })
        .select()
        .single();

      if (data) onLogUpdated(data);
    }

    setSaving(false);
  };

  return (
    <Card className={done ? "border-green-700/40 bg-green-900/10" : ""}>
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="font-bold">{exercise.name}</p>
          <p className="text-xs text-gray-500 italic mt-0.5">{exercise.coaching_note}</p>
        </div>
        <span className={`text-sm font-mono font-semibold ${done ? "text-green-400" : "text-orange-400"}`}>
          {setsLogged}/{targetSets}
        </span>
      </div>

      {/* Target */}
      <p className="text-xs text-gray-500 mb-4">
        Target: {exercise.sets} × {exercise.rep_range} reps · {exercise.rest_seconds}s rest
      </p>

      {/* Set history */}
      {existingLog && existingLog.reps_per_set.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-2">
          {existingLog.reps_per_set.map((r, i) => (
            <span key={i} className="rounded-lg bg-gray-800 px-2 py-1 text-xs text-gray-300">
              {existingLog.weight_per_set[i]}kg × {r}
            </span>
          ))}
        </div>
      )}

      {!done && (
        <>
          {/* Weight stepper */}
          <div className="mb-3">
            <p className="text-xs text-gray-500 mb-1">Weight (kg)</p>
            <div className="flex items-center gap-3">
              <StepButton onClick={() => setWeight((w) => Math.max(0, +(w - 2.5).toFixed(1)))}>−</StepButton>
              <span className="w-16 text-center text-xl font-bold tabular-nums">{weight}</span>
              <StepButton onClick={() => setWeight((w) => +(w + 2.5).toFixed(1))}>+</StepButton>
            </div>
          </div>

          {/* Reps stepper */}
          <div className="mb-4">
            <p className="text-xs text-gray-500 mb-1">Reps</p>
            <div className="flex items-center gap-3">
              <StepButton onClick={() => setReps((r) => Math.max(1, r - 1))}>−</StepButton>
              <span className="w-16 text-center text-xl font-bold tabular-nums">{reps}</span>
              <StepButton onClick={() => setReps((r) => r + 1)}>+</StepButton>
            </div>
          </div>

          {/* Log set button */}
          <button
            onClick={logSet}
            disabled={saving}
            className="w-full rounded-xl bg-gray-800 py-3 text-sm font-semibold text-white hover:bg-gray-700 active:bg-gray-600 disabled:opacity-50 transition-colors"
          >
            {saving ? "Saving…" : `Log Set ${setsLogged + 1}`}
          </button>
        </>
      )}

      {done && (
        <p className="text-center text-sm text-green-400 font-semibold py-1">
          All sets complete ✓
        </p>
      )}
    </Card>
  );
}

// Large button for the +/- steppers — easy to tap in the gym
function StepButton({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-12 w-12 items-center justify-center rounded-xl border border-gray-700 bg-gray-800 text-xl font-bold text-white hover:bg-gray-700 active:bg-gray-600 transition-colors"
    >
      {children}
    </button>
  );
}
