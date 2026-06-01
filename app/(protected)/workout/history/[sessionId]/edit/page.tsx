// Edit a completed workout session — adjust reps/weights for any exercise.
"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { ExerciseLog } from "@/types";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Link from "next/link";

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

  // Update a specific set's weight or reps within a log
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

  const saveAll = async () => {
    setSaving(true);
    // Update each log row
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

      <div className="space-y-4 mb-8">
        {logs.map((log) => (
          <Card key={log.id}>
            <p className="font-semibold mb-3">{log.exercise_name}</p>
            <div className="space-y-2">
              {log.reps_per_set.map((reps, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="text-xs text-gray-500 w-12">Set {i + 1}</span>

                  {/* Weight input */}
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

                  {/* Reps input */}
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
          </Card>
        ))}
      </div>

      {saved && <p className="mb-3 text-sm text-green-400 text-center">✓ Changes saved!</p>}

      <Button onClick={saveAll} loading={saving} className="w-full">
        Save Changes
      </Button>
    </main>
  );
}
