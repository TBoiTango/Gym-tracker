export const maxDuration = 30;

// POST /api/swap-exercise
// Given an exercise name + muscle focus + equipment, returns a different exercise
// targeting the same muscle group.
import { NextRequest, NextResponse } from "next/server";
import { askClaude, extractJSON } from "@/lib/claude";

export async function POST(req: NextRequest) {
  try {
    const { exerciseName, muscleFocus, equipment, experienceLevel } = await req.json();

    if (!exerciseName || !muscleFocus) {
      return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
    }

    const equipmentList = Array.isArray(equipment) ? equipment.join(", ") : equipment ?? "barbell, dumbbells, cable machine";

    const prompt = `You are a personal trainer. A user wants to swap out an exercise from their workout.

Current exercise: "${exerciseName}"
Muscle focus of this workout day: "${muscleFocus}"
Available equipment: ${equipmentList}
Experience level: ${experienceLevel ?? "intermediate"}

Suggest ONE different exercise that:
1. Targets the same primary muscle group as the current exercise
2. Can be done with the available equipment
3. Is NOT the same as "${exerciseName}"
4. Is appropriate for the experience level
5. Provides variety (different movement pattern if possible)

Return ONLY valid JSON, no markdown:
{
  "name": "Exercise Name",
  "sets": 3,
  "rep_range": "8-12",
  "rest_seconds": 90,
  "coaching_note": "One practical coaching tip."
}`;

    const raw = await askClaude(prompt);
    const cleaned = extractJSON(raw);
    const exercise = JSON.parse(cleaned);

    return NextResponse.json(exercise);
  } catch (err) {
    console.error("swap-exercise error:", err);
    return NextResponse.json({ error: "Could not generate swap." }, { status: 500 });
  }
}
