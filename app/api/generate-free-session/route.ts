export const maxDuration = 60;

// POST /api/generate-free-session
// Generates a complete format-based free session workout.
// Formats: EMOM, AMRAP, Hyrox, CrossFit, ForTime, Tabata
import { NextRequest, NextResponse } from "next/server";
import { askClaude, extractJSON } from "@/lib/claude";
import type { PlanDay } from "@/types";

export type FreeSessionFormat = "EMOM" | "AMRAP" | "Hyrox" | "CrossFit" | "ForTime" | "Tabata";

const FORMAT_DESCRIPTIONS: Record<FreeSessionFormat, string> = {
  EMOM: "Every Minute On the Minute — at the start of each minute, complete the prescribed reps. Rest for whatever time remains in the minute.",
  AMRAP: "As Many Rounds As Possible — complete as many full rounds of the circuit as possible within the time cap.",
  Hyrox: "Hyrox-style race simulation — alternating 1km runs with functional fitness stations.",
  CrossFit: "CrossFit WOD — a high-intensity functional fitness workout combining gymnastics, weightlifting, and metabolic conditioning.",
  ForTime: "For Time — complete all reps as fast as possible. Record total time.",
  Tabata: "Tabata intervals — 20 seconds max effort, 10 seconds rest, 8 rounds per exercise.",
};

const FORMAT_STRUCTURE_RULES: Record<FreeSessionFormat, string> = {
  EMOM: `Structure as a multi-movement EMOM. Each exercise gets its own minute (or alternate every minute).
- sets = total minutes per exercise
- rep_range = "X reps" (achievable in ~30-40 seconds, leaving rest time)
- rest_seconds = 0 (rest is built into the minute structure)
- coaching_note = explain the minute scheme (e.g., "Minute 1: 10 reps, Minute 3: 10 reps")
- Include 3-5 exercises that together form the EMOM structure`,

  AMRAP: `Structure as a repeating circuit.
- sets = suggested target rounds for reference
- rep_range = reps per round for that exercise
- rest_seconds = 0 (no prescribed rest in AMRAP)
- Include 4-6 exercises that form one round of the circuit
- coaching_note = describe the AMRAP duration and pacing tip`,

  Hyrox: `Structure as a Hyrox-style race simulation.
- Must follow this exact sequence: SkiErg OR Row, Sled Push, Sled Pull, Burpee Broad Jumps, Rowing OR Bike, Farmers Carry, Sandbag Lunges, Wall Balls
- Substitute unavailable equipment with closest alternative (e.g., no sled → resistance band drag)
- rep_range = distance or reps (e.g., "200m", "50m", "100 reps")
- sets = 1 for each station
- Include a 1km run equivalent between each station as a separate exercise`,

  CrossFit: `Structure as an authentic CrossFit WOD. Choose one of: Chipper, Hero WOD format, Girl WOD format, or benchmark-style.
- Mix gymnastics (pull-ups, handstand push-ups, ring dips), weightlifting (clean, snatch, deadlift, thruster), and metabolic conditioning
- rep_range = reps per round or total reps
- coaching_note = describe the WOD type and scaling option`,

  ForTime: `Structure as a descending ladder, couplet, or chipper.
- Total volume should be completable in 10-25 minutes
- rep_range = total reps OR describe the ladder (e.g., "21-15-9")
- sets = 1 (done for time, not sets)
- rest_seconds = 0
- coaching_note = time cap and scaling suggestion`,

  Tabata: `Structure as Tabata intervals.
- 20 seconds on, 10 seconds off, 8 rounds = 4 minutes per exercise
- sets = 8 (rounds per exercise)
- rep_range = "Max reps in 20s"
- rest_seconds = 10
- Choose 3-4 exercises that hit different muscle groups
- coaching_note = target rep range to aim for`,
};

export async function POST(req: NextRequest) {
  try {
    const {
      format,
      equipment,
      experience_level,
      duration_minutes = 30,
      muscle_focus,
    }: {
      format: FreeSessionFormat;
      equipment: string[];
      experience_level: string;
      duration_minutes?: number;
      muscle_focus?: string;
    } = await req.json();

    if (!format) {
      return NextResponse.json({ error: "format is required" }, { status: 400 });
    }

    const equipmentList = equipment?.length
      ? equipment.join(", ")
      : "barbell, dumbbells, pull-up bar, jump rope";

    const focusNote = muscle_focus
      ? `Bias the workout toward: ${muscle_focus}`
      : "Full body, balanced across pushing, pulling, and legs";

    const prompt = `You are an expert coach designing an authentic ${format} workout.

Format: ${FORMAT_DESCRIPTIONS[format]}
Duration: ~${duration_minutes} minutes
Equipment available: ${equipmentList}
Athlete level: ${experience_level ?? "intermediate"}
Focus: ${focusNote}

STRUCTURE RULES for ${format}:
${FORMAT_STRUCTURE_RULES[format]}

General rules:
1. Only use exercises possible with the listed equipment.
2. Make it feel like an authentic ${format} workout — not just random exercises with the label slapped on.
3. Include a clear workout description in the day's muscle_focus field (e.g., "20-min EMOM: odd minutes push, even minutes pull").
4. Return ONLY valid JSON — no markdown, no explanation.

Return exactly this shape:
{
  "day_name": "${format}",
  "muscle_focus": "brief workout description — e.g. '20-min EMOM: odd push / even pull'",
  "exercises": [
    {
      "name": "Exercise Name",
      "sets": 3,
      "rep_range": "10",
      "rest_seconds": 0,
      "coaching_note": "Practical tip specific to this format."
    }
  ]
}`;

    const raw = await askClaude(prompt);
    const cleaned = extractJSON(raw);
    const dayData: PlanDay = JSON.parse(cleaned);

    // Tag the format on each exercise for display purposes
    return NextResponse.json({ ...dayData, format });
  } catch (err) {
    console.error("generate-free-session error:", err);
    return NextResponse.json({ error: "Could not generate session." }, { status: 500 });
  }
}
