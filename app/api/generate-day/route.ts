export const maxDuration = 60; // seconds — overrides Vercel's default 10s limit

// POST /api/generate-day
// Generates a single day's workout on the fly based on:
// - Which muscle group day it is (e.g. "Push Day", "Legs")
// - Equipment available
// - Experience level + goal
// - Today's available time
// - Whether to include cardio (with intensity + type) and/or core
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
  cardio_intensity?: "easy" | "moderate" | "hard";
  cardio_type?: string;
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
      cardio_intensity = "moderate",
      cardio_type = "Any / AI Pick",
      include_core,
    } = body;

    const equipmentList = equipment.join(", ");
    const durationGuidance = getDurationGuidance(duration_minutes);

    const cardioSection = include_cardio
      ? `After the main lifting exercises, add ONE cardio finisher using this spec:
  - Equipment/type: ${cardio_type === "Any / AI Pick" ? "your choice — pick the best option available" : cardio_type}
  - Intensity: ${cardio_intensity}
  - ${getCardioGuidance(cardio_type, cardio_intensity)}
  - Set sets to 1, rest_seconds to 0.
  - For rep_range, use a specific descriptive string, e.g. "20 min @ 3 mph 10% incline" or "8 × 30s sprints / 30s walk".`
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
- Time available for lifting: ${duration_minutes} minutes
- Cardio finisher: ${include_cardio ? `Yes (${cardio_intensity} intensity, ${cardio_type})` : "No"}
- Core work: ${include_core ? "Yes" : "No"}

Duration rules (STRICTLY follow for a ${duration_minutes}-minute lifting session):
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

function getCardioGuidance(type: string, intensity: "easy" | "moderate" | "hard"): string {
  const guides: Record<string, Record<string, string>> = {
    "Treadmill": {
      easy:     "20-25 min @ 3.0-3.5 mph, 8-10% incline (incline walk)",
      moderate: "20 min alternating 2 min @ 4 mph / 1 min @ 6.5 mph",
      hard:     "10 × 30s sprints @ 9-10 mph with 30s walk recovery",
    },
    "Rowing Machine": {
      easy:     "20 min steady state @ comfortable pace (~22 spm)",
      moderate: "5 × 3 min hard efforts / 1 min easy, target <2:10/500m",
      hard:     "8 × 250m max effort with 60s rest between",
    },
    "Stair Stepper": {
      easy:     "20 min @ low resistance, steady pace",
      moderate: "15 min @ moderate pace, increase resistance every 5 min",
      hard:     "10 × 1 min max effort / 30s easy, high resistance",
    },
    "Stationary Bike": {
      easy:     "25 min @ easy pace, low resistance (Zone 2)",
      moderate: "20 min — 5 min warm up, 4 × 2 min hard / 2 min easy, 5 min cool down",
      hard:     "10 × 20s all-out sprint / 40s easy (Tabata-style)",
    },
    "Jump Rope": {
      easy:     "3 × 3 min continuous jumping with 1 min rest",
      moderate: "5 × 2 min with 30s rest — mix in double-unders",
      hard:     "10 × 1 min max speed with 20s rest",
    },
    "Elliptical": {
      easy:     "25 min steady state, moderate resistance",
      moderate: "20 min — increase resistance every 5 min",
      hard:     "8 × 1 min high resistance sprint / 1 min easy",
    },
    "Battle Ropes": {
      easy:     "5 × 30s waves with 60s rest",
      moderate: "8 × 30s alternating waves / 30s rest",
      hard:     "10 × 20s max effort / 40s rest — mix wave and slam patterns",
    },
  };

  const typeGuide = guides[type] ?? null;
  if (typeGuide) return typeGuide[intensity];

  // Fallback for "Any / AI Pick"
  const fallback: Record<string, string> = {
    easy:     "choose a low-intensity steady-state option, 20-25 min",
    moderate: "choose a moderate interval-based option, ~20 min",
    hard:     "choose a high-intensity interval option, ~15 min",
  };
  return fallback[intensity];
}
