// Edit a workout session — adjust reps/weights, rename exercises, delete, or mark complete.
"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { ExerciseLog } from "@/types";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Link from "next/link";
import { isCardioExercise } from "@/lib/exercise-classifier";

export default function EditSessionPage() {
  const router = useRouter();
  const params = useParams();
  const sessionId = params.sessionId as string;
  const supabase = createClient();

  const [planDay, setPlanDay] = useState("");
  const [completedAt, setCompletedAt] = useState<string | null>(null);
  const [logs, setLogs] = useState<ExerciseLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [completing, setCompleting] = useState(false);

  // Per-exercise rename state: logId -> draft name string (undefined = not editing)
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameInput, setRenameInput] = useState("");
  const [renameSaving, setRenameSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      const [sessionRes, logsRes] = await Promise.all([
        supabase.from("workout_sessions").select("plan_day, completed_at").eq("id", sessionId).single(),
        supabase.from("exercise_logs").select("*").eq("session_id", sessionId),
      ]);
      setPlanDay(sessionRes.data?.plan_day ?? "");
      setCompletedAt(sessionRes.data?.completed_at ?? null);
      setLogs(logsRes.data ?? []);
      setLoading(false);
    };
    load();
  }, [sessionId]);

  const startRename = (log: ExerciseLog) => {
    setRenamingId(log.id);
    setRenameInput(log.exercise_name);
  };

  const cancelRename = () => {
    setRenamingId(null);
    setRenameInput("");
  };

  const saveRename = async (logId: string) => {
    const trimmed = renameInput.trim();
    const current = logs.find((l) => l.id === logId)?.exercise_name;
    if (!trimmed || trimmed === current) { cancelRename(); return; }
    setRenameSaving(true);
    await supabase.from("exercise_logs").update({ exercise_name: trimmed }).eq("id", logId);
    setLogs((prev) => prev.map((l) => l.id === logId ? { ...l, exercise_name: trimmed } : l));
    setRenameSaving(false);
    setRenamingId(null);
  };

  const markComplete = async () => {
    setCompleting(true);
    const now = new Date().toISOString();
    await supabase.from("workout_sessions").update({ completed_at: now }).eq("id", sessionId);
    setCompletedAt(now);
    setCompleting(false);
  };

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
      <div className="flex items-center gap-3 mb-6">
        <p className="text-gray-400 text-sm">{planDay}</p>
        <span className={`text-xs font-semibold ${completedAt ? "text-green-400" : "text-yellow-400"}`}>
          {completedAt
            ? `✓ Completed ${new Date(completedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`
            : "Incomplete"}
        </span>
        {!completedAt && (
          <button
            onClick={markComplete}
            disabled={completing}
            className="rounded-lg border border-green-700 px-3 py-1 text-xs text-green-400 hover:bg-green-900/20 transition-colors disabled:opacity-50"
          >
            {completing ? "Saving…" : "Mark as Complete"}
          </button>
        )}
      </div>

      {logs.length === 0 && (
        <p className="text-gray-500 text-sm">No exercises logged in this session.</p>
      )}

      <div className="space-y-4 mb-8">
        {logs.map((log) => {
          const isCardio = isCardioExercise(log.exercise_name);
          const isRenaming = renamingId === log.id;

          return (
            <Card key={log.id}>
              {/* Header row: name (editable) + delete button */}
              <div className="flex items-start justify-between mb-3 gap-3">
                <div className="flex-1 min-w-0">
                  {isRenaming ? (
                    <div className="flex items-center gap-2">
                      <input
                        autoFocus
                        value={renameInput}
                        onChange={(e) => setRenameInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") saveRename(log.id);
                          if (e.key === "Escape") cancelRename();
                        }}
                        className="flex-1 rounded-lg border border-orange-500 bg-gray-800 px-2.5 py-1.5 text-sm font-semibold text-white focus:outline-none"
                      />
                      <button
                        onClick={() => saveRename(log.id)}
                        disabled={renameSaving}
                        className="text-xs text-orange-400 hover:text-orange-300 font-semibold shrink-0"
                      >
                        {renameSaving ? "…" : "Save"}
                      </button>
                      <button
                        onClick={cancelRename}
                        className="text-xs text-gray-500 hover:text-gray-300 shrink-0"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold">{log.exercise_name}</p>
                      <button
                        onClick={() => startRename(log)}
                        className="rounded border border-gray-700 px-2 py-0.5 text-xs text-gray-400 hover:border-orange-500 hover:text-orange-400 transition-colors"
                      >
                        ✎ Rename
                      </button>
                    </div>
                  )}
                  {isCardio && !isRenaming && (
                    <p className="text-xs text-blue-400 mt-0.5">Cardio exercise</p>
                  )}
                </div>
                <button
                  onClick={() => deleteLog(log.id)}
                  disabled={deleting === log.id}
                  className="rounded-lg border border-gray-700 px-2.5 py-1.5 text-xs text-red-400 hover:border-red-700 hover:bg-red-900/20 transition-colors disabled:opacity-40 shrink-0"
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
