"use client";

// Workout logging card.
// Lifting exercises: weight (lbs) + reps inputs with rest timer.
// Cardio exercises (detected by name): duration (mins) + intensity picker.
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

const MAX_REST = 90;

const CARDIO_KEYWORDS = [
  "treadmill", "run", "running", "jog", "jogging", "bike", "cycling", "cycle",
  "elliptical", "rowing", "row", "stair", "stairs", "jump rope", "skipping",
  "cardio", "hiit", "swim", "swimming", "walk", "walking", "sprint",
];

const TREADMILL_KEYWORDS = ["treadmill", "run", "running", "jog", "jogging", "sprint", "walk", "walking"];

function isCardioExercise(name: string) {
  const lower = name.toLowerCase();
  return CARDIO_KEYWORDS.some((k) => lower.includes(k));
}

function isTreadmillExercise(name: string) {
  const lower = name.toLowerCase();
  return TREADMILL_KEYWORDS.some((k) => lower.includes(k));
}

const INTENSITIES = [
  { label: "Easy",     value: 1, color: "text-green-400",  border: "border-green-500",  bg: "bg-green-500/10"  },
  { label: "Moderate", value: 2, color: "text-yellow-400", border: "border-yellow-500", bg: "bg-yellow-500/10" },
  { label: "Hard",     value: 3, color: "text-red-400",    border: "border-red-500",    bg: "bg-red-500/10"    },
];

function intensityLabel(code: number) {
  return INTENSITIES.find((i) => i.value === code)?.label ?? "Moderate";
}

// ── Treadmill Interval Card ───────────────────────────────────────────────────
interface Interval {
  speedMph: number;
  incline: number;
  durationSec: number; // stored in seconds for precision
}

const DEFAULT_INTERVALS: Interval[] = [
  { speedMph: 4.0, incline: 0, durationSec: 120 }, // 2 min walk
  { speedMph: 6.5, incline: 0, durationSec: 60 },  // 1 min run
];

function formatSec(s: number) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return sec === 0 ? `${m} min` : `${m}:${String(sec).padStart(2, "0")}`;
}

function TreadmillIntervalCard({ exercise, sessionId, existingLog, onLogUpdated }: Props) {
  const supabase = createClient();

  // Decode stored intervals: reps_per_set = durations (sec), weight_per_set = speed*10+incline encoded
  const decodeIntervals = (): Interval[] => {
    if (!existingLog || existingLog.sets_completed === 0) return DEFAULT_INTERVALS;
    return existingLog.reps_per_set.map((dur, i) => {
      const encoded = existingLog.weight_per_set[i] ?? 65;
      const speedMph = Math.floor(encoded) / 10;
      const incline = encoded % 1 === 0 ? 0 : Math.round((encoded % 1) * 10);
      return { durationSec: dur, speedMph, incline };
    });
  };

  const [intervals, setIntervals] = useState<Interval[]>(decodeIntervals);
  const [rounds, setRounds] = useState(4);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const done = (existingLog?.sets_completed ?? 0) >= 1;

  const updateInterval = (i: number, field: keyof Interval, delta: number) => {
    setIntervals((prev) => prev.map((iv, idx) => {
      if (idx !== i) return iv;
      let val = iv[field] + delta;
      if (field === "speedMph") val = Math.max(0.5, Math.round(val * 10) / 10);
      if (field === "incline") val = Math.max(0, Math.min(15, val));
      if (field === "durationSec") val = Math.max(15, val);
      return { ...iv, [field]: val };
    }));
  };

  const addInterval = () => setIntervals((prev) => [...prev, { speedMph: 5.0, incline: 0, durationSec: 60 }]);
  const removeInterval = (i: number) => setIntervals((prev) => prev.filter((_, idx) => idx !== i));

  // Encode: speed stored as integer tenths (e.g. 6.5 → 65), incline added as decimal (6.5mph, 3% → 65.3)
  const encodeSpeed = (iv: Interval) => iv.speedMph * 10 + iv.incline * 0.1;

  const totalTime = intervals.reduce((s, iv) => s + iv.durationSec, 0) * rounds;

  const logIntervals = async () => {
    setSaving(true);
    setSaveError("");
    const durations = intervals.map((iv) => iv.durationSec);
    const speeds = intervals.map((iv) => encodeSpeed(iv));
    const payload = {
      sets_completed: rounds,
      reps_per_set: durations,
      weight_per_set: speeds,
    };
    if (existingLog) {
      const { data, error } = await supabase.from("exercise_logs").update(payload).eq("id", existingLog.id).select().single();
      if (error) setSaveError("Failed to save.");
      else if (data) onLogUpdated(data);
    } else {
      const { data, error } = await supabase.from("exercise_logs").insert({ session_id: sessionId, exercise_name: exercise.name, ...payload }).select().single();
      if (error) setSaveError("Failed to save.");
      else if (data) onLogUpdated(data);
    }
    setSaving(false);
  };

  return (
    <Card className={done ? "border-green-700/40 bg-green-900/10" : "border-blue-700/30"}>
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1 mr-2">
          <p className="font-bold">{exercise.name}</p>
          <p className="text-xs text-blue-400 mt-0.5">Treadmill Intervals</p>
          {exercise.coaching_note && (
            <p className="text-xs text-gray-500 italic mt-0.5">{exercise.coaching_note}</p>
          )}
        </div>
        {done && <span className="shrink-0 text-sm font-mono font-semibold text-green-400">✓</span>}
      </div>

      {done && existingLog ? (
        <div className="space-y-1">
          {existingLog.reps_per_set.map((dur, i) => {
            const encoded = existingLog.weight_per_set[i] ?? 0;
            const speed = Math.floor(encoded) / 10;
            const incline = Math.round((encoded % 1) * 10);
            return (
              <div key={i} className="flex justify-between text-xs text-green-300">
                <span>Interval {i + 1}</span>
                <span>{speed} mph{incline > 0 ? ` · ${incline}% incline` : ""} · {formatSec(dur)}</span>
              </div>
            );
          })}
          <p className="text-xs text-green-400 text-center mt-2 font-semibold">
            {existingLog.sets_completed} rounds · {formatSec(totalTime)} total ✓
          </p>
        </div>
      ) : (
        <>
          {/* Intervals */}
          <div className="space-y-3 mb-4">
            {intervals.map((iv, i) => (
              <div key={i} className="rounded-xl border border-gray-700 bg-gray-900 p-3">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-semibold text-gray-400">Interval {i + 1}</p>
                  {intervals.length > 1 && (
                    <button onClick={() => removeInterval(i)} className="text-xs text-red-400 hover:text-red-300">Remove</button>
                  )}
                </div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  {/* Speed */}
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Speed (mph)</p>
                    <div className="flex items-center gap-1">
                      <button onClick={() => updateInterval(i, "speedMph", -0.5)} className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-700 bg-gray-800 text-sm font-bold">−</button>
                      <span className="flex-1 text-sm font-bold tabular-nums">{iv.speedMph.toFixed(1)}</span>
                      <button onClick={() => updateInterval(i, "speedMph", 0.5)} className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-700 bg-gray-800 text-sm font-bold">+</button>
                    </div>
                  </div>
                  {/* Incline */}
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Incline (%)</p>
                    <div className="flex items-center gap-1">
                      <button onClick={() => updateInterval(i, "incline", -1)} className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-700 bg-gray-800 text-sm font-bold">−</button>
                      <span className="flex-1 text-sm font-bold tabular-nums">{iv.incline}%</span>
                      <button onClick={() => updateInterval(i, "incline", 1)} className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-700 bg-gray-800 text-sm font-bold">+</button>
                    </div>
                  </div>
                  {/* Duration */}
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Duration</p>
                    <div className="flex items-center gap-1">
                      <button onClick={() => updateInterval(i, "durationSec", -15)} className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-700 bg-gray-800 text-sm font-bold">−</button>
                      <span className="flex-1 text-xs font-bold tabular-nums">{formatSec(iv.durationSec)}</span>
                      <button onClick={() => updateInterval(i, "durationSec", 15)} className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-700 bg-gray-800 text-sm font-bold">+</button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <button onClick={addInterval} className="w-full mb-3 rounded-xl border border-dashed border-gray-600 py-2 text-xs text-gray-400 hover:border-blue-500 hover:text-blue-400 transition-colors">
            + Add interval
          </button>

          {/* Rounds */}
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-gray-400">Rounds</p>
            <div className="flex items-center gap-3">
              <button onClick={() => setRounds((r) => Math.max(1, r - 1))} className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-700 bg-gray-800 text-sm font-bold">−</button>
              <span className="text-lg font-bold w-6 text-center">{rounds}</span>
              <button onClick={() => setRounds((r) => r + 1)} className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-700 bg-gray-800 text-sm font-bold">+</button>
            </div>
          </div>

          <p className="text-xs text-gray-500 text-center mb-3">
            Total: {formatSec(totalTime)} · {intervals.length} intervals × {rounds} rounds
          </p>

          {saveError && <p className="mb-2 text-xs text-red-400 text-center">{saveError}</p>}

          <button onClick={logIntervals} disabled={saving} className="w-full rounded-xl bg-blue-600 py-3 text-sm font-semibold text-white hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50 transition-colors">
            {saving ? "Saving…" : "Log Intervals ✓"}
          </button>
        </>
      )}
    </Card>
  );
}

// ── Cardio Exercise Card ──────────────────────────────────────────────────────
function CardioExerciseCard({ exercise, sessionId, existingLog, onLogUpdated }: Props) {
  const supabase = createClient();
  const [duration, setDuration] = useState(
    existingLog?.reps_per_set[0] ?? 20
  );
  const [intensity, setIntensity] = useState(
    existingLog?.weight_per_set[0] ?? 2
  );
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const done = (existingLog?.sets_completed ?? 0) >= 1;

  const logCardio = async () => {
    setSaving(true);
    setSaveError("");

    if (existingLog) {
      const { data, error } = await supabase
        .from("exercise_logs")
        .update({ sets_completed: 1, reps_per_set: [duration], weight_per_set: [intensity] })
        .eq("id", existingLog.id)
        .select()
        .single();
      if (error) setSaveError("Failed to save.");
      else if (data) onLogUpdated(data);
    } else {
      const { data, error } = await supabase
        .from("exercise_logs")
        .insert({ session_id: sessionId, exercise_name: exercise.name, sets_completed: 1, reps_per_set: [duration], weight_per_set: [intensity] })
        .select()
        .single();
      if (error) setSaveError("Failed to save.");
      else if (data) onLogUpdated(data);
    }
    setSaving(false);
  };

  return (
    <Card className={done ? "border-green-700/40 bg-green-900/10" : "border-blue-700/30"}>
      {/* Header */}
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1 mr-2">
          <p className="font-bold">{exercise.name}</p>
          <p className="text-xs text-blue-400 mt-0.5">Cardio</p>
          {exercise.coaching_note && (
            <p className="text-xs text-gray-500 italic mt-0.5">{exercise.coaching_note}</p>
          )}
        </div>
        {done && (
          <span className="shrink-0 text-sm font-mono font-semibold text-green-400">✓</span>
        )}
      </div>

      {/* Already logged — show summary */}
      {done && existingLog && (
        <p className="text-sm text-green-400 font-semibold text-center py-1">
          {existingLog.reps_per_set[0]} min · {intensityLabel(existingLog.weight_per_set[0])} ✓
        </p>
      )}

      {/* Log form */}
      {!done && (
        <>
          {/* Duration stepper */}
          <div className="mb-4">
            <p className="text-xs text-gray-500 mb-2">Duration (minutes)</p>
            <div className="flex items-center gap-3">
              <StepButton onClick={() => setDuration((d) => Math.max(5, d - 5))}>−</StepButton>
              <span className="flex-1 text-center text-2xl font-bold">{duration} min</span>
              <StepButton onClick={() => setDuration((d) => d + 5)}>+</StepButton>
            </div>
          </div>

          {/* Intensity picker */}
          <div className="mb-4">
            <p className="text-xs text-gray-500 mb-2">Intensity</p>
            <div className="grid grid-cols-3 gap-2">
              {INTENSITIES.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setIntensity(opt.value)}
                  className={`rounded-xl border py-2 text-sm font-semibold transition-colors ${
                    intensity === opt.value
                      ? `${opt.border} ${opt.bg} ${opt.color}`
                      : "border-gray-700 text-gray-400 hover:border-gray-500"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {saveError && <p className="mb-2 text-xs text-red-400 text-center">{saveError}</p>}

          <button
            onClick={logCardio}
            disabled={saving}
            className="w-full rounded-xl bg-blue-600 py-3 text-sm font-semibold text-white hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50 transition-colors"
          >
            {saving ? "Saving…" : "Log Cardio ✓"}
          </button>
        </>
      )}
    </Card>
  );
}

// ── Lifting Exercise Card ─────────────────────────────────────────────────────
export default function ExerciseCard(props: Props) {
  const { exercise, sessionId, existingLog, onLogUpdated, onAddSet } = props;

  // Delegate to treadmill interval card or generic cardio card
  if (isTreadmillExercise(exercise.name)) {
    return <TreadmillIntervalCard {...props} />;
  }
  if (isCardioExercise(exercise.name)) {
    return <CardioExerciseCard {...props} />;
  }

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

      {existingLog && existingLog.reps_per_set.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-2">
          {existingLog.reps_per_set.map((r, i) => (
            <span key={i} className="rounded-lg bg-gray-800 px-2 py-1 text-xs text-gray-300">
              {existingLog.weight_per_set[i]} lbs × {r}
            </span>
          ))}
        </div>
      )}

      {showTimer && (
        <RestTimer seconds={restSeconds} onDismiss={() => setShowTimer(false)} />
      )}

      {!done && !showTimer && (
        <>
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
