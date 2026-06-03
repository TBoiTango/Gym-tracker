export const maxDuration = 30;

// POST /api/swap-exercise
// Given an exercise name + muscle focus + equipment, returns a genuinely different
// exercise targeting the exact same muscle group.
import { NextRequest, NextResponse } from "next/server";
import { askClaude, extractJSON } from "@/lib/claude";

// Maps common exercise names to their primary muscle group
// so Claude can't drift to a different muscle group on swap.
function inferMuscleGroup(exerciseName: string, dayFocus: string): string {
  const name = exerciseName.toLowerCase();

  if (/ab|core|crunch|plank|sit.?up|leg raise|oblique|wheel|roller|russian twist|hollow/.test(name))
    return "abs and core";
  if (/chest|bench|fly|pec|push.?up|dip/.test(name))
    return "chest";
  if (/bicep|curl|hammer|preacher/.test(name))
    return "biceps";
  if (/tricep|skull|pushdown|overhead ext|dip/.test(name))
    return "triceps";
  if (/shoulder|delt|press|lateral raise|front raise|face pull|upright row/.test(name))
    return "shoulders";
  if (/back|row|pull|lat|deadlift|shrug|rhomboid/.test(name) && !/ab/.test(name))
    return "back";
  if (/squat|leg press|lunge|quad|hamstring|glute|hip|rdl|leg curl|leg ext|calf/.test(name))
    return "legs";

  // Fall back to the day's muscle focus
  return dayFocus;
}

export async function POST(req: NextRequest) {
  try {
    const { exerciseName, muscleFocus, equipment, experienceLevel, excludeExercises = [] } = await req.json();

    // exerciseName may be empty string for Quick Add (muscle-only lookup)
    if (!muscleFocus) {
      return NextResponse.json({ error: "muscleFocus is required." }, { status: 400 });
    }

    const equipmentList = Array.isArray(equipment) && equipment.length
      ? equipment.join(", ")
      : "barbell, dumbbells, cable machine, pull-up bar";

    const targetMuscle = inferMuscleGroup(exerciseName ?? "", muscleFocus);
    const excludeList = [...(exerciseName ? [exerciseName] : []), ...excludeExercises].join('", "');

    // For Quick Add (no exerciseName), use a different prompt framing
    const isQuickAdd = !exerciseName;

    const prompt = isQuickAdd
      ? `You are an expert personal trainer recommending a new exercise.

Target muscle group: ${targetMuscle}
Workout day focus: ${muscleFocus}
Available equipment: ${equipmentList}
Experience level: ${experienceLevel ?? "intermediate"}
${excludeList ? `Do NOT suggest any of these (already in this session): "${excludeList}"` : ""}

STRICT RULES:
1. The exercise MUST train ${targetMuscle} as the PRIMARY muscle.
2. The exercise MUST be possible with the available equipment.
3. Choose a practical, well-known exercise suitable for the experience level.

Return ONLY valid JSON, no markdown, no explanation:
{
  "name": "Exercise Name",
  "sets": 3,
  "rep_range": "10-15",
  "rest_seconds": 60,
  "coaching_note": "One practical tip for proper form."
}`
      : `You are an expert personal trainer creating exercise substitutions.

The user wants to swap: "${exerciseName}"
Target muscle group (MUST match exactly): ${targetMuscle}
Workout day focus: ${muscleFocus}
Available equipment: ${equipmentList}
Experience level: ${experienceLevel ?? "intermediate"}

STRICT RULES — violating any of these is a failure:
1. The replacement MUST train ${targetMuscle} as the PRIMARY muscle. Not secondary, not synergist — PRIMARY.
2. Do NOT suggest any of these (already seen): "${excludeList}"
3. Do NOT suggest exercises with different names that are functionally identical. Examples of functionally identical groups — avoid suggesting anything from the same group as the original:
   - Rollout group (ALL the same movement): Ab Wheel, Ab Roller, Barbell Rollout, Stability Ball Rollout, TRX Rollout
   - Crunch group: Crunch, Sit-Up, Curl-Up
   - Plank group: Plank, Front Plank, High Plank
   If the original is ANY rollout variation, suggest something from a completely different movement pattern (e.g. Hanging Leg Raise, Cable Crunch, Dead Bug, Pallof Press).
4. The exercise MUST be possible with the available equipment.
5. Choose a genuinely different movement pattern (e.g. if the original is a rolling movement, suggest a weighted crunch, hanging raise, or plank variation instead).

Return ONLY valid JSON, no markdown, no explanation:
{
  "name": "Exercise Name",
  "sets": 3,
  "rep_range": "10-15",
  "rest_seconds": 60,
  "coaching_note": "One practical tip for proper form."
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
