// Setup wizard — step 3: Choose a split type, then generate the AI plan.
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { SPLIT_OPTIONS } from "@/types";
import type { SplitType, PlanData } from "@/types";
import Button from "@/components/ui/Button";

export default function SetupPlanPage() {
  const router = useRouter();
  const supabase = createClient();
  const [splitType, setSplitType] = useState<SplitType>("upper_lower");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");

  const handleGenerate = async () => {
    setLoading(true);
    setError("");
    setStatus("Gathering your profile and equipment…");

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { router.push("/login"); return; }

    // Fetch profile (including new duration + cardio fields)
    const { data: profile } = await supabase
      .from("profiles")
      .select("experience_level, goal, workout_duration, include_cardio")
      .eq("user_id", session.user.id)
      .single();

    // Fetch equipment
    const { data: userGym } = await supabase
      .from("user_gyms")
      .select("equipment_list")
      .eq("user_id", session.user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (!profile || !userGym) {
      setError("Could not load your profile. Please go back and complete the previous steps.");
      setLoading(false);
      return;
    }

    setStatus("Asking Claude to build your plan — this takes about 10 seconds…");

    const res = await fetch("/api/generate-plan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        equipment: userGym.equipment_list,
        experience_level: profile.experience_level,
        goal: profile.goal,
        split_type: splitType,
        workout_duration: profile.workout_duration ?? 60,
        include_cardio: profile.include_cardio ?? false,
      }),
    });

    if (!res.ok) {
      const { error: msg } = await res.json();
      setError(msg || "Failed to generate plan. Please try again.");
      setLoading(false);
      setStatus("");
      return;
    }

    const planData: PlanData = await res.json();

    setStatus("Saving your plan…");

    // Deactivate any previous plans
    await supabase
      .from("workout_plans")
      .update({ is_active: false })
      .eq("user_id", session.user.id);

    // Save the new plan
    const { error: saveError } = await supabase.from("workout_plans").insert({
      user_id: session.user.id,
      split_type: splitType,
      plan_data: planData,
      is_active: true,
    });

    if (saveError) { setError(saveError.message); setLoading(false); return; }

    router.push("/dashboard");
  };

  return (
    <main className="mx-auto max-w-lg px-4 py-10">
      <div className="mb-8">
        <p className="text-sm font-medium text-orange-400">Step 3 of 3</p>
        <h1 className="mt-1 text-2xl font-bold">Choose your split</h1>
        <p className="mt-2 text-sm text-gray-400">
          Claude will generate a personalised plan based on your goal, experience, and equipment.
        </p>
      </div>

      <div className="space-y-3 mb-8">
        {SPLIT_OPTIONS.map((split) => (
          <button
            key={split.id}
            type="button"
            onClick={() => setSplitType(split.id)}
            className={`w-full rounded-xl border p-4 text-left transition-colors ${
              splitType === split.id
                ? "border-orange-500 bg-orange-500/10 text-white"
                : "border-gray-700 bg-gray-900 text-gray-300 hover:border-gray-500"
            }`}
          >
            <p className="font-semibold">{split.label}</p>
            <p className="mt-0.5 text-sm opacity-70">{split.days} days/week</p>
          </button>
        ))}
      </div>

      {status && (
        <p className="mb-4 text-sm text-orange-400 animate-pulse">{status}</p>
      )}
      {error && <p className="mb-4 text-sm text-red-400">{error}</p>}

      <Button onClick={handleGenerate} loading={loading} className="w-full">
        {loading ? "Generating…" : "Generate My Plan 🤖"}
      </Button>
    </main>
  );
}
