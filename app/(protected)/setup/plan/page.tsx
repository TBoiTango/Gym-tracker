// Setup wizard — step 3: Choose a split type (or No Split / Cardio Only), then generate the AI plan.
// If the user already has an active plan and didn't come here via ?regenerate=true, redirect to dashboard.
"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { SPLIT_OPTIONS, FLEXIBLE_STYLE_OPTIONS } from "@/types";
import type { SplitType, PlanData } from "@/types";
import Button from "@/components/ui/Button";

export default function SetupPlanPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isRegenerate = searchParams.get("regenerate") === "true";
  const supabase = createClient();

  const [checking, setChecking] = useState(true);
  const [splitType, setSplitType] = useState<SplitType>("upper_lower");
  const [flexibleStyle, setFlexibleStyle] = useState<"no_split" | "cardio_only" | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");

  // On mount: check if the user already has an active plan.
  // If yes and not regenerating, go straight to dashboard.
  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push("/login"); return; }

      if (!isRegenerate) {
        // Fetch plan and profile together
        const [planRes, profileRes] = await Promise.all([
          supabase
            .from("workout_plans")
            .select("id")
            .eq("user_id", session.user.id)
            .eq("is_active", true)
            .maybeSingle(),
          supabase
            .from("profiles")
            .select("name, workout_style")
            .eq("user_id", session.user.id)
            .single(),
        ]);

        const plan = planRes.data;
        const profile = profileRes.data;

        // Only skip to dashboard if setup is fully complete (profile name exists)
        if (profile?.name) {
          if (plan) {
            router.replace("/dashboard");
            return;
          }
          if (profile.workout_style === "no_split" || profile.workout_style === "cardio_only") {
            router.replace("/dashboard");
            return;
          }
        }
      }

      setChecking(false);
    })();
  }, []);

  // Save No Split or Cardio Only (no plan generation needed)
  const handleFlexibleStyle = async (style: "no_split" | "cardio_only") => {
    setLoading(true);
    setError("");

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { router.push("/login"); return; }

    // Deactivate any previous plans
    await supabase
      .from("workout_plans")
      .update({ is_active: false })
      .eq("user_id", session.user.id);

    // Save workout_style to profile
    const { error: profileError } = await supabase
      .from("profiles")
      .update({ workout_style: style })
      .eq("user_id", session.user.id);

    if (profileError) {
      setError(profileError.message);
      setLoading(false);
      return;
    }

    router.push("/dashboard");
  };

  // Generate a structured AI plan for split-based users
  const handleGenerate = async () => {
    setLoading(true);
    setError("");
    setStatus("Gathering your profile and equipment…");

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { router.push("/login"); return; }

    const { data: profile } = await supabase
      .from("profiles")
      .select("experience_level, goal, workout_duration, include_cardio")
      .eq("user_id", session.user.id)
      .single();

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

    setStatus("Generating Workout…");

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

    // Deactivate old plans, save new one
    await supabase.from("workout_plans").update({ is_active: false }).eq("user_id", session.user.id);

    // Save workout_style = 'split' on profile
    await supabase.from("profiles").update({ workout_style: "split" }).eq("user_id", session.user.id);

    const { error: saveError } = await supabase.from("workout_plans").insert({
      user_id: session.user.id,
      split_type: splitType,
      plan_data: planData,
      is_active: true,
    });

    if (saveError) { setError(saveError.message); setLoading(false); return; }

    router.push("/dashboard");
  };

  if (checking) {
    return (
      <main className="mx-auto max-w-lg px-4 py-10 flex items-center justify-center min-h-[60vh]">
        <div className="text-gray-500 text-sm animate-pulse">Loading…</div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-lg px-4 py-10">
      <div className="mb-8">
        <p className="text-sm font-medium text-orange-400">{isRegenerate ? "Update Your Plan" : "Step 3 of 3"}</p>
        <h1 className="mt-1 text-2xl font-bold">Choose your workout style</h1>
        <p className="mt-2 text-sm text-gray-400">
          Pick a structured split for an AI-generated plan, or choose a flexible style.
        </p>
      </div>

      {/* Structured splits */}
      <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-3">Structured Splits</p>
      <div className="space-y-3 mb-6">
        {SPLIT_OPTIONS.map((split) => (
          <button
            key={split.id}
            type="button"
            onClick={() => { setSplitType(split.id); setFlexibleStyle(null); }}
            className={`w-full rounded-xl border p-4 text-left transition-colors ${
              splitType === split.id && flexibleStyle === null
                ? "border-orange-500 bg-orange-500/10 text-white"
                : "border-gray-700 bg-gray-900 text-gray-300 hover:border-gray-500"
            }`}
          >
            <p className="font-semibold">{split.label}</p>
            <p className="mt-0.5 text-sm opacity-70">{split.days} days/week</p>
          </button>
        ))}
      </div>

      {/* Flexible styles */}
      <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-3">Flexible Styles</p>
      <div className="space-y-3 mb-8">
        {FLEXIBLE_STYLE_OPTIONS.map((style) => (
          <button
            key={style.id}
            type="button"
            onClick={() => setFlexibleStyle(style.id)}
            className={`w-full rounded-xl border p-4 text-left transition-colors ${
              flexibleStyle === style.id
                ? "border-orange-500 bg-orange-500/10 text-white"
                : "border-gray-700 bg-gray-900 text-gray-300 hover:border-gray-500"
            }`}
          >
            <p className="font-semibold">{style.emoji} {style.label}</p>
            <p className="mt-0.5 text-sm opacity-70">{style.description}</p>
          </button>
        ))}
      </div>

      {status && (
        <p className="mb-4 text-sm text-orange-400 animate-pulse">{status}</p>
      )}
      {error && <p className="mb-4 text-sm text-red-400">{error}</p>}

      {/* Action button — different depending on selection */}
      {flexibleStyle ? (
        <Button
          onClick={() => handleFlexibleStyle(flexibleStyle)}
          loading={loading}
          className="w-full"
        >
          {loading ? "Saving…" : `Set up as ${flexibleStyle === "no_split" ? "No Split" : "Cardio Only"}`}
        </Button>
      ) : (
        <Button onClick={handleGenerate} loading={loading} className="w-full">
          {loading ? "Generating…" : "Generate My Plan"}
        </Button>
      )}
    </main>
  );
}
