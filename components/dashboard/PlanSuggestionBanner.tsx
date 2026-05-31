"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { PlanSuggestion } from "@/types";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";

export default function PlanSuggestionBanner({ suggestion }: { suggestion: PlanSuggestion }) {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState<"accept" | "reject" | null>(null);

  const accept = async () => {
    setLoading("accept");
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    // Deactivate current plan, insert new one
    await supabase
      .from("workout_plans")
      .update({ is_active: false })
      .eq("user_id", session.user.id);

    await supabase.from("workout_plans").insert({
      user_id: session.user.id,
      split_type: "custom",
      plan_data: suggestion.suggested_plan,
      is_active: true,
    });

    await supabase
      .from("plan_suggestions")
      .update({ accepted: true })
      .eq("id", suggestion.id);

    router.refresh();
  };

  const reject = async () => {
    setLoading("reject");
    await supabase
      .from("plan_suggestions")
      .update({ accepted: false })
      .eq("id", suggestion.id);
    router.refresh();
  };

  return (
    <Card className="border-purple-500/30 bg-purple-500/5">
      <p className="font-semibold text-purple-300">New variation ready ✨</p>
      <p className="text-sm text-gray-400 mt-1">{suggestion.reason}</p>
      {(suggestion.suggested_plan as { changes?: string[] }).changes?.length && (
        <ul className="mt-2 space-y-1">
          {((suggestion.suggested_plan as { changes?: string[] }).changes ?? []).map((c, i) => (
            <li key={i} className="text-xs text-gray-500">• {c}</li>
          ))}
        </ul>
      )}
      <div className="mt-4 flex gap-3">
        <Button onClick={accept} loading={loading === "accept"} className="flex-1">
          Accept
        </Button>
        <Button
          onClick={reject}
          loading={loading === "reject"}
          variant="ghost"
          className="flex-1"
        >
          Dismiss
        </Button>
      </div>
    </Card>
  );
}
