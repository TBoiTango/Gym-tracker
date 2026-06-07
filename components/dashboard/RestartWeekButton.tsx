"use client";

// Resets the weekly progress ring and the split rotation back to day 1.
// Useful when the user trained outside the app or just wants a fresh week.
// Sets profile.week_start_at = now — the dashboard then only counts sessions
// completed after this timestamp.

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function RestartWeekButton() {
  const router = useRouter();
  const supabase = createClient();
  const [confirming, setConfirming] = useState(false);
  const [saving, setSaving] = useState(false);

  const restart = async () => {
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/login"); return; }

    await supabase
      .from("profiles")
      .update({ week_start_at: new Date().toISOString() })
      .eq("user_id", user.id);

    setSaving(false);
    setConfirming(false);
    router.refresh();
  };

  if (!confirming) {
    return (
      <button
        onClick={() => setConfirming(true)}
        className="text-xs text-gray-500 hover:text-orange-400 transition-colors"
      >
        ↺ Restart week
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-gray-400">Reset progress to day 1?</span>
      <button
        onClick={restart}
        disabled={saving}
        className="rounded-lg bg-orange-500 px-2.5 py-1 text-xs font-semibold text-white hover:bg-orange-600 disabled:opacity-50 transition-colors"
      >
        {saving ? "…" : "Yes"}
      </button>
      <button
        onClick={() => setConfirming(false)}
        className="rounded-lg border border-gray-700 px-2.5 py-1 text-xs text-gray-400 hover:border-gray-500 transition-colors"
      >
        Cancel
      </button>
    </div>
  );
}
