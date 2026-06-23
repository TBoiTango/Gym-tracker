"use client";

// Shown when the user hits (or exceeds) their weekly workout target.
// Prompts them to start a fresh week or keep going.
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

interface Props {
  completed: number;
  target: number;
}

const STORAGE_KEY = "weekGoalDismissedAt";

export default function WeeklyGoalBanner({ completed, target }: Props) {
  const router = useRouter();
  const supabase = createClient();
  const [visible, setVisible] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (completed < target) return;
    // Hide if the user already dismissed at this same count
    try {
      const dismissed = parseInt(localStorage.getItem(STORAGE_KEY) ?? "0", 10);
      if (dismissed >= completed) return;
    } catch {}
    setVisible(true);
  }, [completed, target]);

  if (!visible) return null;

  const handleNewWeek = async () => {
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase
      .from("profiles")
      .update({ week_start_at: new Date().toISOString() })
      .eq("user_id", user.id);
    try { localStorage.removeItem(STORAGE_KEY); } catch {}
    setSaving(false);
    setVisible(false);
    router.refresh();
  };

  const handleKeepGoing = () => {
    try { localStorage.setItem(STORAGE_KEY, String(completed)); } catch {}
    setVisible(false);
  };

  return (
    <div className="rounded-xl border border-green-600/40 bg-green-900/15 px-4 py-4">
      <div className="flex items-start gap-3">
        <span className="text-2xl">🎯</span>
        <div className="flex-1">
          <p className="font-semibold text-white">
            Weekly goal hit — {completed}/{target} workouts!
          </p>
          <p className="text-sm text-gray-400 mt-0.5">
            Great work this week. Start a new week to reset the counter, or keep going if you want to squeeze in more sessions.
          </p>
          <div className="mt-3 flex gap-2">
            <button
              onClick={handleNewWeek}
              disabled={saving}
              className="rounded-lg bg-green-600 px-3 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50 transition-colors"
            >
              {saving ? "Resetting…" : "Start New Week"}
            </button>
            <button
              onClick={handleKeepGoing}
              className="rounded-lg border border-gray-600 px-3 py-2 text-sm font-semibold text-gray-300 hover:border-gray-400 transition-colors"
            >
              Keep Going
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
