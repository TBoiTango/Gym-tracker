// POST /api/generate-day
// Generates a single day's workout on the fly based on:
// - Which muscle group day it is (e.g. "Push Day", "Legs")
// - Equipment available
// - Experience level + goal
// - Today's available time
// - Whether to include cardio and/or core
import { NextRequest, NextResponse } from "next/server";
import { askClaude } from "@/lib/claude";
import type { PlanDay } from "@/types";

export interface GenerateDayRequest {
  day_name: string;
  muscle_focus: string;
  equipment: string[];
  experience_level: string;
  goal: string;
  duration_minutes: number;
  include_cardio: boolean;
  include_core: boolean;
}

export async function POST(req: NextRequest) {
  try {
    const body: GenerateDayRequest = await req.json();
    const {
      day_name,
      muscle_focus,
      equipment,
      experience_level,
      goal,
      duration_minutes,
      include_cardio,
      include_core,
    } = body;

    const equipmentList = equipment.join(", ");
    const durationGuidance = getDurationGuidance(duration_minutes);

    const cardioSection = include_cardio
      ? `After the main lifting exercises, add ONE cardio finisher (e.g. "Treadmill Intervals", "Rowing Machine", "Jump Rope", "Battle Ropes", "Stationary Bike Sprints"). Set sets to 1, rep_range to a duration like "8 min", rest_seconds to 0.`
      : `No cardio — weights only.`;

    const coreSection = include_core
      ? `After the main lifting exercises (before cardio if included), add 2 core exercises (e.g. "Plank", "Dead Bug", "Ab Wheel Rollout", "Hanging Leg Raise", "Cable Crunch"). Choose based on available equipment.`
      : `No dedicated core exercises.`;

    const prompt = `You are an expert strength and conditioning coach. Generate a single workout session for today.

Today's session details:
- Day type: ${day_name} (${muscle_focus})
- Available equipment: ${equipmentList}
- Experience level: ${experience_level}
- Goal: ${goal}
- Time available: ${duration_minutes} minutes
- Cardio finisher: ${include_cardio ? "Yes" : "No"}
- Core work: ${include_core ? "Yes" : "No"}

Duration rules (STRICTLY follow for a ${duration_minutes}-minute session):
${durationGuidance}

Cardio rules: ${cardioSection}

Core rules: ${coreSection}

General rules:
1. Only use exercises possible with the listed equipment.
2. Tailor rep ranges and rest to the goal: strength (3-6 reps, 75-90s rest), hypertrophy (8-15 reps, 60-75s rest), endurance (15-25 reps, 30-45s rest). MAXIMUM rest_seconds is 90 — never exceed this.
3. Scale intensity to experience level.
4. Coaching notes: practical, one sentence each.
5. Return ONLY valid JSON — no markdown, no explanation, no code fences.

Return exactly this JSON shape (a single day object):
{
  "day_name": "${day_name}",
  "muscle_focus": "${muscle_focus}",
  "exercises": [
    {
      "name": "Barbell Bench Press",
      "sets": 4,
      "rep_range": "8-10",
      "rest_seconds": 90,
      "coaching_note": "Keep your shoulder blades pinched and lower the bar with control."
    }
  ]
}`;

    const raw = await askClaude(prompt);
    const cleaned = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();

    let dayData: PlanDay;
    try {
      dayData = JSON.parse(cleaned);
    } catch {
      console.error("Claude returned non-JSON:", raw);
      return NextResponse.json(
        { error: "Claude returned an unexpected response. Please try again." },
        { status: 500 }
      );
    }

    return NextResponse.json(dayData);
  } catch (err) {
    console.error("generate-day error:", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}

function getDurationGuidance(minutes: number): string {
  if (minutes <= 30) {
    return `30 minutes: 3-4 exercises MAX. Compound movements only (squat, deadlift, bench, row, press, pull-up). No isolation exercises whatsoever. Short rest (45-60s). Every exercise must work multiple muscle groups.`;
  } else if (minutes <= 45) {
    return `45 minutes: 4-5 exercises. Lead with 2-3 compounds, add 1-2 isolation moves. Rest 60-90s.`;
  } else if (minutes <= 60) {
    return `60 minutes: 5-6 exercises. Good mix of compound and isolation work. Standard rest periods.`;
  } else {
    return `90 minutes: 6-8 exercises. Full volume — compounds, isolation, and accessories. Full rest periods. Can include warm-up variations.`;
  }
}
