"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Exercise, PlanDay, ExerciseLog } from "@/types";
import ExerciseCard from "@/components/workout/ExerciseCard";
import Button from "@/components/ui/Button";

interface WarmupExercise {
  name: string;
  duration: string;
  note: string;
}

interface Props {
  sessionId: string;
  planDay: PlanDay;
  existingLogs: ExerciseLog[];
}

export default function ActiveSession({ sessionId, planDay, existingLogs }: Props) {
  const router = useRouter();
  const supabase = createClient();

  const [exercises, setExercises] = useState<Exercise[]>(planDay.exercises);
  const [logs, setLogs] = useState<ExerciseLog[]>(existingLogs);
  const [finishing, setFinishing] = useState(false);

  // Warmup
  const [warmup, setWarmup] = useState<WarmupExercise[] | null>(null);
  const [warmupLoading, setWarmupLoading] = useState(false);
  const [showWarmup, setShowWarmup] = useState(planDay.day_name !== "Free Session" && existingLogs.length === 0);

  useEffect(() => {
    if (!showWarmup || planDay.day_name === "Free Session") return;
    setWarmupLoading(true);
    fetch("/api/generate-warmup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ muscle_focus: planDay.muscle_focus, day_name: planDay.day_name }),
    })
      .then((r) => r.json())
      .then((d) => setWarmup(d.exercises ?? null))
      .catch(() => setWarmup(null))
      .finally(() => setWarmupLoading(false));
  }, []);

  // Swap exercise state
  const [swappingIndex, setSwappingIndex] = useState<number | null>(null);
  const [quickAddLoading, setQuickAddLoading] = useState<string | null>(null); // muscle label being loaded
  const [quickAddedNames, setQuickAddedNames] = useState<Set<string>>(new Set());
  // Track all exercise names seen per slot (original + every swap) so we never repeat
  const [seenExercises, setSeenExercises] = useState<Map<number, string[]>>(
    () => new Map(planDay.exercises.map((ex, i) => [i, [ex.name]]))
  );

  const swapExercise = async (index: number) => {
    setSwappingIndex(index);
    try {
      // Fetch user equipment for context
      const { data: { session: authSession } } = await supabase.auth.getSession();
      let equipment: string[] = [];
      if (authSession) {
        const { data: userGym } = await supabase
          .from("user_gyms")
          .select("equipment_list")
          .eq("user_id", authSession.user.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        equipment = (userGym?.equipment_list as string[]) ?? [];
      }

      // Build exclusion list:
      // 1. Everything ever tried in this slot (prevents cycling back)
      // 2. Everything currently in OTHER slots (prevents duplicating an existing exercise)
      // 3. Everything already logged this session (prevents swapping to a completed exercise)
      const slotHistory = seenExercises.get(index) ?? [exercises[index].name];
      const otherSlotExercises = exercises.filter((_, i) => i !== index).map((e) => e.name);
      const loggedExercises = logs.map((l) => l.exercise_name);
      const excludeExercises = [...new Set([...slotHistory, ...otherSlotExercises, ...loggedExercises])];

      const res = await fetch("/api/swap-exercise", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          exerciseName: exercises[index].name,
          muscleFocus: planDay.muscle_focus || planDay.day_name,
          equipment,
          excludeExercises,
        }),
      });
      if (!res.ok) return;
      const newExercise = await res.json();
      // Record this new exercise name so it can't be suggested again for this slot
      setSeenExercises((prev) => {
        const next = new Map(prev);
        const existing = next.get(index) ?? [];
        next.set(index, [...existing, newExercise.name]);
        return next;
      });
      setExercises((prev) => prev.map((ex, i) => i === index ? newExercise : ex));
    } finally {
      setSwappingIndex(null);
    }
  };

  const quickAddGroups = (() => {
    const focus = (planDay.muscle_focus || planDay.day_name).toLowerCase();
    if (focus.includes("push") || focus.includes("chest"))
      return [
        { label: "Chest", muscle: "chest" },
        { label: "Triceps", muscle: "triceps" },
        { label: "Shoulders", muscle: "shoulders" },
      ];
    if (focus.includes("pull") || focus.includes("back"))
      return [
        { label: "Back", muscle: "back" },
        { label: "Biceps", muscle: "biceps" },
      ];
    if (focus.includes("leg") || focus.includes("lower"))
      return [
        { label: "Quads", muscle: "quads" },
        { label: "Hamstrings", muscle: "hamstrings" },
        { label: "Glutes", muscle: "glutes" },
        { label: "Calves", muscle: "calves" },
      ];
    if (focus.includes("upper"))
      return [
        { label: "Chest", muscle: "chest" },
        { label: "Back", muscle: "back" },
        { label: "Shoulders", muscle: "shoulders" },
        { label: "Arms", muscle: "biceps" },
      ];
    return [
      { label: "Core", muscle: "abs and core" },
      { label: "Chest", muscle: "chest" },
      { label: "Back", muscle: "back" },
      { label: "Legs", muscle: "legs" },
    ];
  })();

  const quickAdd = async (muscle: string, label: string) => {
    setQuickAddLoading(label);
    try {
      const { data: { session: authSession } } = await supabase.auth.getSession();
      let equipment: string[] = [];
      if (authSession) {
        const { data: userGym } = await supabase
          .from("user_gyms")
          .select("equipment_list")
          .eq("user_id", authSession.user.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        equipment = (userGym?.equipment_list as string[]) ?? [];
      }
      // Exclude all exercises already in the session so we don't double up
      const excludeExercises = exercises.map((e) => e.name);
      const res = await fetch("/api/swap-exercise", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          exerciseName: "",
          muscleFocus: muscle,
          equipment,
          excludeExercises,
        }),
      });
      if (!res.ok) return;
      const newExercise = await res.json();

      // Save to user's exercise pool for this day type so it gets rotated in future sessions
      if (authSession) {
        await supabase.from("user_exercise_pool").upsert({
          user_id: authSession.user.id,
          day_type: planDay.day_name,
          exercise_name: newExercise.name,
          sets: newExercise.sets ?? 3,
          rep_range: newExercise.rep_range ?? "8-12",
          rest_seconds: newExercise.rest_seconds ?? 60,
          coaching_note: newExercise.coaching_note ?? "",
        }, { onConflict: "user_id,day_type,exercise_name" });
      }

      // Track this name so the log entry gets marked user_added: true
      setQuickAddedNames((prev) => new Set(prev).add(newExercise.name));
      setExercises((prev) => [...prev, newExercise]);
    } finally {
      setQuickAddLoading(null);
    }
  };

  // Skip exercise state
  const [skipIndex, setSkipIndex] = useState<number | null>(null);
  const SKIP_REASONS = ["Feeling sore", "No equipment", "Short on time", "Other"];

  const confirmSkip = (reason: string) => {
    if (skipIndex === null) return;
    const removedAt = skipIndex;
    setExercises((prev) => prev.filter((_, i) => i !== removedAt));
    // Shift seenExercises indices down to match the new exercise array positions
    setSeenExercises((prev) => {
      const next = new Map<number, string[]>();
      prev.forEach((val, key) => {
        if (key < removedAt) next.set(key, val);
        else if (key > removedAt) next.set(key - 1, val);
        // key === removedAt: dropped
      });
      return next;
    });
    setSkipIndex(null);
  };

  // Add exercise modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [newName, setNewName] = useState("");
  const [newSets, setNewSets] = useState(3);
  const [newRepRange, setNewRepRange] = useState("8-12");
  const [newRest, setNewRest] = useState(60);
  const [addPosition, setAddPosition] = useState<"next" | "end">("end");

  const updateLog = (log: ExerciseLog) => {
    setLogs((prev) => {
      const idx = prev.findIndex((l) => l.id === log.id);
      if (idx === -1) return [...prev, log];
      const next = [...prev];
      next[idx] = log;
      return next;
    });
    // If this exercise was quick-added this session, flag the log row in DB
    if (log.exercise_name && quickAddedNames.has(log.exercise_name)) {
      supabase
        .from("exercise_logs")
        .update({ user_added: true })
        .eq("id", log.id)
        .then(() => {});
    }
  };

  // Add one more set to an exercise
  const addSetToExercise = (index: number) => {
    setExercises((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], sets: next[index].sets + 1 };
      return next;
    });
  };

  // Move an exercise up or down in the list
  const moveExercise = (index: number, direction: "up" | "down") => {
    setExercises((prev) => {
      const next = [...prev];
      const swapWith = direction === "up" ? index - 1 : index + 1;
      if (swapWith < 0 || swapWith >= next.length) return prev;
      [next[index], next[swapWith]] = [next[swapWith], next[index]];
      return next;
    });
  };

  // Find the first incomplete exercise index (for "insert next" position)
  const firstIncompleteIndex = () => {
    for (let i = 0; i < exercises.length; i++) {
      const log = logs.find((l) => l.exercise_name === exercises[i].name);
      const done = (log?.sets_completed ?? 0) >= exercises[i].sets;
      if (!done) return i;
    }
    return exercises.length; // all done, append at end
  };

  const confirmAddExercise = () => {
    if (!newName.trim()) return;
    const ex: Exercise = {
      name: newName.trim(),
      sets: newSets,
      rep_range: newRepRange,
      rest_seconds: newRest,
      coaching_note: "",
    };
    setExercises((prev) => {
      const next = [...prev];
      if (addPosition === "next") {
        const insertAt = firstIncompleteIndex();
        next.splice(insertAt, 0, ex);
      } else {
        next.push(ex);
      }
      return next;
    });
    // Reset form
    setNewName("");
    setNewSets(3);
    setNewRepRange("8-12");
    setNewRest(60);
    setAddPosition("end");
    setShowAddModal(false);
  };

  const finishWorkout = async () => {
    if (finishing) return;
    setFinishing(true);
    await supabase
      .from("workout_sessions")
      .update({ completed_at: new Date().toISOString() })
      .eq("id", sessionId);
    router.push(`/workout/${sessionId}/summary`);
  };

  // Warmup screen
  if (showWarmup) {
    return (
      <main className="mx-auto max-w-lg px-4 py-6">
        <div className="mb-6">
          <h1 className="text-xl font-bold">Warmup 🔥</h1>
          <p className="text-sm text-gray-400">{planDay.day_name} · ~5 minutes</p>
        </div>

        {warmupLoading && (
          <div className="space-y-3">
            {[1,2,3,4,5].map((i) => (
              <div key={i} className="h-20 rounded-xl bg-gray-800 animate-pulse" />
            ))}
          </div>
        )}

        {!warmupLoading && warmup && (
          <div className="space-y-3 mb-8">
            {warmup.map((ex, i) => (
              <div key={i} className="rounded-xl border border-gray-700 bg-gray-900 p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold">{ex.name}</p>
                    <p className="text-sm text-orange-400 mt-0.5">{ex.duration}</p>
                    <p className="text-xs text-gray-500 mt-1 italic">{ex.note}</p>
                  </div>
                  <span className="shrink-0 text-xs text-gray-600 font-mono">{i + 1}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {!warmupLoading && !warmup && (
          <p className="text-sm text-gray-500 mb-8">Could not load warmup. You can skip it and go straight to the workout.</p>
        )}

        <div className="space-y-3">
          <Button onClick={() => setShowWarmup(false)} className="w-full text-lg py-4">
            Start Workout 💪
          </Button>
          <button
            onClick={() => setShowWarmup(false)}
            className="w-full text-sm text-gray-500 hover:text-gray-300 py-2 transition-colors"
          >
            Skip warmup
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-lg px-4 py-6">
      <div className="mb-6">
        <h1 className="text-xl font-bold">{planDay.day_name}</h1>
        <p className="text-sm text-gray-400">{planDay.muscle_focus}</p>
      </div>

      <div className="space-y-4 mb-6">
        {exercises.map((exercise, i) => {
          const log = logs.find((l) => l.exercise_name === exercise.name);
          return (
            <div key={`${exercise.name}-${i}`} className="relative">
              {/* Reorder buttons */}
              <div className="absolute -left-1 top-1/2 -translate-y-1/2 flex flex-col gap-0.5 z-10">
                <button
                  onClick={() => moveExercise(i, "up")}
                  disabled={i === 0}
                  className="flex h-6 w-6 items-center justify-center rounded bg-gray-800 text-gray-500 hover:text-white disabled:opacity-20 text-xs"
                  title="Move up"
                >↑</button>
                <button
                  onClick={() => moveExercise(i, "down")}
                  disabled={i === exercises.length - 1}
                  className="flex h-6 w-6 items-center justify-center rounded bg-gray-800 text-gray-500 hover:text-white disabled:opacity-20 text-xs"
                  title="Move down"
                >↓</button>
              </div>

              {/* Skip button – top right only */}
              <div className="absolute -right-1 -top-1 z-10">
                <button
                  onClick={() => setSkipIndex(i)}
                  className="flex h-6 w-6 items-center justify-center rounded-full bg-gray-800 text-gray-500 hover:bg-red-900/60 hover:text-red-400 transition-colors text-xs"
                  title="Skip exercise"
                >✕</button>
              </div>

              <div className="pl-7">
                <ExerciseCard
                  exercise={exercise}
                  sessionId={sessionId}
                  existingLog={log}
                  onLogUpdated={updateLog}
                  onAddSet={() => addSetToExercise(i)}
                />
                {/* Change exercise – below the card, no overlap */}
                <button
                  onClick={() => swapExercise(i)}
                  disabled={swappingIndex === i}
                  className="mt-1 w-full text-xs text-gray-600 hover:text-orange-400 transition-colors py-1 disabled:opacity-50"
                >
                  {swappingIndex === i ? "Finding alternative…" : "↻ Change exercise"}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Quick Add by muscle group */}
      <div className="mb-4">
        <p className="text-xs text-gray-500 mb-2">Quick Add</p>
        <div className="flex flex-wrap gap-2">
          {quickAddGroups.map(({ label, muscle }) => (
            <button
              key={label}
              onClick={() => quickAdd(muscle, label)}
              disabled={quickAddLoading !== null}
              className="rounded-full border border-gray-700 bg-gray-800 px-3 py-1.5 text-xs font-semibold text-gray-300 hover:border-orange-500 hover:text-orange-400 disabled:opacity-50 transition-colors"
            >
              {quickAddLoading === label ? "Adding…" : `+ ${label}`}
            </button>
          ))}
        </div>
      </div>

      {/* Add Exercise button */}
      <button
        onClick={() => setShowAddModal(true)}
        className="w-full mb-4 rounded-xl border border-dashed border-gray-600 py-3 text-sm text-gray-400 hover:border-orange-500 hover:text-orange-400 transition-colors"
      >
        + Add Exercise
      </button>

      <Button onClick={finishWorkout} loading={finishing} className="w-full text-lg py-4">
        Finish Workout ✅
      </Button>

      {/* Skip Exercise Modal */}
      {skipIndex !== null && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60" onClick={() => setSkipIndex(null)}>
          <div
            className="w-full max-w-lg rounded-t-2xl bg-gray-900 border border-gray-700 p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold">Skip Exercise</h2>
                <p className="text-sm text-gray-400 mt-0.5">{exercises[skipIndex]?.name}</p>
              </div>
              <button onClick={() => setSkipIndex(null)} className="text-gray-500 hover:text-white text-xl">✕</button>
            </div>
            <p className="text-sm text-gray-400">Why are you skipping this one?</p>
            <div className="space-y-2">
              {SKIP_REASONS.map((reason) => (
                <button
                  key={reason}
                  onClick={() => confirmSkip(reason)}
                  className="w-full rounded-xl border border-gray-700 bg-gray-800 px-4 py-3 text-left text-sm text-gray-300 hover:border-orange-500 hover:text-white transition-colors"
                >
                  {reason}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Add Exercise Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60" onClick={() => setShowAddModal(false)}>
          <div
            className="w-full max-w-lg rounded-t-2xl bg-gray-900 border border-gray-700 p-6 space-y-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold">Add Exercise</h2>
              <button onClick={() => setShowAddModal(false)} className="text-gray-500 hover:text-white text-xl">✕</button>
            </div>

            {/* Exercise name */}
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Exercise name</label>
              <input
                type="text"
                placeholder="e.g. Low Cable Crossover"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="w-full rounded-xl border border-gray-600 bg-gray-800 px-4 py-3 text-white placeholder-gray-600 focus:border-orange-500 focus:outline-none"
                autoFocus
              />
            </div>

            {/* Sets */}
            <div>
              <label className="text-xs text-gray-500 mb-2 block">Sets</label>
              <div className="flex items-center gap-4">
                <StepBtn onClick={() => setNewSets((s) => Math.max(1, s - 1))}>−</StepBtn>
                <span className="w-12 text-center text-xl font-bold">{newSets}</span>
                <StepBtn onClick={() => setNewSets((s) => s + 1)}>+</StepBtn>
              </div>
            </div>

            {/* Rep range */}
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Rep range</label>
              <input
                type="text"
                placeholder="e.g. 10-12"
                value={newRepRange}
                onChange={(e) => setNewRepRange(e.target.value)}
                className="w-full rounded-xl border border-gray-600 bg-gray-800 px-4 py-3 text-white placeholder-gray-600 focus:border-orange-500 focus:outline-none"
              />
            </div>

            {/* Rest */}
            <div>
              <label className="text-xs text-gray-500 mb-2 block">Rest (seconds)</label>
              <div className="flex items-center gap-4">
                <StepBtn onClick={() => setNewRest((r) => Math.max(15, r - 15))}>−</StepBtn>
                <span className="w-12 text-center text-xl font-bold">{newRest}s</span>
                <StepBtn onClick={() => setNewRest((r) => Math.min(90, r + 15))}>+</StepBtn>
              </div>
            </div>

            {/* Position */}
            <div>
              <label className="text-xs text-gray-500 mb-2 block">Where to add it?</label>
              <div className="grid grid-cols-2 gap-2">
                {([{ val: "next", label: "Up Next", note: "After current exercise" }, { val: "end", label: "At the End", note: "After all exercises" }] as const).map((opt) => (
                  <button
                    key={opt.val}
                    onClick={() => setAddPosition(opt.val)}
                    className={`rounded-xl border p-3 text-left transition-colors ${
                      addPosition === opt.val
                        ? "border-orange-500 bg-orange-500/10 text-white"
                        : "border-gray-700 bg-gray-800 text-gray-400"
                    }`}
                  >
                    <p className="font-semibold text-sm">{opt.label}</p>
                    <p className="text-xs opacity-60 mt-0.5">{opt.note}</p>
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={confirmAddExercise}
              disabled={!newName.trim()}
              className="w-full rounded-xl bg-orange-500 py-3 font-semibold text-white hover:bg-orange-600 disabled:opacity-40 transition-colors"
            >
              Add to Workout
            </button>
          </div>
        </div>
      )}
    </main>
  );
}

function StepBtn({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-10 w-10 items-center justify-center rounded-xl border border-gray-700 bg-gray-800 text-xl font-bold text-white hover:bg-gray-700 transition-colors"
    >
      {children}
    </button>
  );
}
