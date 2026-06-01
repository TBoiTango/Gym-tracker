"use client";

// Free-build session — user adds exercises manually, logs normally.
// Shows up in history tagged as "Free Session" — doesn't affect split tracking.
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Exercise } from "@/types";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Link from "next/link";

export default function FreeSessionPage() {
  const router = useRouter();
  const supabase = createClient();

  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState("");

  // Add exercise form
  const [name, setName] = useState("");
  const [sets, setSets] = useState(3);
  const [repRange, setRepRange] = useState("8-12");
  const [rest, setRest] = useState(60);

  const addExercise = () => {
    if (!name.trim()) return;
    setExercises((prev) => [
      ...prev,
      { name: name.trim(), sets, rep_range: repRange, rest_seconds: rest, coaching_note: "" },
    ]);
    setName("");
    setSets(3);
    setRepRange("8-12");
    setRest(60);
  };

  const removeExercise = (i: number) => {
    setExercises((prev) => prev.filter((_, idx) => idx !== i));
  };

  const startSession = async () => {
    if (exercises.length === 0) { setError("Add at least one exercise first."); return; }
    setStarting(true);
    setError("");

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { router.push("/login"); return; }

    const { data: workoutSession, error: err } = await supabase
      .from("workout_sessions")
      .insert({
        user_id: session.user.id,
        plan_day: "Free Session",
        exercises_data: exercises,
      })
      .select()
      .single();

    if (err || !workoutSession) {
      setError("Failed to start session. Try again.");
      setStarting(false);
      return;
    }

    router.push(`/workout/${workoutSession.id}`);
  };

  return (
    <main className="mx-auto max-w-lg px-4 py-8">
      <Link href="/dashboard" className="mb-6 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-300">
        ← Dashboard
      </Link>

      <div className="mb-6">
        <h1 className="text-2xl font-bold">Free Session</h1>
        <p className="text-sm text-gray-400 mt-1">Build your own workout from scratch. Won't affect your split.</p>
      </div>

      {/* Add exercise form */}
      <Card className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-4">Add Exercise</p>

        <div className="space-y-4">
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Exercise name</label>
            <input
              type="text"
              placeholder="e.g. Cable Crossover"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addExercise()}
              className="w-full rounded-xl border border-gray-600 bg-gray-800 px-4 py-3 text-white placeholder-gray-600 focus:border-orange-500 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-gray-500 mb-2 block">Sets</label>
              <div className="flex items-center gap-2">
                <StepBtn onClick={() => setSets((s) => Math.max(1, s - 1))}>−</StepBtn>
                <span className="flex-1 text-center text-lg font-bold">{sets}</span>
                <StepBtn onClick={() => setSets((s) => s + 1)}>+</StepBtn>
              </div>
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Rep range</label>
              <input
                type="text"
                value={repRange}
                onChange={(e) => setRepRange(e.target.value)}
                className="w-full rounded-xl border border-gray-600 bg-gray-800 px-3 py-2.5 text-white text-center focus:border-orange-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="text-xs text-gray-500 mb-2 block">Rest — {rest}s</label>
            <div className="flex items-center gap-2">
              <StepBtn onClick={() => setRest((r) => Math.max(15, r - 15))}>−</StepBtn>
              <div className="flex-1 h-2 bg-gray-800 rounded-full">
                <div
                  className="h-2 rounded-full bg-orange-500 transition-all"
                  style={{ width: `${((rest - 15) / (90 - 15)) * 100}%` }}
                />
              </div>
              <StepBtn onClick={() => setRest((r) => Math.min(90, r + 15))}>+</StepBtn>
            </div>
          </div>

          <button
            onClick={addExercise}
            disabled={!name.trim()}
            className="w-full rounded-xl border border-dashed border-orange-500/50 py-3 text-sm font-semibold text-orange-400 hover:bg-orange-500/10 disabled:opacity-40 transition-colors"
          >
            + Add to Session
          </button>
        </div>
      </Card>

      {/* Exercise list */}
      {exercises.length > 0 && (
        <div className="space-y-2 mb-6">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">
            Your session ({exercises.length} exercise{exercises.length !== 1 ? "s" : ""})
          </p>
          {exercises.map((ex, i) => (
            <div key={i} className="flex items-center gap-3 rounded-xl border border-gray-700 bg-gray-900 px-4 py-3">
              <div className="flex-1">
                <p className="font-semibold text-sm">{ex.name}</p>
                <p className="text-xs text-gray-500">{ex.sets} sets · {ex.rep_range} reps · {ex.rest_seconds}s rest</p>
              </div>
              <button
                onClick={() => removeExercise(i)}
                className="text-gray-600 hover:text-red-400 transition-colors text-lg"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      {exercises.length === 0 && (
        <div className="text-center py-12 text-gray-600">
          <p className="text-4xl mb-3">🏋️</p>
          <p className="text-sm">Add your first exercise above</p>
        </div>
      )}

      {error && <p className="text-sm text-red-400 mb-4">{error}</p>}

      <Button
        onClick={startSession}
        loading={starting}
        className="w-full text-lg py-4"
      >
        Start Free Session 💪
      </Button>
    </main>
  );
}

function StepBtn({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-9 w-9 items-center justify-center rounded-xl border border-gray-700 bg-gray-800 text-lg font-bold text-white hover:bg-gray-700 transition-colors"
    >
      {children}
    </button>
  );
}
