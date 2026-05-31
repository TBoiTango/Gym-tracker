// AI variation suggestion page — triggered after 4 weeks on a plan.
// Fetches the last 4 weeks of logs and asks Claude for a variation.
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { PlanData, SuggestVariationResponse } from "@/types";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Link from "next/link";

export default function SuggestVariationPage() {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SuggestVariationResponse | null>(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const generate = async () => {
    setLoading(true);
    setError("");

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { router.push("/login"); return; }

    // Load current plan + profile
    const [planRes, profileRes] = await Promise.all([
      supabase
        .from("workout_plans")
        .select("plan_data")
        .eq("user_id", session.user.id)
        .eq("is_active", true)
        .single(),
      supabase
        .from("profiles")
        .select("experience_level, goal")
        .eq("user_id", session.user.id)
        .single(),
    ]);

    // Last 4 weeks of exercise logs via sessions
    const fourWeeksAgo = new Date(Date.now() - 28 * 24 * 60 * 60 * 1000).toISOString();
    const { data: recentSessions } = await supabase
      .from("workout_sessions")
      .select("id")
      .eq("user_id", session.user.id)
      .gte("started_at", fourWeeksAgo);

    const sessionIds = (recentSessions ?? []).map((s) => s.id);

    const { data: recentLogs } = sessionIds.length
      ? await supabase.from("exercise_logs").select("*").in("session_id", sessionIds)
      : { data: [] };

    const res = await fetch("/api/suggest-variation", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        current_plan: planRes.data?.plan_data,
        recent_logs: recentLogs ?? [],
        experience_level: profileRes.data?.experience_level ?? "beginner",
        goal: profileRes.data?.goal ?? "hypertrophy",
      }),
    });

    if (!res.ok) {
      setError("Failed to generate variation. Please try again.");
      setLoading(false);
      return;
    }

    const data: SuggestVariationResponse = await res.json();
    setResult(data);
    setLoading(false);

    // Save the suggestion to DB
    await supabase.from("plan_suggestions").insert({
      user_id: session.user.id,
      suggested_plan: data.suggested_plan,
      reason: data.reason,
    });
  };

  const accept = async () => {
    if (!result) return;
    setSaving(true);

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    await supabase
      .from("workout_plans")
      .update({ is_active: false })
      .eq("user_id", session.user.id);

    await supabase.from("workout_plans").insert({
      user_id: session.user.id,
      split_type: "custom",
      plan_data: result.suggested_plan,
      is_active: true,
    });

    router.push("/dashboard");
  };

  return (
    <main className="mx-auto max-w-lg px-4 py-8">
      <Link href="/dashboard" className="mb-6 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-300">
        ← Dashboard
      </Link>

      <h1 className="text-2xl font-bold mb-2">4-Week Variation</h1>
      <p className="text-sm text-gray-400 mb-8">
        Claude will review your last 4 weeks and suggest 1-2 exercise swaps to keep progress moving.
      </p>

      {!result && (
        <>
          {error && <p className="mb-4 text-sm text-red-400">{error}</p>}
          <Button onClick={generate} loading={loading} className="w-full">
            {loading ? "Analysing your training…" : "Generate Variation 🤖"}
          </Button>
        </>
      )}

      {result && (
        <div className="space-y-4">
          <Card>
            <p className="text-sm font-semibold text-purple-300 mb-2">What Claude suggests</p>
            <p className="text-sm text-gray-300">{result.reason}</p>
            {result.changes?.length > 0 && (
              <ul className="mt-3 space-y-1">
                {result.changes.map((c, i) => (
                  <li key={i} className="text-xs text-gray-500">• {c}</li>
                ))}
              </ul>
            )}
          </Card>

          <div className="flex gap-3">
            <Button onClick={accept} loading={saving} className="flex-1">
              Accept Plan
            </Button>
            <Button onClick={() => router.push("/dashboard")} variant="ghost" className="flex-1">
              Keep Current
            </Button>
          </div>
        </div>
      )}
    </main>
  );
}
