"use client";

// Workout logging card.
// Weight: tap the number to type it, or use +/- for quick adjustments.
// After each logged set, a rest timer auto-starts.
// Everything is in lbs.
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Exercise, ExerciseLog } from "@/types";
import Card from "@/components/ui/Card";
import RestTimer from "@/components/workout/RestTimer";

interface Props {
  exercise: Exercise;
  sessionId: string;
  existingLog?: ExerciseLog;
  onLogUpdated: (log: ExerciseLog) => void;
  onAddSet?: () => void;
}

// Cap rest at 90 seconds regardless of what Claude suggests
const MAX_REST = 90;

export default function ExerciseCard({ exercise, sessionId, existingLog, onLogUpdated, onAddSet }: Props) {
  const supabase = createClient();

  const [weight, setWeight] = useState(existingLog?.weight_per_set.slice(-1)[0] ?? 45);
  const [weightInput, setWeightInput] = useState(String(existingLog?.weight_per_set.slice(-1)[0] ?? 45));
  const [reps, setReps] = useState(
    existingLog?.reps_per_set.slice(-1)[0] ?? parseInt(exercise.rep_range.split("-")[0]) ?? 10
  );
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [showTimer, setShowTimer] = useState(false);
  const [restSeconds, setRestSeconds] = useState(0);

  const setsLogged = existingLog?.sets_completed ?? 0;
  const targetSets = exercise.sets;
  const done = setsLogged >= targetSets;

  const handleWeightChange = (val: string) => {
    setWeightInput(val);
    const num = parseFloat(val);
    if (!isNaN(num) && num >= 0) setWeight(num);
  };

  const handleWeightBlur = () => {
    const num = parseFloat(weightInput);
    if (isNaN(num) || num < 0) setWeightInput(String(weight));
    else { setWeight(num); setWeightInput(String(num)); }
  };

  const adjustWeight = (delta: number) => {
    const next = Math.max(0, +(weight + delta).toFixed(1));
    setWeight(next);
    setWeightInput(String(next));
  };

  const logSet = async () => {
    setSaving(true);
    setSaveError("");

    if (existingLog) {
      const { data, error } = await supabase
        .from("exercise_logs")
        .update({
          sets_completed: setsLogged + 1,
          reps_per_set: [...(existingLog.reps_per_set ?? []), reps],
          weight_per_set: [...(existingLog.weight_per_set ?? []), weight],
        })
        .eq("id", existingLog.id)
        .select()
        .single();
      if (error) setSaveError("Failed to save — check your connection.");
      else if (data) onLogUpdated(data);
    } else {
      const { data, error } = await supabase
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
      if (error) setSaveError("Failed to save — check your connection.");
      else if (data) onLogUpdated(data);
    }

    setSaving(false);

    // Start rest timer unless this was the last set
    const newSetsLogged = setsLogged + 1;
    if (newSetsLogged < targetSets) {
      const rest = Math.min(exercise.rest_seconds ?? 90, MAX_REST);
      setRestSeconds(rest);
      setShowTimer(true);
    }
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
        Target: {exercise.sets} × {exercise.rep_range} reps · {Math.min(exercise.rest_seconds, MAX_REST)}s rest
      </p>

      {/* Set history pills */}
      {existingLog && existingLog.reps_per_set.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-2">
          {existingLog.reps_per_set.map((r, i) => (
            <span key={i} className="rounded-lg bg-gray-800 px-2 py-1 text-xs text-gray-300">
              {existingLog.weight_per_set[i]} lbs × {r}
            </span>
          ))}
        </div>
      )}

      {/* Rest timer — shown between sets */}
      {showTimer && (
        <RestTimer
          seconds={restSeconds}
          onDismiss={() => setShowTimer(false)}
        />
      )}

      {!done && !showTimer && (
        <>
          {/* Weight */}
          <div className="mb-3">
            <p className="text-xs text-gray-500 mb-2">Weight (lbs)</p>
            <div className="flex items-center gap-3">
              <StepButton onClick={() => adjustWeight(-5)}>−</StepButton>
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

          {/* Reps */}
          <div className="mb-4">
            <p className="text-xs text-gray-500 mb-2">Reps</p>
            <div className="flex items-center gap-3">
              <StepButton onClick={() => setReps((r) => Math.max(1, r - 1))}>−</StepButton>
              <span className="w-20 text-center text-xl font-bold tabular-nums">{reps}</span>
              <StepButton onClick={() => setReps((r) => r + 1)}>+</StepButton>
            </div>
          </div>

          {saveError && <p className="mb-2 text-xs text-red-400 text-center">{saveError}</p>}

          <button
            onClick={logSet}
            disabled={saving}
            className="w-full rounded-xl bg-orange-500 py-3 text-sm font-semibold text-white hover:bg-orange-600 active:bg-orange-700 disabled:opacity-50 transition-colors"
          >
            {saving ? "Saving…" : `Log Set ${setsLogged + 1}`}
          </button>
        </>
      )}

      {/* Show log button again after timer is dismissed */}
      {!done && showTimer && (
        <p className="text-xs text-center text-gray-600 mt-2">Complete your rest, then dismiss to log the next set</p>
      )}

      {done && (
        <div className="text-center py-1 space-y-2">
          <p className="text-sm text-green-400 font-semibold">All sets complete ✓</p>
          {onAddSet && (
            <button
              onClick={onAddSet}
              className="text-xs text-orange-400 hover:text-orange-300 underline underline-offset-2 transition-colors"
            >
              + Add another set
            </button>
          )}
        </div>
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
