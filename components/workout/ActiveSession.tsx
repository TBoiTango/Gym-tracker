"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Exercise, PlanDay, ExerciseLog } from "@/types";
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

  const [exercises, setExercises] = useState<Exercise[]>(planDay.exercises);
  const [logs, setLogs] = useState<ExerciseLog[]>(existingLogs);
  const [finishing, setFinishing] = useState(false);

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
                >
                  ↑
                </button>
                <button
                  onClick={() => moveExercise(i, "down")}
                  disabled={i === exercises.length - 1}
                  className="flex h-6 w-6 items-center justify-center rounded bg-gray-800 text-gray-500 hover:text-white disabled:opacity-20 text-xs"
                  title="Move down"
                >
                  ↓
                </button>
              </div>

              <div className="pl-7">
                <ExerciseCard
                  exercise={exercise}
                  sessionId={sessionId}
                  existingLog={log}
                  onLogUpdated={updateLog}
                  onAddSet={() => addSetToExercise(i)}
                />
              </div>
            </div>
          );
        })}
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
