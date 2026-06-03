"use client";

// Free session — choose a format (EMOM, AMRAP, Hyrox, CrossFit, ForTime, Tabata),
// let AI generate an authentic workout in that style, then start it.
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Exercise, PlanDay } from "@/types";
import type { FreeSessionFormat } from "@/app/api/generate-free-session/route";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Link from "next/link";

const FORMATS: {
  id: FreeSessionFormat;
  label: string;
  emoji: string;
  description: string;
}[] = [
  { id: "EMOM",     emoji: "⏱",  label: "EMOM",      description: "Every Minute On the Minute — complete reps, rest what's left" },
  { id: "AMRAP",    emoji: "🔁",  label: "AMRAP",     description: "As Many Rounds As Possible in a set time cap" },
  { id: "ForTime",  emoji: "⚡",  label: "For Time",  description: "Complete all reps as fast as possible. Race the clock." },
  { id: "Tabata",   emoji: "🔥",  label: "Tabata",    description: "20s on / 10s off × 8 rounds. Max effort every interval." },
  { id: "CrossFit", emoji: "🏋️", label: "CrossFit",  description: "Functional fitness WOD — gymnastics, lifting, and metcon" },
  { id: "Hyrox",    emoji: "🏃",  label: "Hyrox",     description: "Race-format: runs + functional stations. No cardio machine? We adapt." },
];

const DURATIONS = [
  { value: 20, label: "20 min" },
  { value: 30, label: "30 min" },
  { value: 45, label: "45 min" },
  { value: 60, label: "60 min" },
];

export default function FreeSessionPage() {
  const router = useRouter();
  const supabase = createClient();

  type Step = "pick-format" | "options" | "generating" | "preview" | "starting";
  const [step, setStep] = useState<Step>("pick-format");
  const [format, setFormat] = useState<FreeSessionFormat | null>(null);
  const [duration, setDuration] = useState(30);
  const [generatedDay, setGeneratedDay] = useState<(PlanDay & { format?: string }) | null>(null);
  const [equipment, setEquipment] = useState<string[]>([]);
  const [profile, setProfile] = useState<{ experience_level: string } | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push("/login"); return; }

      const [gymRes, profileRes] = await Promise.all([
        supabase.from("user_gyms").select("equipment_list").eq("user_id", session.user.id)
          .order("created_at", { ascending: false }).limit(1).single(),
        supabase.from("profiles").select("experience_level").eq("user_id", session.user.id).single(),
      ]);

      setEquipment(gymRes.data?.equipment_list ?? []);
      setProfile({ experience_level: profileRes.data?.experience_level ?? "intermediate" });
      setLoading(false);
    })();
  }, []);

  const generate = async () => {
    if (!format) return;
    setStep("generating");
    setError("");

    const res = await fetch("/api/generate-free-session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        format,
        equipment,
        experience_level: profile?.experience_level ?? "intermediate",
        duration_minutes: duration,
      }),
    });

    if (!res.ok) {
      setError("Could not generate workout. Try again.");
      setStep("options");
      return;
    }

    const day = await res.json();
    setGeneratedDay(day);
    setStep("preview");
  };

  const startSession = async () => {
    if (!generatedDay || step === "starting") return;
    setStep("starting");

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { router.push("/login"); return; }

    const { data: workoutSession, error: err } = await supabase
      .from("workout_sessions")
      .insert({
        user_id: session.user.id,
        plan_day: generatedDay.day_name,
        muscle_focus: generatedDay.muscle_focus,
        exercises_data: generatedDay.exercises,
        session_type: "free",
        free_format: generatedDay.format ?? format,
      })
      .select()
      .single();

    if (err || !workoutSession) {
      setError("Failed to start session. Try again.");
      setStep("preview");
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

      {/* ── Step 1: Pick format ──────────────────────────────────────── */}
      {step === "pick-format" && (
        <>
          <div className="mb-6">
            <h1 className="text-2xl font-bold">Free Session</h1>
            <p className="text-sm text-gray-400 mt-1">Pick a format and we'll build an authentic workout for you.</p>
          </div>

          <div className="space-y-2">
            {FORMATS.map((f) => (
              <button
                key={f.id}
                onClick={() => { setFormat(f.id); setStep("options"); }}
                className="w-full rounded-xl border border-gray-700 bg-gray-900 p-4 text-left hover:border-orange-500 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{f.emoji}</span>
                  <div>
                    <p className="font-bold">{f.label}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{f.description}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </>
      )}

      {/* ── Step 2: Options ──────────────────────────────────────────── */}
      {(step === "options" || step === "generating") && format && (
        <>
          <div className="mb-6 flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold">
                {FORMATS.find((f) => f.id === format)?.emoji}{" "}
                {FORMATS.find((f) => f.id === format)?.label}
              </h1>
              <p className="text-sm text-gray-400 mt-1">
                {FORMATS.find((f) => f.id === format)?.description}
              </p>
            </div>
            <button
              onClick={() => setStep("pick-format")}
              className="text-sm text-orange-400 hover:underline shrink-0 mt-1"
            >
              Change
            </button>
          </div>

          {/* Duration — skip for Hyrox (fixed length) */}
          {format !== "Hyrox" && (
            <div className="mb-6">
              <p className="text-sm font-medium text-gray-300 mb-3">⏱ How long?</p>
              <div className="grid grid-cols-4 gap-2">
                {DURATIONS.map((d) => (
                  <button
                    key={d.value}
                    onClick={() => setDuration(d.value)}
                    className={`rounded-xl border p-3 text-center transition-colors ${
                      duration === d.value
                        ? "border-orange-500 bg-orange-500/10 text-white"
                        : "border-gray-700 bg-gray-900 text-gray-400 hover:border-gray-500"
                    }`}
                  >
                    <p className="font-bold text-sm">{d.label}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {error && <p className="text-sm text-red-400 mb-4">{error}</p>}

          <Button onClick={generate} loading={step === "generating"} className="w-full text-lg py-4">
            {step === "generating" ? "Building your workout…" : "Generate Workout"}
          </Button>
        </>
      )}

      {/* ── Step 3: Preview ──────────────────────────────────────────── */}
      {(step === "preview" || step === "starting") && generatedDay && (
        <>
          <div className="mb-6 flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-semibold bg-orange-500/20 text-orange-400 rounded-full px-2 py-0.5">
                  {format}
                </span>
              </div>
              <h1 className="text-2xl font-bold">{generatedDay.day_name}</h1>
              <p className="text-sm text-gray-400 mt-0.5">{generatedDay.muscle_focus}</p>
            </div>
            <button
              onClick={() => setStep("options")}
              className="text-sm text-orange-400 hover:underline shrink-0 mt-1"
            >
              ← Regenerate
            </button>
          </div>

          <div className="space-y-3 mb-8">
            {generatedDay.exercises.map((ex: Exercise, i: number) => (
              <Card key={i} padding="sm">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <p className="font-semibold">{ex.name}</p>
                    <p className="text-sm text-gray-400">
                      {ex.sets} sets × {ex.rep_range}
                      {ex.rest_seconds > 0 ? ` · ${ex.rest_seconds}s rest` : " · no rest"}
                    </p>
                    {ex.coaching_note && (
                      <p className="text-xs text-gray-500 mt-1 italic">{ex.coaching_note}</p>
                    )}
                  </div>
                  <span className="shrink-0 text-xs text-gray-600 font-mono pt-0.5">#{i + 1}</span>
                </div>
              </Card>
            ))}
          </div>

          <Button onClick={startSession} loading={step === "starting"} className="w-full text-lg py-4">
            Start Session 💪
          </Button>
        </>
      )}
    </main>
  );
}
