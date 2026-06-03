"use client";

// Shown at the end of a free session summary.
// Asks whether this session replaces today's planned split day or was a bonus.
//
// Replace → session_type stays "free" → rotation counts it (split advances)
// Bonus   → session_type set to "bonus" → rotation skips it (split day stays pending)

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

interface Props {
  sessionId: string;
  format: string;
}

export default function FreeSessionOutcomePrompt({ sessionId, format }: Props) {
  const router = useRouter();
  const supabase = createClient();
  const [saving, setSaving] = useState(false);
  const [choice, setChoice] = useState<"replace" | "bonus" | null>(null);

  const handleChoice = async (outcome: "replace" | "bonus") => {
    setSaving(true);
    setChoice(outcome);

    if (outcome === "bonus") {
      // Mark as bonus so the split rotation doesn't count it
      await supabase
        .from("workout_sessions")
        .update({ session_type: "bonus" })
        .eq("id", sessionId);
    }
    // If "replace": session_type stays "free" — rotation already counts it

    router.push("/dashboard");
  };

  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-gray-700 bg-gray-900 p-4">
        <p className="font-semibold text-sm mb-1">Did this {format} session replace today's planned workout?</p>
        <p className="text-xs text-gray-500">
          Replace → your split moves forward as normal.
          Bonus → today's planned day stays pending and rolls to the next available slot.
        </p>
      </div>

      <button
        onClick={() => handleChoice("replace")}
        disabled={saving}
        className="w-full rounded-xl bg-orange-500 py-4 text-center font-semibold text-white hover:bg-orange-600 disabled:opacity-50 transition-colors"
      >
        {saving && choice === "replace" ? "Saving…" : "Yes, replace today's split day"}
      </button>

      <button
        onClick={() => handleChoice("bonus")}
        disabled={saving}
        className="w-full rounded-xl border border-gray-700 py-4 text-center font-semibold text-gray-300 hover:border-gray-500 disabled:opacity-50 transition-colors"
      >
        {saving && choice === "bonus" ? "Saving…" : "No, this was a bonus session"}
      </button>
    </div>
  );
}
