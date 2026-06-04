// Settings page — edit profile, workout preferences, and regenerate plan.
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { ExperienceLevel, Goal } from "@/types";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Link from "next/link";

type Option<T> = { value: T; label: string; description: string };

const GOALS: Option<Goal>[] = [
  { value: "strength", label: "Strength", description: "Heavier weights, lower reps" },
  { value: "hypertrophy", label: "Hypertrophy", description: "Build muscle size" },
  { value: "endurance", label: "Endurance", description: "Lighter weight, high reps" },
];

const LEVELS: Option<ExperienceLevel>[] = [
  { value: "beginner", label: "Beginner", description: "Less than 1 year lifting" },
  { value: "intermediate", label: "Intermediate", description: "1–3 years lifting" },
  { value: "advanced", label: "Advanced", description: "3+ years lifting" },
];

const DURATIONS = [
  { value: 30, label: "30 min" },
  { value: 45, label: "45 min" },
  { value: 60, label: "60 min" },
  { value: 90, label: "90 min" },
];

export default function SettingsPage() {
  const router = useRouter();
  const supabase = createClient();

  const [name, setName] = useState("");
  const [goal, setGoal] = useState<Goal>("hypertrophy");
  const [level, setLevel] = useState<ExperienceLevel>("beginner");
  const [duration, setDuration] = useState(60);
  const [includeCardio, setIncludeCardio] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  // Load existing profile on mount
  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push("/login"); return; }

      const { data } = await supabase
        .from("profiles")
        .select("name, goal, experience_level, workout_duration, include_cardio")
        .eq("user_id", session.user.id)
        .single();

      if (data) {
        setName(data.name ?? "");
        setGoal(data.goal ?? "hypertrophy");
        setLevel(data.experience_level ?? "beginner");
        setDuration(data.workout_duration ?? 60);
        setIncludeCardio(data.include_cardio ?? false);
      }
      setLoading(false);
    };
    load();
  }, []);

  const handleSave = async () => {
    if (!name.trim()) { setError("Please enter your name."); return; }
    setSaving(true);
    setError("");
    setSaved(false);

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { router.push("/login"); return; }

    const { error } = await supabase
      .from("profiles")
      .update({
        name: name.trim(),
        goal,
        experience_level: level,
        workout_duration: duration,
        include_cardio: includeCardio,
      })
      .eq("user_id", session.user.id);

    if (error) { setError(error.message); setSaving(false); return; }

    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  if (loading) {
    return (
      <main className="mx-auto max-w-lg px-4 py-10">
        <p className="text-gray-400">Loading…</p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-lg px-4 py-8">
      <Link href="/dashboard" className="mb-6 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-300">
        ← Dashboard
      </Link>

      <h1 className="text-2xl font-bold mb-8">Settings</h1>

      <div className="space-y-6">
        <Input
          label="Your name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Alex"
        />

        {/* Goal */}
        <div>
          <p className="mb-3 text-sm font-medium text-gray-300">Your main goal</p>
          <div className="space-y-2">
            {GOALS.map((g) => (
              <SelectCard
                key={g.value}
                selected={goal === g.value}
                onClick={() => setGoal(g.value)}
                label={g.label}
                description={g.description}
              />
            ))}
          </div>
        </div>

        {/* Experience */}
        <div>
          <p className="mb-3 text-sm font-medium text-gray-300">Experience level</p>
          <div className="space-y-2">
            {LEVELS.map((l) => (
              <SelectCard
                key={l.value}
                selected={level === l.value}
                onClick={() => setLevel(l.value)}
                label={l.label}
                description={l.description}
              />
            ))}
          </div>
        </div>

        {/* Duration */}
        <div>
          <p className="mb-3 text-sm font-medium text-gray-300">Workout duration</p>
          <div className="grid grid-cols-4 gap-2">
            {DURATIONS.map((d) => (
              <button
                key={d.value}
                type="button"
                onClick={() => setDuration(d.value)}
                className={`rounded-xl border py-3 text-sm font-semibold transition-colors ${
                  duration === d.value
                    ? "border-orange-500 bg-orange-500/10 text-white"
                    : "border-gray-700 bg-gray-900 text-gray-300 hover:border-gray-500"
                }`}
              >
                {d.label}
              </button>
            ))}
          </div>
        </div>

        {/* Cardio */}
        <div>
          <p className="mb-3 text-sm font-medium text-gray-300">Cardio finisher</p>
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
              <p className="font-semibold">Yes 🏃</p>
              <p className="text-xs opacity-70 mt-0.5">Add cardio at the end</p>
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
              <p className="font-semibold">No 🏋️</p>
              <p className="text-xs opacity-70 mt-0.5">Weights only</p>
            </button>
          </div>
        </div>

        {error && <p className="text-sm text-red-400">{error}</p>}
        {saved && <p className="text-sm text-green-400">✓ Settings saved!</p>}

        <Button onClick={handleSave} loading={saving} className="w-full">
          Save Changes
        </Button>

        {/* Regenerate plan with new settings */}
        <div className="border-t border-gray-800 pt-6">
          <p className="text-sm text-gray-400 mb-3">
            Changed your goal or duration? Regenerate your plan to match your new preferences.
          </p>
          <Link
            href="/setup/plan?regenerate=true"
            className="block w-full rounded-xl border border-orange-500 py-3 text-center text-sm font-semibold text-orange-400 hover:bg-orange-500/10 transition-colors"
          >
            Regenerate Workout Plan 🤖
          </Link>
        </div>
      </div>
    </main>
  );
}

function SelectCard({ selected, onClick, label, description }: {
  selected: boolean; onClick: () => void; label: string; description: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full rounded-xl border p-4 text-left transition-colors ${
        selected
          ? "border-orange-500 bg-orange-500/10 text-white"
          : "border-gray-700 bg-gray-900 text-gray-300 hover:border-gray-500"
      }`}
    >
      <p className="font-semibold">{label}</p>
      <p className="mt-0.5 text-sm opacity-70">{description}</p>
    </button>
  );
}
