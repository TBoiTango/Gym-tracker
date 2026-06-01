// Today's workout page — step 1: ask duration/cardio/core, step 2: generate + show workout.
"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { PlanData, PlanDay, Exercise } from "@/types";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Link from "next/link";

const DURATIONS = [
  { value: 30, label: "30 min", note: "Compounds only" },
  { value: 45, label: "45 min", note: "Compounds + some isolation" },
  { value: 60, label: "60 min", note: "Full session" },
  { value: 90, label: "90 min", note: "Full volume" },
];

export default function WorkoutPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  const [step, setStep] = useState<"options" | "generating" | "preview">("options");
  const [duration, setDuration] = useState(60);
  const [includeCardio, setIncludeCardio] = useState(false);
  const [includeCore, setIncludeCore] = useState(false);
  const [generatedDay, setGeneratedDay] = useState<PlanDay | null>(null);
  const [error, setError] = useState("");
  const [starting, setStarting] = useState(false);

  // The day name comes from the dashboard link e.g. ?day=Push+Day+A
  const [dayName, setDayName] = useState<string>("");
  const [muscleFocus, setMuscleFocus] = useState<string>("");
  const [equipment, setEquipment] = useState<string[]>([]);
  const [profile, setProfile] = useState<{ experience_level: string; goal: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push("/login"); return; }

      // Load plan to get the day's muscle focus
      const [planRes, gymRes, profileRes] = await Promise.all([
        supabase.from("workout_plans").select("plan_data").eq("user_id", session.user.id).eq("is_active", true).single(),
        supabase.from("user_gyms").select("equipment_list").eq("user_id", session.user.id).order("created_at", { ascending: false }).limit(1).single(),
        supabase.from("profiles").select("experience_level, goal, workout_duration, include_cardio").eq("user_id", session.user.id).single(),
      ]);

      const planData = planRes.data?.plan_data as PlanData | undefined;
      const dayParam = searchParams.get("day");
      const planDay = planData?.days.find((d) => d.day_name === dayParam) ?? planData?.days[0];

      setDayName(planDay?.day_name ?? "");
      setMuscleFocus(planDay?.muscle_focus ?? "");
      setEquipment(gymRes.data?.equipment_list ?? []);
      setProfile(profileRes.data ? { experience_level: profileRes.data.experience_level, goal: profileRes.data.goal } : null);

      // Pre-fill with their saved preferences
      if (profileRes.data) {
        setDuration(profileRes.data.workout_duration ?? 60);
        setIncludeCardio(profileRes.data.include_cardio ?? false);
      }

      setLoading(false);
    };
    load();
  }, []);

  const generate = async () => {
    setStep("generating");
    setError("");

    const res = await fetch("/api/generate-day", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        day_name: dayName,
        muscle_focus: muscleFocus,
        equipment,
        experience_level: profile?.experience_level ?? "beginner",
        goal: profile?.goal ?? "hypertrophy",
        duration_minutes: duration,
        include_cardio: includeCardio,
        include_core: includeCore,
      }),
    });

    if (!res.ok) {
      setError("Failed to generate workout. Please try again.");
      setStep("options");
      return;
    }

    const day: PlanDay = await res.json();
    setGeneratedDay(day);
    setStep("preview");
  };

  const startWorkout = async () => {
    if (!generatedDay) return;
    setStarting(true);

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { router.push("/login"); return; }

    // Save session with the generated exercises stored directly on the row
    const { data: workoutSession, error } = await supabase
      .from("workout_sessions")
      .insert({
        user_id: session.user.id,
        plan_day: generatedDay.day_name,
        exercises_data: generatedDay.exercises,
      })
      .select()
      .single();

    if (error || !workoutSession) {
      console.error(error);
      setStarting(false);
      return;
    }

    router.push(`/workout/${workoutSession.id}`);
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
      <Link href="/dashboard" className="mb-6 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-300">
        ← Dashboard
      </Link>

      {/* Day header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold">{dayName}</h1>
        <p className="text-sm text-gray-400 mt-1">{muscleFocus}</p>
      </div>

      {/* Step 1: Options */}
      {(step === "options" || step === "generating") && (
        <div className="space-y-6">

          {/* Duration */}
          <div>
            <p className="text-sm font-medium text-gray-300 mb-3">⏱ How long do you have today?</p>
            <div className="grid grid-cols-2 gap-2">
              {DURATIONS.map((d) => (
                <button
                  key={d.value}
                  type="button"
                  onClick={() => setDuration(d.value)}
                  className={`rounded-xl border p-4 text-left transition-colors ${
                    duration === d.value
                      ? "border-orange-500 bg-orange-500/10 text-white"
                      : "border-gray-700 bg-gray-900 text-gray-300 hover:border-gray-500"
                  }`}
                >
                  <p className="font-bold text-lg">{d.label}</p>
                  <p className="text-xs opacity-60 mt-0.5">{d.note}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Cardio */}
          <div>
            <p className="text-sm font-medium text-gray-300 mb-3">🏃 Add cardio finisher?</p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setIncludeCardio(true)}
                className={`rounded-xl border p-4 text-left transition-colors ${
                  includeCardio
                    ? "border-orange-500 bg-orange-500/10 text-white"
                    : "border-gray-700 bg-gray-900 text-gray-300 hover:border-gray-500"
                }`}
              >
                <p className="font-semibold">Yes</p>
                <p className="text-xs opacity-60 mt-0.5">Cardio at the end</p>
              </button>
              <button
                type="button"
                onClick={() => setIncludeCardio(false)}
                className={`rounded-xl border p-4 text-left transition-colors ${
                  !includeCardio
                    ? "border-orange-500 bg-orange-500/10 text-white"
                    : "border-gray-700 bg-gray-900 text-gray-300 hover:border-gray-500"
                }`}
              >
                <p className="font-semibold">No</p>
                <p className="text-xs opacity-60 mt-0.5">Weights only</p>
              </button>
            </div>
          </div>

          {/* Core */}
          <div>
            <p className="text-sm font-medium text-gray-300 mb-3">💪 Add core work?</p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setIncludeCore(true)}
                className={`rounded-xl border p-4 text-left transition-colors ${
                  includeCore
                    ? "border-orange-500 bg-orange-500/10 text-white"
                    : "border-gray-700 bg-gray-900 text-gray-300 hover:border-gray-500"
                }`}
              >
                <p className="font-semibold">Yes</p>
                <p className="text-xs opacity-60 mt-0.5">Ab work included</p>
              </button>
              <button
                type="button"
                onClick={() => setIncludeCore(false)}
                className={`rounded-xl border p-4 text-left transition-colors ${
                  !includeCore
                    ? "border-orange-500 bg-orange-500/10 text-white"
                    : "border-gray-700 bg-gray-900 text-gray-300 hover:border-gray-500"
                }`}
              >
                <p className="font-semibold">No</p>
                <p className="text-xs opacity-60 mt-0.5">Skip core today</p>
              </button>
            </div>
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}

          <Button
            onClick={generate}
            loading={step === "generating"}
            className="w-full text-lg py-4"
          >
            {step === "generating" ? "Building your workout…" : "Generate Today's Workout 🤖"}
          </Button>
        </div>
      )}

      {/* Step 2: Preview generated workout */}
      {step === "preview" && generatedDay && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-gray-400">{generatedDay.exercises.length} exercises · {duration} min</p>
            <button
              onClick={() => setStep("options")}
              className="text-sm text-orange-400 hover:underline"
            >
              ← Change options
            </button>
          </div>

          <div className="space-y-3 mb-8">
            {generatedDay.exercises.map((ex: Exercise, i: number) => (
              <Card key={i} padding="sm">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold">{ex.name}</p>
                    <p className="text-sm text-gray-400">
                      {ex.sets} sets × {ex.rep_range} reps · {ex.rest_seconds}s rest
                    </p>
                    <p className="text-xs text-gray-500 mt-1 italic">{ex.coaching_note}</p>
                  </div>
                  <span className="shrink-0 text-xs text-gray-600 font-mono pt-0.5">#{i + 1}</span>
                </div>
              </Card>
            ))}
          </div>

          <Button onClick={startWorkout} loading={starting} className="w-full text-lg py-4">
            Start Workout 💪
          </Button>
        </div>
      )}
    </main>
  );
}
