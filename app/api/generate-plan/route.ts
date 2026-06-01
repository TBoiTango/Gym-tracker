export const maxDuration = 60; // seconds — overrides Vercel's default 10s limit

// POST /api/generate-plan
// Receives equipment, experience, goal, split type, duration, and cardio preference.
// Sends a structured prompt to Claude and returns PlanData JSON.
import { NextRequest, NextResponse } from "next/server";
import { askClaude, extractJSON } from "@/lib/claude";
import type { GeneratePlanRequest, PlanData } from "@/types";

interface ExtendedRequest extends GeneratePlanRequest {
  workout_duration?: number;
  include_cardio?: boolean;
}

export async function POST(req: NextRequest) {
  try {
    const body: ExtendedRequest = await req.json();
    const {
      equipment,
      experience_level,
      goal,
      split_type,
      workout_duration = 60,
      include_cardio = false,
    } = body;

    if (!equipment?.length || !experience_level || !goal || !split_type) {
      return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
    }

    const equipmentList = equipment.join(", ");

    // Duration-specific instructions — shorter sessions use compound movements only
    const durationGuidance = getDurationGuidance(workout_duration);

    const cardioGuidance = include_cardio
      ? `After the lifting exercises, add ONE cardio finisher exercise per day (e.g. "Treadmill Intervals", "Rowing Machine", "Jump Rope", "Battle Ropes", "Stationary Bike Sprints"). Set sets to 1, rep_range to the duration (e.g. "10 min"), rest_seconds to 0, and write a coaching note. Choose cardio that suits the day's muscle focus.`
      : `Do NOT include any cardio exercises. Weights/resistance training only.`;

    const prompt = `You are an expert strength and conditioning coach. Generate a detailed workout plan for a user with the following profile:

- Available equipment: ${equipmentList}
- Experience level: ${experience_level}
- Primary goal: ${goal}
- Requested split: ${getSplitDescription(split_type)}
- Workout duration: ${workout_duration} minutes per session
- Cardio: ${include_cardio ? "Yes — include a cardio finisher at the end of each session" : "No cardio"}

Duration rules (STRICTLY follow these based on the ${workout_duration}-minute session):
${durationGuidance}

Cardio rules:
${cardioGuidance}

General rules:
1. Only include exercises that can be done with the listed equipment.
2. Tailor rep ranges and rest times to the goal: strength (3-6 reps, 2-4 min rest), hypertrophy (8-15 reps, 60-90s rest), endurance (15-25 reps, 30-60s rest).
3. Scale volume and intensity to the experience level.
4. Write coaching notes that are practical and motivating — one sentence each.
5. Return ONLY valid JSON — no markdown, no explanation, no code fences.
6. NEVER repeat the same exercise on more than one training day. Every day must have a completely unique set of exercises — no overlap whatsoever across days.
7. For cardio finishers, choose a DIFFERENT cardio exercise for each day — do not use the same cardio exercise on multiple days. Rotate through options like Treadmill Intervals, Rowing Machine, Stationary Bike Sprints, Jump Rope, Battle Ropes, Stair Climber, Elliptical Intervals.

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
    const cleaned = extractJSON(raw);

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

function getDurationGuidance(minutes: number): string {
  if (minutes <= 30) {
    return `- 30 minute session: Use ONLY big compound movements (squat, deadlift, bench, row, press, pull-up). Maximum 3-4 exercises per day. Keep rest periods short (60s). No isolation exercises (no curls, lateral raises, etc.). Every minute counts — choose movements that work multiple muscle groups.`;
  } else if (minutes <= 45) {
    return `- 45 minute session: Focus on 4-5 exercises. Lead with 2-3 compound movements, then add 1-2 isolation exercises if time allows. Keep rest periods moderate (60-90s).`;
  } else if (minutes <= 60) {
    return `- 60 minute session: Include 5-6 exercises. Mix compound and isolation movements. Standard rest periods as per the goal.`;
  } else {
    return `- 90 minute session: Full volume training with 6-8 exercises. Include compounds, isolation work, and accessories. Full rest periods. Can include warm-up sets and drop sets.`;
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
