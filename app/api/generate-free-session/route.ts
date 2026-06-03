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

  Hyrox: `Structure as a Hyrox TRAINING session — NOT a full race simulation.
A full Hyrox race (8km run + 8 stations) takes 60-90 minutes for elite athletes and is not appropriate as a training session.
Instead, build a focused training workout that develops Hyrox fitness:

Choose ONE of these training formats based on duration:
- Under 30 min: Pick 2-3 Hyrox stations + short runs. Do 2-3 rounds as a circuit.
- 30-45 min: Pick 3-4 stations + short runs (200-400m). Do 2 rounds.
- 45-60 min: Pick 4-5 stations + short runs (400m). Do 2 rounds or descending ladder.

Hyrox stations to choose from (use what's available with the equipment):
SkiErg (or row), Sled Push (or prowler/heavy carry), Sled Pull (or resistance band drag),
Burpee Broad Jumps, Rowing (or bike), Farmers Carry, Sandbag Lunges (or goblet lunges),
Wall Balls (or thruster)

- Substitute unavailable equipment with closest alternative
- rep_range = distance or reps appropriate for TRAINING volume (e.g., "100m carry", "20 reps", "200m row")
- sets = rounds of the circuit
- coaching_note = form cue or pacing tip specific to Hyrox competition prep
- Include short run intervals (200-400m) between stations, labelled "Run" with rep_range = distance`,

  CrossFit: `Structure as an authentic CrossFit WOD. Choose one of: 3-5 round circuit, 21-15-9 couplet/triplet, Chipper, or AMRAP-style.
- sets = number of rounds (minimum 3 — never 1). For a 21-15-9, set sets=3 and put "21-15-9" in the muscle_focus description.
- rep_range = reps per round for each exercise (e.g. "15", "10", "5")
- Mix compound movements: deadlifts, thrusters, cleans, squats, push press PLUS gymnastics: pull-ups, push-ups, burpees, box jumps
- Minimum 4 exercises, maximum 6
- rest_seconds = 0 (CrossFit is designed with minimal rest)
- coaching_note = scaling option for the movement (e.g. "Scale: banded pull-ups or ring rows")
- The workout should feel hard but completable — total reps across all exercises and rounds should be 100-200 reps`,

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
