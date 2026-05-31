// POST /api/suggest-variation
// Receives the user's current plan + last 4 weeks of exercise logs.
// Claude returns a slightly modified plan with 1-2 exercise swaps and an explanation.
import { NextRequest, NextResponse } from "next/server";
import { askClaude } from "@/lib/claude";
import type { SuggestVariationRequest, SuggestVariationResponse } from "@/types";

export async function POST(req: NextRequest) {
  try {
    const body: SuggestVariationRequest = await req.json();
    const { current_plan, recent_logs, experience_level, goal } = body;

    if (!current_plan || !recent_logs) {
      return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
    }

    // Summarise volume per exercise so the prompt isn't too long
    const volumeSummary = summariseLogs(recent_logs);

    const prompt = `You are a strength coach reviewing a client's last 4 weeks of training.

Current plan:
${JSON.stringify(current_plan, null, 2)}

Training summary (last 4 weeks — exercise → total sets logged):
${volumeSummary}

Client profile: ${experience_level} lifter, goal: ${goal}.

Task: suggest a small variation to prevent staleness and drive continued progress. Swap 1-2 exercises across any days. Keep everything else identical.

Rules:
- Only swap exercises — do not change the split structure or number of days.
- Use the same or similar equipment as the exercises you replace.
- Explain WHY each swap helps (progressive variation, muscle angle, staleness prevention).
- Return ONLY valid JSON — no markdown, no explanation outside the JSON.

Return this exact shape:
{
  "suggested_plan": { /* full plan_data object, same structure as input */ },
  "reason": "One paragraph explaining the overall approach to this variation.",
  "changes": [
    "Replaced X with Y on Day Z because …"
  ]
}`;

    const raw = await askClaude(prompt);
    const cleaned = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();

    let result: SuggestVariationResponse;
    try {
      result = JSON.parse(cleaned);
    } catch {
      console.error("Claude returned non-JSON:", raw);
      return NextResponse.json(
        { error: "Claude returned an unexpected response. Please try again." },
        { status: 500 }
      );
    }

    return NextResponse.json(result);
  } catch (err) {
    console.error("suggest-variation error:", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}

function summariseLogs(logs: SuggestVariationRequest["recent_logs"]): string {
  const totals: Record<string, number> = {};
  for (const log of logs) {
    totals[log.exercise_name] = (totals[log.exercise_name] ?? 0) + log.sets_completed;
  }
  return Object.entries(totals)
    .map(([name, sets]) => `  ${name}: ${sets} sets`)
    .join("\n");
}
