"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import Card from "@/components/ui/Card";

interface Tip {
  icon: string;
  title: string;
  body: string;
}

interface Stretch {
  name: string;
  duration: string;
  note: string;
}

interface RestDayContent {
  headline: string;
  why_it_matters: string;
  tips: Tip[];
  stretches: Stretch[];
  tomorrow_preview: string;
}

export default function RestDayPage() {
  const router = useRouter();
  const supabase = createClient();

  const [content, setContent] = useState<RestDayContent | null>(null);
  const [loading, setLoading] = useState(true);
  const [logging, setLogging] = useState(false);
  const [logged, setLogged] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push("/login"); return; }

      // Find last completed workout session for context
      const { data: lastSession } = await supabase
        .from("workout_sessions")
        .select("plan_day, exercises_data")
        .eq("user_id", session.user.id)
        .not("completed_at", "is", null)
        .neq("session_type", "rest")
        .order("completed_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      // Check if today is already logged as rest
      const today = new Date().toISOString().slice(0, 10);
      const { data: todayRest } = await supabase
        .from("workout_sessions")
        .select("id")
        .eq("user_id", session.user.id)
        .eq("session_type", "rest")
        .gte("started_at", today)
        .maybeSingle();

      if (todayRest) setLogged(true);

      // Fetch AI tips
      try {
        const res = await fetch("/api/rest-day-tips", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            lastMuscleFocus: lastSession?.plan_day ?? "general strength",
            dayName: lastSession?.plan_day,
          }),
        });
        if (res.ok) setContent(await res.json());
      } catch {}

      setLoading(false);
    })();
  }, []);

  const logRestDay = async () => {
    setLogging(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    await supabase.from("workout_sessions").insert({
      user_id: session.user.id,
      plan_day: "Rest Day",
      session_type: "rest",
      started_at: new Date().toISOString(),
      completed_at: new Date().toISOString(),
    });

    setLogged(true);
    setLogging(false);
  };

  return (
    <main className="mx-auto max-w-lg px-4 py-8">
      <Link href="/dashboard" className="mb-6 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-300">
        ← Dashboard
      </Link>

      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <span className="text-4xl">🌿</span>
          <h1 className="text-2xl font-bold">Rest Day</h1>
        </div>
        {loading ? (
          <div className="h-5 w-2/3 rounded bg-gray-800 animate-pulse" />
        ) : (
          <p className="text-gray-400 text-sm">{content?.headline}</p>
        )}
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 rounded-xl bg-gray-800 animate-pulse" />
          ))}
        </div>
      ) : content ? (
        <div className="space-y-6">
          {/* Why rest matters */}
          <Card>
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">Why today matters</p>
            <p className="text-sm text-gray-300 leading-relaxed">{content.why_it_matters}</p>
          </Card>

          {/* Recovery tips */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-3">Recovery tips</p>
            <div className="space-y-2">
              {content.tips.map((tip, i) => (
                <Card key={i} padding="sm">
                  <div className="flex gap-3">
                    <span className="text-2xl shrink-0">{tip.icon}</span>
                    <div>
                      <p className="font-semibold text-sm">{tip.title}</p>
                      <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">{tip.body}</p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>

          {/* Stretching routine */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-3">Light stretching · ~10 min</p>
            <div className="space-y-2">
              {content.stretches.map((stretch, i) => (
                <div key={i} className="rounded-xl border border-gray-700 bg-gray-900 p-4 flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-sm">{stretch.name}</p>
                    <p className="text-xs text-gray-500 italic mt-0.5">{stretch.note}</p>
                  </div>
                  <span className="shrink-0 text-xs font-semibold text-orange-400 bg-orange-500/10 rounded-full px-2 py-1">
                    {stretch.duration}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Tomorrow preview */}
          <div className="rounded-xl border border-gray-700 bg-gray-900/60 p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1">Looking ahead 👀</p>
            <p className="text-sm text-gray-300">{content.tomorrow_preview}</p>
          </div>
        </div>
      ) : (
        <p className="text-sm text-gray-500">Could not load recovery tips. Enjoy your rest!</p>
      )}

      {/* Log rest day button */}
      <div className="mt-8">
        {logged ? (
          <div className="rounded-xl border border-green-700/40 bg-green-900/10 py-4 text-center">
            <p className="text-green-400 font-semibold">✓ Rest day logged</p>
            <p className="text-xs text-gray-500 mt-1">Shows in your history</p>
          </div>
        ) : (
          <button
            onClick={logRestDay}
            disabled={logging}
            className="w-full rounded-xl border border-gray-700 bg-gray-900 py-4 text-sm font-semibold text-gray-300 hover:border-green-600 hover:text-green-400 disabled:opacity-50 transition-colors"
          >
            {logging ? "Logging…" : "Log Rest Day"}
          </button>
        )}
      </div>
    </main>
  );
}
