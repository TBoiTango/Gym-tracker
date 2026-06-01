// Setup wizard — step 2: Gym + equipment selection.
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { EQUIPMENT_OPTIONS } from "@/types";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";

export default function SetupGymPage() {
  const router = useRouter();
  const supabase = createClient();
  const [gymName, setGymName] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handleSave = async () => {
    if (!gymName.trim()) { setError("Please enter your gym name."); return; }
    if (selected.size === 0) { setError("Please select at least one piece of equipment."); return; }
    setLoading(true);
    setError("");

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { router.push("/login"); return; }

    // Upsert gym by name (handles duplicate gym names gracefully)
    const { data: gym, error: gymError } = await supabase
      .from("gyms")
      .upsert({ name: gymName.trim() }, { onConflict: "name", ignoreDuplicates: false })
      .select()
      .single();

    if (gymError) {
      // Fallback: try to fetch existing gym with that name
      const { data: existing } = await supabase
        .from("gyms")
        .select("id")
        .eq("name", gymName.trim())
        .single();
      if (!existing) { setError(gymError.message); setLoading(false); return; }
      // Use the existing gym id
      const { error: linkError2 } = await supabase
        .from("user_gyms")
        .upsert({ user_id: session.user.id, gym_id: existing.id, equipment_list: Array.from(selected) });
      if (linkError2) { setError(linkError2.message); setLoading(false); return; }
      router.push("/setup/plan");
      return;
    }

    const { error: linkError } = await supabase
      .from("user_gyms")
      .upsert({
        user_id: session.user.id,
        gym_id: gym.id,
        equipment_list: Array.from(selected),
      });

    if (linkError) { setError(linkError.message); setLoading(false); return; }

    router.push("/setup/plan");
  };

  return (
    <main className="mx-auto max-w-lg px-4 py-10">
      <div className="mb-8">
        <p className="text-sm font-medium text-orange-400">Step 2 of 3</p>
        <h1 className="mt-1 text-2xl font-bold">Your gym &amp; equipment</h1>
        <p className="mt-2 text-gray-400 text-sm">This helps the AI build a plan with gear you actually have.</p>
      </div>

      <div className="space-y-6">
        <Input
          label="Gym name"
          value={gymName}
          onChange={(e) => setGymName(e.target.value)}
          placeholder="e.g. PureGym Manchester"
        />

        <div>
          <p className="mb-3 text-sm font-medium text-gray-300">Available equipment</p>
          <div className="grid grid-cols-2 gap-2">
            {EQUIPMENT_OPTIONS.map((eq) => (
              <button
                key={eq.id}
                type="button"
                onClick={() => toggle(eq.id)}
                className={`rounded-xl border px-4 py-3 text-sm font-medium text-left transition-colors ${
                  selected.has(eq.id)
                    ? "border-orange-500 bg-orange-500/10 text-white"
                    : "border-gray-700 bg-gray-900 text-gray-300 hover:border-gray-500"
                }`}
              >
                {eq.label}
              </button>
            ))}
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
