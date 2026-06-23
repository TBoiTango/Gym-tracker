// Workout start page — pick your day, set duration/cardio/core, then generate.
"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { PlanData, PlanDay, Exercise } from "@/types";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Link from "next/link";

// Group day names into muscle categories so Pull A and Pull B count as the same
// "pull" category for repeat-prevention purposes.
function muscleCategory(dayName: string): string {
  const n = (dayName || "").toLowerCase();
  if (n.includes("pull")) return "pull";
  if (n.includes("push")) return "push";
  if (n.includes("upper")) return "upper";
  if (n.includes("lower")) return "lower";
  if (n.includes("leg")) return "legs";
  if (n.includes("back")) return "pull";
  if (n.includes("chest")) return "push";
  return n.trim() || "other";
}

// Detect whether an exercise name is a core/ab movement.
function isCoreExercise(name: string): boolean {
  return /plank|crunch|sit.?up|leg raise|dead ?bug|pallof|woodchop|russian twist|hollow|copenhagen|\bab\b|abdominal|core|oblique|bird.?dog|hanging|dragon flag|v-?up|toe touch/i.test(name);
}

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

  const SESSION_KEY = "wb_workout_state";

  // Restore persisted state so navigating away and back doesn't reset the flow
  const getSaved = () => {
    try { return JSON.parse(sessionStorage.getItem(SESSION_KEY) ?? "{}"); } catch { return {}; }
  };
  const saved = getSaved();

  const [step, setStep] = useState<"pick-day" | "options" | "generating" | "preview">(saved.step ?? "pick-day");
  const [allDays, setAllDays] = useState<PlanDay[]>([]);
  const [selectedDay, setSelectedDay] = useState<PlanDay | null>(saved.selectedDay ?? null);
  const [duration, setDuration] = useState<number>(saved.duration ?? 60);
  const [includeCardio, setIncludeCardio] = useState<boolean>(saved.includeCardio ?? false);
  const [cardioIntensity, setCardioIntensity] = useState<"easy" | "moderate" | "hard">(saved.cardioIntensity ?? "moderate");
  const [cardioType, setCardioType] = useState<string>(saved.cardioType ?? "Treadmill");
  const [includeCore, setIncludeCore] = useState<boolean>(saved.includeCore ?? false);
  const [generatedDay, setGeneratedDay] = useState<PlanDay | null>(saved.generatedDay ?? null);
  const [error, setError] = useState("");
  const [starting, setStarting] = useState(false);
  const [equipment, setEquipment] = useState<string[]>([]);
  const [profile, setProfile] = useState<{ experience_level: string; goal: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  // Adaptive volume learning
  const [adaptiveInfo, setAdaptiveInfo] = useState<{
    sessionCount: number;
    avgExercises: number;
    poolExercises: { exercise_name: string; sets: number; rep_range: string; rest_seconds: number; coaching_note: string }[];
    dislikedExercises: string[];
    staleExercises: string[];
  } | null>(null);
  const [adaptiveLoading, setAdaptiveLoading] = useState(false);

  // Persist state to sessionStorage whenever key values change
  useEffect(() => {
    if (loading) return;
    try {
      sessionStorage.setItem(SESSION_KEY, JSON.stringify({
        step: step === "generating" ? "options" : step, // never restore mid-generate
        selectedDay,
        duration,
        includeCardio,
        cardioIntensity,
        cardioType,
        includeCore,
        generatedDay,
      }));
    } catch {}
  }, [step, selectedDay, duration, includeCardio, cardioIntensity, cardioType, includeCore, generatedDay, loading]);

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

      setUserId(session.user.id);
      const planData = planRes.data?.plan_data as PlanData | undefined;
      const days = planData?.days ?? [];
      setAllDays(days);
      setEquipment(gymRes.data?.equipment_list ?? []);

      if (profileRes.data) {
        setProfile({ experience_level: profileRes.data.experience_level, goal: profileRes.data.goal });
        // Only apply profile defaults if there's no saved state
        const hasSaved = Object.keys(getSaved()).length > 0;
        if (!hasSaved) {
          setDuration(profileRes.data.workout_duration ?? 60);
          setIncludeCardio(profileRes.data.include_cardio ?? false);
        }
      }

      // Work out which day is "next" based on completed sessions
      const dayParam = searchParams.get("day");
      const hasSaved = Object.keys(getSaved()).length > 0;
      if (dayParam && days.length) {
        // Dashboard CTA with a specific day — always honour it and clear saved state
        const found = days.find((d) => d.day_name === dayParam);
        if (found) {
          try { sessionStorage.removeItem(SESSION_KEY); } catch {}
          setSelectedDay(found);
          setGeneratedDay(null);
          setStep("options");
        }
      } else if (!hasSaved && days.length) {
        // No saved state — default to next day in rotation
        const completedCount = sessionsRes.data?.length ?? 0;
        const nextIndex = completedCount % days.length;
        setSelectedDay(days[nextIndex]);
      }

      setLoading(false);
    };
    load();
  }, []);

  // Fetch adaptive volume data whenever the selected day changes
  useEffect(() => {
    if (!selectedDay || !userId) return;
    setAdaptiveInfo(null);
    setAdaptiveLoading(true);

    (async () => {
      try {
        // Last 4 completed sessions for this exact day type.
        // Use .or() to include NULL session_type (regular workouts) since
        // .neq("session_type", "rest") silently excludes NULLs in SQL.
        const { data: pastSessions } = await supabase
          .from("workout_sessions")
          .select("id")
          .eq("user_id", userId)
          .eq("plan_day", selectedDay.day_name)
          .not("completed_at", "is", null)
          .or("session_type.is.null,session_type.eq.workout,session_type.eq.free")
          .order("completed_at", { ascending: false })
          .limit(4);

        let avgExercises = 0;
        const sessionCount = pastSessions?.length ?? 0;

        if (sessionCount > 0) {
          const ids = pastSessions!.map((s) => s.id);
          const { data: logs } = await supabase
            .from("exercise_logs")
            .select("session_id, exercise_name")
            .in("session_id", ids);

          if (logs && logs.length > 0) {
            const countsPerSession = ids.map((id) => {
              const names = new Set(logs.filter((l) => l.session_id === id).map((l) => l.exercise_name));
              return names.size;
            }).filter((c) => c > 0);

            if (countsPerSession.length > 0) {
              avgExercises = Math.round(
                countsPerSession.reduce((a, b) => a + b, 0) / countsPerSession.length
              );
            }

          }
        }


        // Pool exercises for this day type, least-recently-used first
        const { data: pool } = await supabase
          .from("user_exercise_pool")
          .select("exercise_name, sets, rep_range, rest_seconds, coaching_note, last_included_at")
          .eq("user_id", userId)
          .eq("day_type", selectedDay.day_name)
          .order("last_included_at", { ascending: true, nullsFirst: true })
          .limit(6);

        // Exercises the user has permanently blocked (skipped 3+ times)
        const { data: disliked } = await supabase
          .from("user_exercise_preferences")
          .select("exercise_name")
          .eq("user_id", userId)
          .eq("do_not_suggest", true);

        // Stale exercise detection: look at last 8 sessions of the same muscle
        // category and flag any exercise that appeared in 5+ of them — those
        // get a "please use a variation" nudge rather than a hard exclusion.
        const myCategory = muscleCategory(selectedDay.day_name);
        const { data: catSessions } = await supabase
          .from("workout_sessions")
          .select("id")
          .eq("user_id", userId)
          .not("completed_at", "is", null)
          .or("session_type.is.null,session_type.eq.workout")
          .order("started_at", { ascending: false })
          .limit(24); // fetch enough to filter by category

        let staleExercises: string[] = [];
        if (catSessions && catSessions.length > 0) {
          // Filter to same muscle category sessions (client-side, since plan_day is text)
          const { data: catSessionsFull } = await supabase
            .from("workout_sessions")
            .select("id, plan_day")
            .eq("user_id", userId)
            .not("completed_at", "is", null)
            .or("session_type.is.null,session_type.eq.workout")
            .order("started_at", { ascending: false })
            .limit(24);

          const sameCatIds = (catSessionsFull ?? [])
            .filter((s) => muscleCategory(s.plan_day) === myCategory)
            .slice(0, 8)
            .map((s) => s.id);

          if (sameCatIds.length >= 5) {
            const { data: catLogs } = await supabase
              .from("exercise_logs")
              .select("exercise_name, session_id")
              .in("session_id", sameCatIds);

            if (catLogs && catLogs.length > 0) {
              // Count how many sessions each exercise appeared in
              const sessionSets: Record<string, Set<string>> = {};
              for (const log of catLogs) {
                if (!sessionSets[log.exercise_name]) sessionSets[log.exercise_name] = new Set();
                sessionSets[log.exercise_name].add(log.session_id);
              }
              staleExercises = Object.entries(sessionSets)
                .filter(([, sessions]) => sessions.size >= 5)
                .map(([name]) => name);
              if (staleExercises.length > 0) {
                console.log(`[stale] exercises used in 5+ of last 8 ${myCategory} sessions:`, staleExercises);
              }
            }
          }
        }

        setAdaptiveInfo({
          sessionCount,
          avgExercises,
          poolExercises: pool ?? [],
          dislikedExercises: (disliked ?? []).map((d) => d.exercise_name),
          staleExercises,
        });
      } finally {
        setAdaptiveLoading(false);
      }
    })();
  }, [selectedDay?.day_name, userId]);

  const confirmDay = (day: PlanDay) => {
    setSelectedDay(day);
    setStep("options");
  };

  // ── Repeat prevention ───────────────────────────────────────────────────────
  // Two separate rules:
  //  • CORE: exclude core exercises used in the last 2 completed sessions of ANY
  //    day type, so core never repeats on back-to-back training days.
  //  • LIFTING: exclude the lifting movements from the most recent session of the
  //    SAME muscle category (Pull A ↔ Pull B), so the two same-category days in a
  //    week differ. Older sessions are NOT excluded, so next week can reuse
  //    movements with variation.
  const computeExcludedExercises = async (dayName: string): Promise<string[]> => {
    if (!userId) return [];

    const { data: recentSessions } = await supabase
      .from("workout_sessions")
      .select("id, plan_day, started_at")
      .eq("user_id", userId)
      .not("completed_at", "is", null)
      .or("session_type.is.null,session_type.eq.workout,session_type.eq.free")
      .order("started_at", { ascending: false })
      .limit(10);

    if (!recentSessions?.length) return [];

    const myCategory = muscleCategory(dayName);
    // Most recent session of the SAME category (for lifting exclusion)
    const sameCategorySession = recentSessions.find((s) => muscleCategory(s.plan_day) === myCategory);
    // Last 2 sessions of ANY type (for core exclusion)
    const last2 = recentSessions.slice(0, 2);

    const idsToFetch = Array.from(new Set([
      ...(sameCategorySession ? [sameCategorySession.id] : []),
      ...last2.map((s) => s.id),
    ]));
    if (idsToFetch.length === 0) return [];

    const { data: logs } = await supabase
      .from("exercise_logs")
      .select("exercise_name, session_id")
      .in("session_id", idsToFetch);

    if (!logs?.length) return [];

    const exclude = new Set<string>();
    for (const l of logs) {
      const core = isCoreExercise(l.exercise_name);
      // Lifting from the most recent same-category session
      if (sameCategorySession && l.session_id === sameCategorySession.id && !core) {
        exclude.add(l.exercise_name);
      }
      // Core from the last 2 sessions of any type
      if (core && last2.some((s) => s.id === l.session_id)) {
        exclude.add(l.exercise_name);
      }
    }

    const result = Array.from(exclude);
    console.log(`[exclusions] day="${dayName}" category="${myCategory}" sameCatSession=${sameCategorySession?.plan_day ?? "none"} → excluding:`, result);
    return result;
  };

  const generate = async () => {
    if (!selectedDay) return;
    setStep("generating");
    setError("");

    const recentlyUsedExercises = await computeExcludedExercises(selectedDay.day_name);
    // Merge in permanently-blocked exercises so they're also hard-excluded
    const disliked = adaptiveInfo?.dislikedExercises ?? [];
    const allExcluded = Array.from(new Set([...recentlyUsedExercises, ...disliked]));
    console.log(`[generate] excluded (${allExcluded.length}): recently_used=${recentlyUsedExercises.length}, disliked=${disliked.length}`, allExcluded);

    const staleExercises = adaptiveInfo?.staleExercises ?? [];
    if (staleExercises.length > 0) {
      console.log(`[generate] stale exercises (will prompt for variation):`, staleExercises);
    }

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
        // Adaptive volume params — only send if we have meaningful data
        target_exercise_count: adaptiveInfo && adaptiveInfo.avgExercises > 0 ? adaptiveInfo.avgExercises : undefined,
        pool_exercises: adaptiveInfo?.poolExercises ?? [],
        recently_used_exercises: allExcluded,
        stale_exercises: staleExercises,
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
    if (!generatedDay || starting) return; // guard against double-tap
    setStarting(true);
    // Clear saved state so next visit starts fresh
    try { sessionStorage.removeItem(SESSION_KEY); } catch {}

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { router.push("/login"); return; }

    const { data: workoutSession, error } = await supabase
      .from("workout_sessions")
      .insert({
        user_id: session.user.id,
        plan_day: generatedDay.day_name,
        muscle_focus: generatedDay.muscle_focus,
        exercises_data: generatedDay.exercises,
      })
      .select()
      .single();

    if (error || !workoutSession) {
      console.error(error);
      setStarting(false);
      return;
    }

    // Mark pool exercises that were included so the rotation advances next time
    if (adaptiveInfo?.poolExercises.length) {
      const generatedNames = new Set(generatedDay.exercises.map((e) => e.name));
      const includedPoolNames = adaptiveInfo.poolExercises
        .filter((p) => generatedNames.has(p.exercise_name))
        .map((p) => p.exercise_name);
      if (includedPoolNames.length > 0) {
        await supabase
          .from("user_exercise_pool")
          .update({ last_included_at: new Date().toISOString() })
          .eq("user_id", session.user.id)
          .eq("day_type", generatedDay.day_name)
          .in("exercise_name", includedPoolNames);
      }
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

            {/* Rest day option */}
            <Link
              href="/workout/rest"
              className="flex w-full items-center justify-between rounded-xl border border-gray-700 bg-gray-900 p-4 text-left text-gray-400 hover:border-green-700 hover:text-green-400 transition-colors"
            >
              <div className="flex items-center gap-3">
                <span className="text-xl">🌿</span>
                <div>
                  <p className="font-semibold text-sm">Rest Day</p>
                  <p className="text-xs text-gray-600 mt-0.5">Recovery tips + stretching routine</p>
                </div>
              </div>
              <span className="text-xs text-gray-600">→</span>
            </Link>
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

            {/* Adaptive volume banner */}
            {adaptiveInfo && adaptiveInfo.sessionCount > 0 && adaptiveInfo.avgExercises > 0 && (
              <div className="rounded-xl border border-orange-500/20 bg-orange-500/5 px-4 py-3 flex items-center gap-3">
                <span className="text-lg shrink-0">🧠</span>
                <p className="text-xs text-gray-300">
                  Based on your last{" "}
                  <span className="text-orange-400 font-semibold">{adaptiveInfo.sessionCount}</span>{" "}
                  {selectedDay?.day_name} session{adaptiveInfo.sessionCount !== 1 ? "s" : ""}, generating{" "}
                  <span className="text-orange-400 font-semibold">{adaptiveInfo.avgExercises} exercises</span>{" "}
                  tailored to your volume.
                  {adaptiveInfo.poolExercises.length > 0 && (
                    <> Rotating in your saved favourites.</>
                  )}
                </p>
              </div>
            )}
            {adaptiveLoading && (
              <div className="h-12 rounded-xl bg-gray-800 animate-pulse" />
            )}

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
