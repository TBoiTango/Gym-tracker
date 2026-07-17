"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import Card from "@/components/ui/Card";

interface Session {
  id: string;
  plan_day: string;
  started_at: string;
  completed_at?: string | null;
  session_type?: string | null;
}

export default function HistoryList({ sessions: initial }: { sessions: Session[] }) {
  const router = useRouter();
  const supabase = createClient();
  const [sessions, setSessions] = useState(initial);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [dateFilter, setDateFilter] = useState("");

  const deleteSession = async (id: string) => {
    setDeleting(id);
    // Delete exercise logs first (foreign key), then session
    await supabase.from("exercise_logs").delete().eq("session_id", id);
    await supabase.from("workout_sessions").delete().eq("id", id);
    setSessions((prev) => prev.filter((s) => s.id !== id));
    setConfirmDelete(null);
    setDeleting(null);
  };

  const filtered = dateFilter
    ? sessions.filter((s) => {
        // Compare just the date portion in local time
        const d = new Date(s.started_at);
        const local = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
        return local === dateFilter;
      })
    : sessions;

  return (
    <div>
      {/* Date picker */}
      <div className="flex items-center gap-2 mb-4">
        <input
          type="date"
          value={dateFilter}
          onChange={(e) => setDateFilter(e.target.value)}
          className="rounded-xl border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white focus:border-orange-500 focus:outline-none [color-scheme:dark]"
        />
        {dateFilter && (
          <button
            onClick={() => setDateFilter("")}
            className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
          >
            Clear
          </button>
        )}
      </div>

      {filtered.length === 0 && (
        <p className="text-gray-500 text-sm">
          {dateFilter ? "No sessions found for that date." : "No sessions yet. Start your first workout!"}
        </p>
      )}

    <div className="space-y-3">
      {filtered.map((s) => (
        <Card key={s.id} padding="sm">
          <div className="flex items-start justify-between gap-3">
            {/* Session info */}
            <div className="flex-1 min-w-0">
              <p className="font-semibold truncate">{s.plan_day}</p>
              <p className="text-xs text-gray-500 mt-0.5">
                {new Date(s.started_at).toLocaleDateString("en-US", {
                  weekday: "short", day: "numeric", month: "short", year: "numeric",
                })}
              </p>
              <div className="flex items-center gap-2 mt-0.5">
                <span className={`text-xs font-semibold ${s.session_type === "cancelled" ? "text-red-400/80" : s.completed_at ? "text-green-400" : "text-gray-500"}`}>
                  {s.session_type === "cancelled" ? "Cancelled" : s.completed_at ? "Completed" : "Incomplete"}
                </span>
                {s.session_type === "cardio" && (
                  <span className="text-xs bg-blue-500/20 text-blue-400 rounded px-1.5 py-0.5 font-semibold">Cardio</span>
                )}
                {s.session_type === "rest" && (
                  <span className="text-xs bg-green-500/20 text-green-400 rounded px-1.5 py-0.5 font-semibold">🌿 Rest</span>
                )}
                {s.session_type === "free" && (
                  <span className="text-xs bg-purple-500/20 text-purple-400 rounded px-1.5 py-0.5 font-semibold">
                    {(s as { free_format?: string }).free_format ?? "Free"}
                  </span>
                )}
                {s.session_type === "bonus" && (
                  <span className="text-xs bg-gray-500/20 text-gray-400 rounded px-1.5 py-0.5 font-semibold">Bonus</span>
                )}
                {!s.session_type && s.plan_day === "Free Session" && (
                  <span className="text-xs bg-purple-500/20 text-purple-400 rounded px-1.5 py-0.5 font-semibold">Free</span>
                )}
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex gap-2 shrink-0">
              {s.session_type === "rest" ? null : s.session_type === "cardio" ? (
                <Link
                  href={`/workout/cardio/${s.id}/summary`}
                  className="rounded-lg border border-gray-700 px-3 py-2 text-xs text-gray-400 hover:border-gray-500 hover:text-white transition-colors"
                >
                  View
                </Link>
              ) : (
                <Link
                  href={`/workout/history/${s.id}/edit`}
                  className="rounded-lg border border-gray-700 px-3 py-2 text-xs text-gray-400 hover:border-gray-500 hover:text-white transition-colors"
                >
                  Edit
                </Link>
              )}

              {/* Delete with confirm */}
              {confirmDelete === s.id ? (
                <div className="flex gap-1">
                  <button
                    onClick={() => deleteSession(s.id)}
                    disabled={deleting === s.id}
                    className="rounded-lg bg-red-600 px-3 py-2 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-50"
                  >
                    {deleting === s.id ? "…" : "Yes, delete"}
                  </button>
                  <button
                    onClick={() => setConfirmDelete(null)}
                    className="rounded-lg border border-gray-700 px-3 py-2 text-xs text-gray-400 hover:border-gray-500"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setConfirmDelete(s.id)}
                  className="rounded-lg border border-gray-700 px-3 py-2 text-xs text-red-400 hover:border-red-700 transition-colors"
                >
                  Delete
                </button>
              )}
            </div>
          </div>
        </Card>
      ))}
    </div>
    </div>
  );
}
