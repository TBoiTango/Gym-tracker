// Edit a completed workout session — adjust reps/weights, delete individual exercises.
"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { ExerciseLog } from "@/types";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Link from "next/link";

// Exercises that shouldn't show weight/reps inputs
const CARDIO_KEYWORDS = [
  "treadmill", "run", "running", "jog", "jogging", "bike", "cycling", "cycle",
  "elliptical", "rowing", "row", "stair", "stairs", "jump rope", "skipping",
  "cardio", "hiit", "swim", "swimming", "walk", "walking", "sprint",
];

function isCardioExercise(name: string) {
  const lower = name.toLowerCase();
  return CARDIO_KEYWORDS.some((k) => lower.includes(k));
}

export default function EditSessionPage() {
  const router = useRouter();
  const params = useParams();
  const sessionId = params.sessionId as string;
  const supabase = createClient();

  const [planDay, setPlanDay] = useState("");
  const [logs, setLogs] = useState<ExerciseLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      const [sessionRes, logsRes] = await Promise.all([
        supabase.from("workout_sessions").select("plan_day").eq("id", sessionId).single(),
        supabase.from("exercise_logs").select("*").eq("session_id", sessionId),
      ]);
      setPlanDay(sessionRes.data?.plan_day ?? "");
      setLogs(logsRes.data ?? []);
      setLoading(false);
    };
    load();
  }, [sessionId]);

  // Update a specific set's weight or reps
  const updateSet = (logId: string, setIndex: number, field: "weight" | "reps", value: number) => {
    setLogs((prev) =>
      prev.map((log) => {
        if (log.id !== logId) return log;
        const updated = { ...log };
        if (field === "weight") {
          const arr = [...updated.weight_per_set];
          arr[setIndex] = value;
          updated.weight_per_set = arr;
        } else {
          const arr = [...updated.reps_per_set];
          arr[setIndex] = value;
          updated.reps_per_set = arr;
        }
        return updated;
      })
    );
  };

  // Delete a single exercise log entry
  const deleteLog = async (logId: string) => {
    setDeleting(logId);
    await supabase.from("exercise_logs").delete().eq("id", logId);
    setLogs((prev) => prev.filter((l) => l.id !== logId));
    setDeleting(null);
  };

  const saveAll = async () => {
    setSaving(true);
    await Promise.all(
      logs.map((log) =>
        supabase
          .from("exercise_logs")
          .update({
            weight_per_set: log.weight_per_set,
            reps_per_set: log.reps_per_set,
          })
          .eq("id", log.id)
      )
    );
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  if (loading) {
    return (
      <main className="mx-auto max-w-lg px-4 py-8">
        <p className="text-gray-400 animate-pulse">Loading…</p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-lg px-4 py-8">
      <Link href="/workout/history" className="mb-6 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-300">
        ← History
      </Link>

      <h1 className="text-2xl font-bold mb-1">Edit Session</h1>
      <p className="text-gray-400 text-sm mb-6">{planDay}</p>

      {logs.length === 0 && (
        <p className="text-gray-500 text-sm">No exercises logged in this session.</p>
      )}

      <div className="space-y-4 mb-8">
        {logs.map((log) => {
          const isCardio = isCardioExercise(log.exercise_name);
          return (
            <Card key={log.id}>
              {/* Header row: name + delete button */}
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="font-semibold">{log.exercise_name}</p>
                  {isCardio && (
                    <p className="text-xs text-blue-400 mt-0.5">Cardio exercise</p>
                  )}
                </div>
                <button
                  onClick={() => deleteLog(log.id)}
                  disabled={deleting === log.id}
                  className="rounded-lg border border-gray-700 px-2.5 py-1.5 text-xs text-red-400 hover:border-red-700 hover:bg-red-900/20 transition-colors disabled:opacity-40"
                >
                  {deleting === log.id ? "…" : "Delete"}
                </button>
              </div>

              {/* Cardio exercises: just show logged sets count, no weight/reps editing */}
              {isCardio ? (
                <p className="text-sm text-gray-500">
                  {log.sets_completed} set{log.sets_completed !== 1 ? "s" : ""} logged
                  {log.notes ? ` · ${log.notes}` : ""}
                </p>
              ) : (
                <div className="space-y-2">
                  {log.reps_per_set.map((reps, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <span className="text-xs text-gray-500 w-12">Set {i + 1}</span>

                      <div className="flex items-center gap-1 flex-1">
                        <input
                          type="number"
                          inputMode="decimal"
                          value={log.weight_per_set[i] ?? 0}
                          onChange={(e) => updateSet(log.id, i, "weight", parseFloat(e.target.value) || 0)}
                          className="w-20 rounded-lg border border-gray-700 bg-gray-800 px-2 py-1.5 text-center text-sm font-semibold text-white focus:border-orange-500 focus:outline-none"
                        />
                        <span className="text-xs text-gray-500">lbs</span>
                      </div>

                      <span className="text-gray-600">×</span>

                      <div className="flex items-center gap-1 flex-1">
                        <input
                          type="number"
                          inputMode="numeric"
                          value={reps}
                          onChange={(e) => updateSet(log.id, i, "reps", parseInt(e.target.value) || 0)}
                          className="w-16 rounded-lg border border-gray-700 bg-gray-800 px-2 py-1.5 text-center text-sm font-semibold text-white focus:border-orange-500 focus:outline-none"
                        />
                        <span className="text-xs text-gray-500">reps</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          );
        })}
      </div>

      {logs.some((l) => !isCardioExercise(l.exercise_name)) && (
        <>
          {saved && <p className="mb-3 text-sm text-green-400 text-center">✓ Changes saved!</p>}
          <Button onClick={saveAll} loading={saving} className="w-full">
            Save Changes
          </Button>
        </>
      )}
    </main>
  );
}
