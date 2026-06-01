// Setup wizard — step 1: Profile (name, goal, experience, workout duration, cardio preference).
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { ExperienceLevel, Goal } from "@/types";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";

type Option<T> = { value: T; label: string; description: string };

const GOALS: Option<Goal>[] = [
  { value: "strength", label: "Strength", description: "Get stronger — heavier weights, lower reps" },
  { value: "hypertrophy", label: "Hypertrophy", description: "Build muscle size — moderate weight, higher reps" },
  { value: "endurance", label: "Endurance", description: "Improve stamina — lighter weight, high reps" },
];

const LEVELS: Option<ExperienceLevel>[] = [
  { value: "beginner", label: "Beginner", description: "Less than 1 year lifting" },
  { value: "intermediate", label: "Intermediate", description: "1–3 years lifting" },
  { value: "advanced", label: "Advanced", description: "3+ years lifting" },
];

const DURATIONS = [
  { value: 30, label: "30 min", description: "Short session — compounds only, maximum efficiency" },
  { value: 45, label: "45 min", description: "Medium session — compounds + a few isolation moves" },
  { value: 60, label: "60 min", description: "Full session — well-rounded training" },
  { value: 90, label: "90 min", description: "Long session — full volume with accessories" },
];

export default function SetupProfilePage() {
  const router = useRouter();
  const supabase = createClient();
  const [name, setName] = useState("");
  const [goal, setGoal] = useState<Goal>("hypertrophy");
  const [level, setLevel] = useState<ExperienceLevel>("beginner");
  const [duration, setDuration] = useState(60);
  const [includeCardio, setIncludeCardio] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSave = async () => {
    if (!name.trim()) { setError("Please enter your name."); return; }
    setLoading(true);
    setError("");

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { router.push("/login"); return; }

    const { error } = await supabase
      .from("profiles")
      .upsert({
        user_id: session.user.id,
        name: name.trim(),
        goal,
        experience_level: level,
        workout_duration: duration,
        include_cardio: includeCardio,
      });

    if (error) { setError(error.message); setLoading(false); return; }

    router.push("/setup/gym");
  };

  return (
    <main className="mx-auto max-w-lg px-4 py-10">
      <div className="mb-8">
        <p className="text-sm font-medium text-orange-400">Step 1 of 3</p>
        <h1 className="mt-1 text-2xl font-bold">Tell us about yourself</h1>
      </div>

      <div className="space-y-6">
        <Input
          label="Your name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Alex"
        />

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

        {/* Workout duration */}
        <div>
          <p className="mb-3 text-sm font-medium text-gray-300">How long is your typical workout?</p>
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
                <p className="font-semibold">{d.label}</p>
                <p className="mt-0.5 text-xs opacity-70">{d.description}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Cardio preference */}
        <div>
          <p className="mb-3 text-sm font-medium text-gray-300">Include cardio at the end of workouts?</p>
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
              <p className="font-semibold">Yes please 🏃</p>
              <p className="mt-0.5 text-xs opacity-70">Add a cardio finisher after lifting</p>
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
              <p className="font-semibold">No thanks 🏋️</p>
              <p className="mt-0.5 text-xs opacity-70">Weights only, no cardio</p>
            </button>
          </div>
        </div>

        {error && <p className="text-sm text-red-400">{error}</p>}

        <Button onClick={handleSave} loading={loading} className="w-full">
          Continue →
        </Button>
      </div>
    </main>
  );
}

function SelectCard({
  selected, onClick, label, description,
}: {
  selected: boolean;
  onClick: () => void;
  label: string;
  description: string;
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
