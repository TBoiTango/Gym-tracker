// POST /api/generate-plan
// Receives equipment, experience, goal, and split type.
// Sends a structured prompt to Claude and returns PlanData JSON.
import { NextRequest, NextResponse } from "next/server";
import { askClaude } from "@/lib/claude";
import type { GeneratePlanRequest, PlanData } from "@/types";

export async function POST(req: NextRequest) {
  try {
    const body: GeneratePlanRequest = await req.json();
    const { equipment, experience_level, goal, split_type } = body;

    if (!equipment?.length || !experience_level || !goal || !split_type) {
      return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
    }

    const equipmentList = equipment.join(", ");

    // The prompt is carefully structured to guarantee JSON output.
    // To add a new split type in the future, just describe it here.
    const prompt = `You are an expert strength and conditioning coach. Generate a detailed workout plan for a user with the following profile:

- Available equipment: ${equipmentList}
- Experience level: ${experience_level}
- Primary goal: ${goal}
- Requested split: ${getSplitDescription(split_type)}

Rules:
1. Only include exercises that can be done with the listed equipment.
2. Tailor rep ranges and rest times to the goal: strength (3-6 reps, 2-4 min rest), hypertrophy (8-15 reps, 60-90s rest), endurance (15-25 reps, 30-60s rest).
3. Scale volume and intensity to the experience level.
4. Write coaching notes that are practical and motivating — one sentence each.
5. Return ONLY valid JSON — no markdown, no explanation, no code fences.

Return this exact JSON shape:
{
  "split_explanation": "one sentence describing the split structure",
  "days": [
    {
      "day_name": "Push Day A",
      "muscle_focus": "Chest, Shoulders, Triceps",
      "exercises": [
        {
          "name": "Barbell Bench Press",
          "sets": 4,
          "rep_range": "6-8",
          "rest_seconds": 180,
          "coaching_note": "Keep your scapula retracted and drive your feet into the floor."
        }
      ]
    }
  ]
}`;

    const raw = await askClaude(prompt);

    // Strip any accidental markdown fences before parsing
    const cleaned = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();

    let planData: PlanData;
    try {
      planData = JSON.parse(cleaned);
    } catch {
      console.error("Claude returned non-JSON:", raw);
      return NextResponse.json(
        { error: "Claude returned an unexpected response. Please try again." },
        { status: 500 }
      );
    }

    return NextResponse.json(planData);
  } catch (err) {
    console.error("generate-plan error:", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}

function getSplitDescription(splitType: string): string {
  const descriptions: Record<string, string> = {
    ppl_3: "Push/Pull/Legs — 3 days per week (one cycle over 3 days)",
    ppl_6: "Push/Pull/Legs — 6 days per week (two full cycles per week: A and B variations)",
    upper_lower: "Upper/Lower — 4 days per week (Upper A, Lower A, Upper B, Lower B)",
    full_body: "Full Body — 3 days per week (non-consecutive days, e.g. Mon/Wed/Fri)",
    bro_split: "Bro Split — 5 days per week (Chest, Back, Shoulders, Arms, Legs)",
    ppl_ul: "PPL + Upper/Lower Hybrid — 5 days per week (Push, Pull, Legs, Upper, Lower)",
  };
  return descriptions[splitType] ?? splitType;
}
