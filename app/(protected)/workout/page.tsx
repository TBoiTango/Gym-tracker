// Workout start page — pick your day, set duration/cardio/core, then generate.
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

  const [step, setStep] = useState<"pick-day" | "options" | "generating" | "preview">("pick-day");
  const [allDays, setAllDays] = useState<PlanDay[]>([]);
  const [selectedDay, setSelectedDay] = useState<PlanDay | null>(null);
  const [duration, setDuration] = useState(60);
  const [includeCardio, setIncludeCardio] = useState(false);
  const [cardioIntensity, setCardioIntensity] = useState<"easy" | "moderate" | "hard">("moderate");
  const [cardioType, setCardioType] = useState("Treadmill");
  const [includeCore, setIncludeCore] = useState(false);
  const [generatedDay, setGeneratedDay] = useState<PlanDay | null>(null);
  const [error, setError] = useState("");
  const [starting, setStarting] = useState(false);
  const [equipment, setEquipment] = useState<string[]>([]);
  const [profile, setProfile] = useState<{ experience_level: string; goal: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push("/login"); return; }

      const [planRes, gymRes, profileRes, sessionsRes] = await Promise.all([
        supabase.from("workout_plans").select("plan_data").eq("user_id", session.user.id).eq("is_active", true).single(),
        supabase.from("user_gyms").select("equipment_list").eq("user_id", session.user.id).order("created_at", { ascending: false }).limit(1).single(),
        supabase.from("profiles").select("experience_level, goal, workout_duration, include_cardio").eq("user_id", session.user.id).single(),
        supabase.from("workout_sessions").select("plan_day").eq("user_id", session.user.id).not("completed_at", "is", null).order("started_at", { ascending: false }),
      ]);

      const planData = planRes.data?.plan_data as PlanData | undefined;
      const days = planData?.days ?? [];
      setAllDays(days);
      setEquipment(gymRes.data?.equipment_list ?? []);

      if (profileRes.data) {
        setProfile({ experience_level: profileRes.data.experience_level, goal: profileRes.data.goal });
        setDuration(profileRes.data.workout_duration ?? 60);
        setIncludeCardio(profileRes.data.include_cardio ?? false);
      }

      // Work out which day is "next" based on completed sessions
      const dayParam = searchParams.get("day");
      if (dayParam && days.length) {
        const found = days.find((d) => d.day_name === dayParam);
        if (found) {
          setSelectedDay(found);
          setStep("options"); // Skip day picker if coming from dashboard CTA
        }
      } else if (days.length) {
        // Default: next day in rotation
        const completedCount = sessionsRes.data?.length ?? 0;
        const nextIndex = completedCount % days.length;
        setSelectedDay(days[nextIndex]);
      }

      setLoading(false);
    };
    load();
  }, []);

  const confirmDay = (day: PlanDay) => {
    setSelectedDay(day);
    setStep("options");
  };

  const generate = async () => {
    if (!selectedDay) return;
    setStep("generating");
    setError("");

    const res = await fetch("/api/generate-day", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        day_name: selectedDay.day_name,
        muscle_focus: selectedDay.muscle_focus,
        equipment,
        experience_level: profile?.experience_level ?? "beginner",
        goal: profile?.goal ?? "hypertrophy",
        duration_minutes: duration,
        include_cardio: includeCardio,
        cardio_intensity: cardioIntensity,
        cardio_type: cardioType,
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

      {/* ── Step 1: Pick a day ─────────────────────────────────────────── */}
      {step === "pick-day" && (
        <>
          <div className="mb-6">
            <h1 className="text-2xl font-bold">What are you training today?</h1>
            <p className="text-sm text-gray-400 mt-1">Pick any day from your plan — no need to follow the order.</p>
          </div>

          <div className="space-y-2">
            {allDays.map((day, i) => (
              <button
                key={i}
                type="button"
                onClick={() => confirmDay(day)}
                className={`w-full rounded-xl border p-4 text-left transition-colors ${
                  selectedDay?.day_name === day.day_name
                    ? "border-orange-500 bg-orange-500/10 text-white"
                    : "border-gray-700 bg-gray-900 text-gray-300 hover:border-gray-500"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold">{day.day_name}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{day.muscle_focus}</p>
                  </div>
                  <span className="text-xs text-gray-600 font-mono">Day {i + 1}</span>
                </div>
              </button>
            ))}
          </div>
        </>
      )}

      {/* ── Step 2: Options ────────────────────────────────────────────── */}
      {(step === "options" || step === "generating") && selectedDay && (
        <>
          {/* Selected day header + change button */}
          <div className="mb-6 flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold">{selectedDay.day_name}</h1>
              <p className="text-sm text-gray-400 mt-1">{selectedDay.muscle_focus}</p>
            </div>
            <button
              onClick={() => setStep("pick-day")}
              className="text-sm text-orange-400 hover:underline shrink-0 mt-1"
            >
              Change day
            </button>
          </div>

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
              <div className="grid grid-cols-2 gap-2 mb-3">
                {[{ val: true, label: "Yes", note: "Cardio at the end" }, { val: false, label: "No", note: "Weights only" }].map((opt) => (
                  <button
                    key={String(opt.val)}
                    type="button"
                    onClick={() => setIncludeCardio(opt.val)}
                    className={`rounded-xl border p-4 text-left transition-colors ${
                      includeCardio === opt.val
                        ? "border-orange-500 bg-orange-500/10 text-white"
                        : "border-gray-700 bg-gray-900 text-gray-300 hover:border-gray-500"
                    }`}
                  >
                    <p className="font-semibold">{opt.label}</p>
                    <p className="text-xs opacity-60 mt-0.5">{opt.note}</p>
                  </button>
                ))}
              </div>

              {/* Cardio sub-options — only show when cardio is on */}
              {includeCardio && (
                <div className="rounded-xl border border-gray-700 bg-gray-900/50 p-4 space-y-4">
                  {/* Intensity */}
                  <div>
                    <p className="text-xs text-gray-500 mb-2 font-medium uppercase tracking-wider">Intensity</p>
                    <div className="grid grid-cols-3 gap-2">
                      {([
                        { val: "easy" as const,     label: "Easy",     note: "Low & steady" },
                        { val: "moderate" as const, label: "Moderate", note: "Challenging"   },
                        { val: "hard" as const,     label: "Hard",     note: "All out 🔥"   },
                      ]).map((opt) => (
                        <button
                          key={opt.val}
                          type="button"
                          onClick={() => setCardioIntensity(opt.val)}
                          className={`rounded-xl border p-3 text-center transition-colors ${
                            cardioIntensity === opt.val
                              ? "border-orange-500 bg-orange-500/10 text-white"
                              : "border-gray-700 bg-gray-800 text-gray-400 hover:border-gray-500"
                          }`}
                        >
                          <p className="font-semibold text-sm">{opt.label}</p>
                          <p className="text-xs opacity-60 mt-0.5">{opt.note}</p>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Cardio type */}
                  <div>
                    <p className="text-xs text-gray-500 mb-2 font-medium uppercase tracking-wider">Type</p>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { val: "Treadmill",      emoji: "🏃" },
                        { val: "Rowing Machine", emoji: "🚣" },
                        { val: "Stair Stepper",  emoji: "🪜" },
                        { val: "Stationary Bike",emoji: "🚴" },
                        { val: "Jump Rope",      emoji: "⚡" },
                        { val: "Elliptical",     emoji: "🔄" },
                        { val: "Battle Ropes",   emoji: "💪" },
                        { val: "Any / AI Pick",  emoji: "🤖" },
                      ].map((opt) => (
                        <button
                          key={opt.val}
                          type="button"
                          onClick={() => setCardioType(opt.val)}
                          className={`rounded-xl border px-3 py-2.5 text-left text-sm transition-colors ${
                            cardioType === opt.val
                              ? "border-orange-500 bg-orange-500/10 text-white"
                              : "border-gray-700 bg-gray-800 text-gray-400 hover:border-gray-500"
                          }`}
                        >
                          {opt.emoji} {opt.val}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Core */}
            <div>
              <p className="text-sm font-medium text-gray-300 mb-3">💪 Add core work?</p>
              <div className="grid grid-cols-2 gap-2">
                {[{ val: true, label: "Yes", note: "Ab work included" }, { val: false, label: "No", note: "Skip core today" }].map((opt) => (
                  <button
                    key={String(opt.val)}
                    type="button"
                    onClick={() => setIncludeCore(opt.val)}
                    className={`rounded-xl border p-4 text-left transition-colors ${
                      includeCore === opt.val
                        ? "border-orange-500 bg-orange-500/10 text-white"
                        : "border-gray-700 bg-gray-900 text-gray-300 hover:border-gray-500"
                    }`}
                  >
                    <p className="font-semibold">{opt.label}</p>
                    <p className="text-xs opacity-60 mt-0.5">{opt.note}</p>
                  </button>
                ))}
              </div>
            </div>

            {error && <p className="text-sm text-red-400">{error}</p>}

            <Button onClick={generate} loading={step === "generating"} className="w-full text-lg py-4">
              {step === "generating" ? "Generating Workout…" : "Generate Today's Workout"}
            </Button>
          </div>
        </>
      )}

      {/* ── Step 3: Preview ────────────────────────────────────────────── */}
      {step === "preview" && generatedDay && (
        <>
          <div className="mb-6 flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold">{generatedDay.day_name}</h1>
              <p className="text-sm text-gray-400 mt-1">{generatedDay.exercises.length} exercises · {duration} min</p>
            </div>
            <button
              onClick={() => setStep("options")}
              className="text-sm text-orange-400 hover:underline shrink-0 mt-1"
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
        </>
      )}
    </main>
  );
}
