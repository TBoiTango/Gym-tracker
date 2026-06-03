"use client";

// Free session — two modes:
// 1. Open Session: show up at the gym and log as you go (manual)
// 2. Format-based: AI generates an EMOM, AMRAP, Hyrox, CrossFit, ForTime, or Tabata workout
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Exercise, PlanDay } from "@/types";
import type { FreeSessionFormat } from "@/app/api/generate-free-session/route";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Link from "next/link";

const AI_FORMATS: { id: FreeSessionFormat; label: string; emoji: string; description: string }[] = [
  { id: "EMOM",     emoji: "⏱",  label: "EMOM",      description: "Every Minute On the Minute — complete reps, rest what's left" },
  { id: "AMRAP",    emoji: "🔁",  label: "AMRAP",     description: "As Many Rounds As Possible in a set time cap" },
  { id: "ForTime",  emoji: "⚡",  label: "For Time",  description: "Complete all reps as fast as possible. Race the clock." },
  { id: "Tabata",   emoji: "🔥",  label: "Tabata",    description: "20s on / 10s off × 8 rounds. Max effort every interval." },
  { id: "CrossFit", emoji: "🏋️", label: "CrossFit",  description: "Functional fitness WOD — gymnastics, lifting, and metcon" },
  { id: "Hyrox",    emoji: "🏃",  label: "Hyrox",     description: "Hyrox training — runs + 2-4 functional stations. Builds race fitness without destroying you." },
];

const DURATIONS = [
  { value: 20, label: "20 min" },
  { value: 30, label: "30 min" },
  { value: 45, label: "45 min" },
  { value: 60, label: "60 min" },
];

type Mode = "pick" | "open" | "format-options" | "generating" | "preview" | "starting";

export default function FreeSessionPage() {
  const router = useRouter();
  const supabase = createClient();

  const [mode, setMode] = useState<Mode>("pick");
  const [format, setFormat] = useState<FreeSessionFormat | null>(null);
  const [duration, setDuration] = useState(30);
  const [generatedDay, setGeneratedDay] = useState<(PlanDay & { format?: string }) | null>(null);
  const [equipment, setEquipment] = useState<string[]>([]);
  const [profile, setProfile] = useState<{ experience_level: string } | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  // Open session state
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [exName, setExName] = useState("");
  const [exSets, setExSets] = useState(3);
  const [exReps, setExReps] = useState("8-12");
  const [exRest, setExRest] = useState(60);

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

  // ── Open session handlers ────────────────────────────────────────────────────

  const addExercise = () => {
    if (!exName.trim()) return;
    setExercises((prev) => [...prev, { name: exName.trim(), sets: exSets, rep_range: exReps, rest_seconds: exRest, coaching_note: "" }]);
    setExName(""); setExSets(3); setExReps("8-12"); setExRest(60);
  };

  const startOpenSession = async () => {
    if (exercises.length === 0) { setError("Add at least one exercise first."); return; }
    setMode("starting");
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { router.push("/login"); return; }
    const { data: ws, error: err } = await supabase
      .from("workout_sessions")
      .insert({ user_id: session.user.id, plan_day: "Open Session", exercises_data: exercises, session_type: "free", free_format: "Open" })
      .select().single();
    if (err || !ws) { setError("Failed to start. Try again."); setMode("open"); return; }
    router.push(`/workout/${ws.id}`);
  };

  // ── Format-based handlers ────────────────────────────────────────────────────

  const generate = async () => {
    if (!format) return;
    setMode("generating");
    setError("");
    const res = await fetch("/api/generate-free-session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ format, equipment, experience_level: profile?.experience_level ?? "intermediate", duration_minutes: duration }),
    });
    if (!res.ok) { setError("Could not generate workout. Try again."); setMode("format-options"); return; }
    setGeneratedDay(await res.json());
    setMode("preview");
  };

  const startFormatSession = async () => {
    if (!generatedDay || mode === "starting") return;
    setMode("starting");
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { router.push("/login"); return; }
    const { data: ws, error: err } = await supabase
      .from("workout_sessions")
      .insert({ user_id: session.user.id, plan_day: generatedDay.day_name, muscle_focus: generatedDay.muscle_focus, exercises_data: generatedDay.exercises, session_type: "free", free_format: generatedDay.format ?? format })
      .select().single();
    if (err || !ws) { setError("Failed to start. Try again."); setMode("preview"); return; }
    router.push(`/workout/${ws.id}`);
  };

  if (loading) return <main className="mx-auto max-w-lg px-4 py-8"><p className="text-gray-400 animate-pulse">Loading…</p></main>;

  return (
    <main className="mx-auto max-w-lg px-4 py-8">
      <Link href="/dashboard" className="mb-6 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-300">
        ← Dashboard
      </Link>

      {/* ── Pick mode ──────────────────────────────────────────────────────────── */}
      {mode === "pick" && (
        <>
          <div className="mb-6">
            <h1 className="text-2xl font-bold">Free Session</h1>
            <p className="text-sm text-gray-400 mt-1">Log as you go or let AI build a workout in a specific format.</p>
          </div>

          <div className="space-y-3">
            {/* Open session */}
            <button
              onClick={() => setMode("open")}
              className="w-full rounded-xl border border-gray-700 bg-gray-900 p-4 text-left hover:border-orange-500 transition-colors"
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">📋</span>
                <div>
                  <p className="font-bold">Open Session</p>
                  <p className="text-xs text-gray-500 mt-0.5">Show up and log as you go — add exercises one by one</p>
                </div>
              </div>
            </button>

            {/* Divider */}
            <div className="flex items-center gap-3 py-1">
              <div className="flex-1 h-px bg-gray-800" />
              <p className="text-xs text-gray-600 uppercase tracking-wider">or AI-generated format</p>
              <div className="flex-1 h-px bg-gray-800" />
            </div>

            {/* Format options */}
            {AI_FORMATS.map((f) => (
              <button
                key={f.id}
                onClick={() => { setFormat(f.id); setMode("format-options"); }}
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

      {/* ── Open session: manual exercise builder ──────────────────────────────── */}
      {(mode === "open" || mode === "starting") && (
        <>
          <div className="mb-6 flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold">Open Session</h1>
              <p className="text-sm text-gray-400 mt-1">Add exercises as you go.</p>
            </div>
            <button onClick={() => setMode("pick")} className="text-sm text-orange-400 hover:underline mt-1">← Back</button>
          </div>

          <Card className="mb-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-4">Add Exercise</p>
            <div className="space-y-4">
              <input
                type="text" placeholder="e.g. Cable Crossover" value={exName}
                onChange={(e) => setExName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addExercise()}
                className="w-full rounded-xl border border-gray-600 bg-gray-800 px-4 py-3 text-white placeholder-gray-600 focus:border-orange-500 focus:outline-none"
              />
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-500 mb-2 block">Sets</label>
                  <div className="flex items-center gap-2">
                    <StepBtn onClick={() => setExSets((s) => Math.max(1, s - 1))}>−</StepBtn>
                    <span className="flex-1 text-center font-bold">{exSets}</span>
                    <StepBtn onClick={() => setExSets((s) => s + 1)}>+</StepBtn>
                  </div>
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Rep range</label>
                  <input type="text" value={exReps} onChange={(e) => setExReps(e.target.value)}
                    className="w-full rounded-xl border border-gray-600 bg-gray-800 px-3 py-2.5 text-white text-center focus:border-orange-500 focus:outline-none" />
                </div>
              </div>
              <button onClick={addExercise} disabled={!exName.trim()}
                className="w-full rounded-xl border border-dashed border-orange-500/50 py-3 text-sm font-semibold text-orange-400 hover:bg-orange-500/10 disabled:opacity-40 transition-colors">
                + Add to Session
              </button>
            </div>
          </Card>

          {exercises.length > 0 && (
            <div className="space-y-2 mb-6">
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">
                Session — {exercises.length} exercise{exercises.length !== 1 ? "s" : ""}
              </p>
              {exercises.map((ex, i) => (
                <div key={i} className="flex items-center gap-3 rounded-xl border border-gray-700 bg-gray-900 px-4 py-3">
                  <div className="flex-1">
                    <p className="font-semibold text-sm">{ex.name}</p>
                    <p className="text-xs text-gray-500">{ex.sets} sets · {ex.rep_range} reps · {ex.rest_seconds}s rest</p>
                  </div>
                  <button onClick={() => setExercises((p) => p.filter((_, idx) => idx !== i))}
                    className="text-gray-600 hover:text-red-400 transition-colors text-lg">✕</button>
                </div>
              ))}
            </div>
          )}

          {error && <p className="text-sm text-red-400 mb-4">{error}</p>}

          <Button onClick={startOpenSession} loading={mode === "starting"} className="w-full text-lg py-4">
            Start Session 💪
          </Button>
        </>
      )}

      {/* ── Format options ─────────────────────────────────────────────────────── */}
      {(mode === "format-options" || mode === "generating") && format && (
        <>
          <div className="mb-6 flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold">
                {AI_FORMATS.find((f) => f.id === format)?.emoji}{" "}
                {AI_FORMATS.find((f) => f.id === format)?.label}
              </h1>
              <p className="text-sm text-gray-400 mt-1">{AI_FORMATS.find((f) => f.id === format)?.description}</p>
            </div>
            <button onClick={() => setMode("pick")} className="text-sm text-orange-400 hover:underline mt-1">Change</button>
          </div>

          {format !== "Hyrox" && (
            <div className="mb-6">
              <p className="text-sm font-medium text-gray-300 mb-3">⏱ How long?</p>
              <div className="grid grid-cols-4 gap-2">
                {DURATIONS.map((d) => (
                  <button key={d.value} onClick={() => setDuration(d.value)}
                    className={`rounded-xl border p-3 text-center transition-colors ${
                      duration === d.value ? "border-orange-500 bg-orange-500/10 text-white" : "border-gray-700 bg-gray-900 text-gray-400 hover:border-gray-500"
                    }`}>
                    <p className="font-bold text-sm">{d.label}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {error && <p className="text-sm text-red-400 mb-4">{error}</p>}

          <Button onClick={generate} loading={mode === "generating"} className="w-full text-lg py-4">
            {mode === "generating" ? "Building your workout…" : "Generate Workout"}
          </Button>
        </>
      )}

      {/* ── Preview ────────────────────────────────────────────────────────────── */}
      {(mode === "preview" || mode === "starting") && generatedDay && (
        <>
          <div className="mb-6 flex items-start justify-between">
            <div>
              <span className="text-xs font-semibold bg-orange-500/20 text-orange-400 rounded-full px-2 py-0.5 mb-2 inline-block">
                {format}
              </span>
              <h1 className="text-2xl font-bold">{generatedDay.day_name}</h1>
              <p className="text-sm text-gray-400 mt-0.5">{generatedDay.muscle_focus}</p>
            </div>
            <button onClick={() => setMode("format-options")} className="text-sm text-orange-400 hover:underline mt-1">← Regenerate</button>
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
                    {ex.coaching_note && <p className="text-xs text-gray-500 mt-1 italic">{ex.coaching_note}</p>}
                  </div>
                  <span className="shrink-0 text-xs text-gray-600 font-mono pt-0.5">#{i + 1}</span>
                </div>
              </Card>
            ))}
          </div>

          <Button onClick={startFormatSession} loading={mode === "starting"} className="w-full text-lg py-4">
            Start Session 💪
          </Button>
        </>
      )}
    </main>
  );
}

function StepBtn({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick}
      className="flex h-9 w-9 items-center justify-center rounded-xl border border-gray-700 bg-gray-800 text-lg font-bold text-white hover:bg-gray-700 transition-colors">
      {children}
    </button>
  );
}
