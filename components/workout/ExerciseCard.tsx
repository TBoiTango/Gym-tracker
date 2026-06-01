"use client";

// Workout logging card.
// Weight: tap the number to type it directly, or use +/- for quick adjustments.
// Reps: +/- buttons (easier mid-set with sweaty hands).
// Everything is in lbs.
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

  const [weight, setWeight] = useState(
    existingLog?.weight_per_set.slice(-1)[0] ?? 45
  );
  const [weightInput, setWeightInput] = useState(
    String(existingLog?.weight_per_set.slice(-1)[0] ?? 45)
  );
  const [reps, setReps] = useState(
    existingLog?.reps_per_set.slice(-1)[0] ?? parseInt(exercise.rep_range.split("-")[0]) ?? 10
  );
  const [saving, setSaving] = useState(false);

  const setsLogged = existingLog?.sets_completed ?? 0;
  const targetSets = exercise.sets;
  const done = setsLogged >= targetSets;

  // Keep weight number and text input in sync
  const handleWeightChange = (val: string) => {
    setWeightInput(val);
    const num = parseFloat(val);
    if (!isNaN(num) && num >= 0) setWeight(num);
  };

  const handleWeightBlur = () => {
    // On blur, clean up the display (e.g. "45." → "45")
    const num = parseFloat(weightInput);
    if (isNaN(num) || num < 0) {
      setWeightInput(String(weight));
    } else {
      setWeight(num);
      setWeightInput(String(num));
    }
  };

  const adjustWeight = (delta: number) => {
    const next = Math.max(0, +(weight + delta).toFixed(1));
    setWeight(next);
    setWeightInput(String(next));
  };

  const logSet = async () => {
    setSaving(true);

    if (existingLog) {
      const { data } = await supabase
        .from("exercise_logs")
        .update({
          sets_completed: setsLogged + 1,
          reps_per_set: [...(existingLog.reps_per_set ?? []), reps],
          weight_per_set: [...(existingLog.weight_per_set ?? []), weight],
        })
        .eq("id", existingLog.id)
        .select()
        .single();
      if (data) onLogUpdated(data);
    } else {
      const { data } = await supabase
        .from("exercise_logs")
        .insert({
          session_id: sessionId,
          exercise_name: exercise.name,
          sets_completed: 1,
          reps_per_set: [reps],
          weight_per_set: [weight],
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
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1 mr-2">
          <p className="font-bold">{exercise.name}</p>
          <p className="text-xs text-gray-500 italic mt-0.5">{exercise.coaching_note}</p>
        </div>
        <span className={`shrink-0 text-sm font-mono font-semibold ${done ? "text-green-400" : "text-orange-400"}`}>
          {setsLogged}/{targetSets}
        </span>
      </div>

      <p className="text-xs text-gray-500 mb-4">
        Target: {exercise.sets} × {exercise.rep_range} reps · {exercise.rest_seconds}s rest
      </p>

      {/* Set history — shown as pills */}
      {existingLog && existingLog.reps_per_set.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-2">
          {existingLog.reps_per_set.map((r, i) => (
            <span key={i} className="rounded-lg bg-gray-800 px-2 py-1 text-xs text-gray-300">
              {existingLog.weight_per_set[i]} lbs × {r}
            </span>
          ))}
        </div>
      )}

      {!done && (
        <>
          {/* Weight — tap number to type, or use +/- */}
          <div className="mb-3">
            <p className="text-xs text-gray-500 mb-2">Weight (lbs)</p>
            <div className="flex items-center gap-3">
              <StepButton onClick={() => adjustWeight(-5)}>−</StepButton>
              {/* Tappable input — opens number keyboard on mobile */}
              <input
                type="number"
                inputMode="decimal"
                value={weightInput}
                onChange={(e) => handleWeightChange(e.target.value)}
                onBlur={handleWeightBlur}
                className="w-20 rounded-xl border border-gray-600 bg-gray-800 py-2 text-center text-xl font-bold text-white focus:border-orange-500 focus:outline-none"
              />
              <StepButton onClick={() => adjustWeight(5)}>+</StepButton>
            </div>
          </div>

          {/* Reps — +/- only (easier mid-set) */}
          <div className="mb-4">
            <p className="text-xs text-gray-500 mb-2">Reps</p>
            <div className="flex items-center gap-3">
              <StepButton onClick={() => setReps((r) => Math.max(1, r - 1))}>−</StepButton>
              <span className="w-20 text-center text-xl font-bold tabular-nums">{reps}</span>
              <StepButton onClick={() => setReps((r) => r + 1)}>+</StepButton>
            </div>
          </div>

          <button
            onClick={logSet}
            disabled={saving}
            className="w-full rounded-xl bg-orange-500 py-3 text-sm font-semibold text-white hover:bg-orange-600 active:bg-orange-700 disabled:opacity-50 transition-colors"
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
