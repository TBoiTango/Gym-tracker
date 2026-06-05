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

  // Check abs/core FIRST and most broadly — before anything else
  // "Hanging Leg Raise", "Dead Bug", "Copenhagen Plank" etc. must all land here
  if (/\bab\b|abdominal|core|crunch|sit.?up|leg raise|oblique|wheel|roller|russian twist|hollow|dead bug|bird.?dog|pallof|woodchop|copenhagen/.test(name))
    return "abs and core";
  if (/plank/.test(name))
    return "abs and core";
  if (/chest|bench|fly|pec|push.?up/.test(name))
    return "chest";
  if (/bicep|curl|hammer|preacher/.test(name))
    return "biceps";
  if (/tricep|skull|pushdown|overhead ext/.test(name))
    return "triceps";
  // dip only maps to triceps if not chest-dip context
  if (/\bdip\b/.test(name))
    return name.includes("chest") ? "chest" : "triceps";
  if (/shoulder|delt|lateral raise|front raise|face pull|upright row/.test(name))
    return "shoulders";
  // press alone → check context (not bench/incline which is chest)
  if (/\bpress\b/.test(name) && !/bench|incline|decline|chest|pec/.test(name))
    return "shoulders";
  if (/back|bent.?over|row|lat\b|pulldown|deadlift|shrug|rhomboid|pull.?up|chin.?up/.test(name))
    return "back";
  if (/squat|leg press|lunge|quad|hamstring|glute|hip thrust|rdl|romanian|leg curl|leg ext|calf|nordic/.test(name))
    return "legs";
  if (/hanging/.test(name))
    return "abs and core"; // hanging anything is almost always abs

  // Fall back to the day's muscle focus
  return dayFocus;
}

export async function POST(req: NextRequest) {
  try {
    const { exerciseName, muscleFocus, subFocus, equipment, experienceLevel, excludeExercises = [] } = await req.json();

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
    const subFocusLine = subFocus ? `\nSpecifically bias toward: ${subFocus} (within ${targetMuscle}).` : "";

    console.log(`[swap-exercise] isQuickAdd=${isQuickAdd} muscleFocus="${muscleFocus}" subFocus="${subFocus ?? ""}" targetMuscle="${targetMuscle}"`);

    const prompt = isQuickAdd
      ? `You are an expert personal trainer recommending an ADDITIONAL exercise to add to an existing session.

Target muscle group: ${targetMuscle}${subFocusLine}
Workout day focus: ${muscleFocus}
Available equipment: ${equipmentList}
Experience level: ${experienceLevel ?? "intermediate"}

Already in this session — do NOT suggest these OR any exercise that is functionally the same movement:
"${excludeList}"

STRICT RULES:
1. The exercise MUST train ${targetMuscle} as the PRIMARY muscle.
2. The exercise MUST be possible with the available equipment.
3. It must use a DIFFERENT movement pattern from everything already in the session.
   - If the session has a vertical pull (lat pulldown, pull-up) → suggest a horizontal pull (row variation)
   - If the session has a compound press → suggest an isolation or cable variation
   - If the session has a barbell movement → consider a dumbbell or cable alternative
   - Never suggest an exercise that is a minor variation of an existing one (e.g. if "Barbell Row" is listed, "Bent-Over Barbell Row" is NOT acceptable)
4. The goal is to ADD genuine variety and hit the muscle from a different angle.

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

STRICT RULES — violating any of these is an automatic failure. There are no exceptions:
1. The replacement MUST train ${targetMuscle} as the PRIMARY muscle. Not secondary, not synergist — PRIMARY.
   If targetMuscle is "abs and core" → the exercise must be a direct ab/core exercise (crunch, leg raise, plank variation, cable crunch, etc.). A back exercise, leg exercise, or anything else is WRONG.
   If you are unsure whether an exercise targets ${targetMuscle} primarily — do not suggest it.
2. Do NOT suggest any of these (already seen): "${excludeList}"
3. Do NOT suggest exercises with different names that are functionally identical. Examples of functionally identical groups — avoid suggesting anything from the same group as the original:
   - Rollout group (ALL the same movement): Ab Wheel, Ab Roller, Barbell Rollout, Stability Ball Rollout, TRX Rollout
   - Crunch group: Crunch, Sit-Up, Curl-Up
   - Plank group: Plank, Front Plank, High Plank
   If the original is ANY rollout variation, suggest something from a completely different movement pattern (e.g. Hanging Leg Raise, Cable Crunch, Dead Bug, Pallof Press).
4. The exercise MUST be possible with the available equipment.
5. Choose a genuinely different movement pattern AND feel free to use completely different equipment — the goal is to hit the same muscle from a fresh angle. Examples:
   - Incline Barbell Bench → Cable Low-to-High Fly (same upper chest, totally different stimulus)
   - Barbell Row → Single-Arm Dumbbell Row or Cable Seated Row
   - Barbell Curl → Incline Dumbbell Curl or Cable Curl
   Do NOT just swap barbell for dumbbell doing the exact same motion. Find a different angle, grip, or movement pattern.

Return ONLY valid JSON, no markdown, no explanation:
{
  "name": "Exercise Name",
  "sets": 3,
  "rep_range": "10-15",
  "rest_seconds": 60,
  "coaching_note": "One practical tip for proper form."
}`;

    const attemptSwap = async (extraStrictness = false): Promise<Record<string, unknown>> => {
      const finalPrompt = extraStrictness
        ? prompt + `\n\nFINAL WARNING: You returned the wrong muscle group on the previous attempt. The replacement MUST target "${targetMuscle}" and ONLY "${targetMuscle}". No other muscle group is acceptable.`
        : prompt;

      const raw = await askClaude(finalPrompt);
      const cleaned = extractJSON(raw);
      return JSON.parse(cleaned);
    };

    let exercise = await attemptSwap();

    // Validate the returned exercise targets the correct muscle group
    const returnedMuscle = inferMuscleGroup(exercise.name as string, targetMuscle);
    console.log(`[swap-exercise] Requested: "${targetMuscle}", got: "${exercise.name}" → inferred: "${returnedMuscle}"`);

    if (returnedMuscle !== targetMuscle) {
      console.warn(`[swap-exercise] Muscle mismatch — retrying with stricter prompt`);
      exercise = await attemptSwap(true);

      const retryMuscle = inferMuscleGroup(exercise.name as string, targetMuscle);
      console.log(`[swap-exercise] Retry result: "${exercise.name}" → inferred: "${retryMuscle}"`);
    }

    return NextResponse.json(exercise);
  } catch (err) {
    console.error("swap-exercise error:", err);
    return NextResponse.json({ error: "Could not generate swap." }, { status: 500 });
  }
}
