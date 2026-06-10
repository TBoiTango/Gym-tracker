export const maxDuration = 60; // seconds — overrides Vercel's default 10s limit

// POST /api/generate-day
// Generates a single day's workout on the fly based on:
// - Which muscle group day it is (e.g. "Push Day", "Legs")
// - Equipment available
// - Experience level + goal
// - Today's available time
// - Whether to include cardio (with intensity + type) and/or core
import { NextRequest, NextResponse } from "next/server";
import { askClaude, extractJSON } from "@/lib/claude";
import type { PlanDay } from "@/types";
import { inferExerciseMuscle, allowedMusclesForDay } from "@/lib/exercise-classifier";
import { formatBankForPrompt } from "@/lib/program-bank";

export interface PoolExercise {
  exercise_name: string;
  sets: number;
  rep_range: string;
  rest_seconds: number;
  coaching_note: string;
}

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
  // Adaptive volume learning
  target_exercise_count?: number;   // rolling avg from past sessions
  pool_exercises?: PoolExercise[];  // user-added exercises to rotate in
  // Exercise history — prevent repeats across sessions of the same day type
  recently_used_exercises?: string[];
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
      target_exercise_count,
      pool_exercises = [],
      recently_used_exercises = [],
    } = body;

    const equipmentList = equipment.join(", ");
    const durationGuidance = getDurationGuidance(duration_minutes, target_exercise_count);

    const cardioSection = include_cardio
      ? `After the main lifting exercises, add ONE cardio finisher using this spec:
  - Equipment/type: ${cardio_type === "Any / AI Pick" ? "your choice — pick the best option available" : cardio_type}
  - Intensity: ${cardio_intensity}
  - ${getCardioGuidance(cardio_type, cardio_intensity)}
  - Set sets to 1, rest_seconds to 0.
  - For rep_range, use a specific descriptive string, e.g. "20 min @ 3 mph 10% incline" or "8 × 30s sprints / 30s walk".`
      : `No cardio — weights only.`;

    console.log(`[generate-day] recently_used_exercises (${recently_used_exercises.length}):`, recently_used_exercises);

    // Exclusion list: core exercises from the last couple of sessions (must never
    // repeat back-to-back) plus lifting movements from the complementary same-category
    // day this week (so e.g. Pull B differs from Pull A).
    const recentExclusionSection = recently_used_exercises.length > 0
      ? `\n\nREPEAT PREVENTION — this is a HARD rule, no exceptions:
The following exercises were used very recently and MUST NOT appear in today's workout (not even as a renamed variation):
${recently_used_exercises.map((e) => `  - ${e}`).join("\n")}
Pick genuinely different exercises that still hit the same muscle groups. It is fine to use a different variation of the same lift (e.g. if "Cable Row" is excluded, a "Chest-Supported Dumbbell Row" is acceptable), but do not return any exact exercise from the list above.`
      : "";

    const coreSection = include_core
      ? `After the main lifting exercises (before cardio if included), add 2 core exercises.

CORE SELECTION RULES:
1. NEVER pick Ab Wheel, Ab Roller, or any rollout variation — these are overused and boring.
2. Choose from DIFFERENT movement patterns — one from each category below:
   - Anti-extension: Plank, Dead Bug, Hollow Body Hold, Pallof Press
   - Flexion/weighted: Cable Crunch, Weighted Sit-Up, Decline Crunch, Bicycle Crunch
   - Anti-rotation: Pallof Press, Woodchop, Russian Twist
   - Hip flexion: Hanging Leg Raise, Lying Leg Raise, Dragon Flag, V-Up
   - Lateral: Side Plank, Copenhagen Plank, Lateral Crunch
3. Pick 2 exercises from DIFFERENT categories above — never two from the same.
4. Choose based on available equipment.`
      : `No dedicated core exercises.`;

    // Program bank — admin-curated exercise library injected into every session
    const bankSection = formatBankForPrompt(day_name);
    if (bankSection) {
      console.log(`[generate-day] Injecting program bank for "${day_name}" (${bankSection.split("\n").length} lines)`);
    }

    // Pool exercises the user has previously added — rotate 1-2 in naturally
    const poolSection = pool_exercises.length > 0
      ? `User-favourite exercises (previously added by this user for this day type, ordered by least-recently used first):
${pool_exercises.map((p, i) => `  ${i + 1}. ${p.exercise_name} — ${p.sets} sets × ${p.rep_range} reps`).join("\n")}
POOL RULE: Naturally include 1-2 of these exercises from the TOP of the list into the workout (prioritise those listed first as they were used least recently). They must still target ${muscle_focus}. Do not force all of them in — only include what fits the session naturally.`
      : "";

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

${bankSection ? bankSection + "\n\n" : ""}${poolSection ? poolSection + "\n\n" : ""}EQUIPMENT VARIETY — read this first, it overrides everything else:
- MAXIMUM 2 barbell exercises per session. Never more. This is a hard limit.
- Every other exercise MUST use different equipment: dumbbells, cables, machines, or bodyweight.
- Good Push Day: Barbell Bench Press → Dumbbell Shoulder Press → Cable Lateral Raise → Machine Chest Fly → Dumbbell Tricep Overhead Extension.
- BAD Push Day (never do this): Barbell Bench → Barbell Incline → Barbell OHP → Barbell Skull Crusher → Barbell Upright Row.
- If the user has dumbbells, cables, or machines available — USE THEM. Do not default to barbell for every exercise.

General rules:
1. Only use exercises possible with the listed equipment.
2. Tailor rep ranges and rest to the goal: strength (3-6 reps, 75-90s rest), hypertrophy (8-15 reps, 60-75s rest), endurance (15-25 reps, 30-45s rest). MAXIMUM rest_seconds is 90 — never exceed this.
3. Scale intensity to experience level.
4. Coaching notes: practical, one sentence each.
5. Return ONLY valid JSON — no markdown, no explanation, no code fences.
6. UNIQUENESS — this is a hard rule: each exercise must appear ONLY ONCE in the workout. Do not repeat any exercise name, even with different rep ranges or sets. Every entry in the exercises array must be a completely different exercise.${recentExclusionSection}

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
    const cleaned = extractJSON(raw);

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

    // Server-side safety net: verify no excluded exercise slipped through.
    if (recently_used_exercises.length > 0 && dayData.exercises) {
      const excludedLower = recently_used_exercises.map((e: string) => e.toLowerCase().trim());
      const violations = dayData.exercises.filter((ex) =>
        excludedLower.includes(ex.name.toLowerCase().trim())
      );
      if (violations.length > 0) {
        console.warn(
          `[generate-day] Claude included ${violations.length} excluded exercise(s) despite instructions:`,
          violations.map((v) => v.name)
        );
      } else {
        console.log(`[generate-day] ✓ Verified: none of the ${recently_used_exercises.length} excluded exercises appear in the generated workout.`);
      }
    }

    // ── FIX 1: Hard muscle-group validation + replacement ─────────────────────
    // Reject any exercise that doesn't match the day's allowed muscle groups
    // (core allowed when the user opted in; cardio always allowed as a finisher).
    const allowed = allowedMusclesForDay(day_name);
    if (allowed.length > 0 && dayData.exercises?.length) {
      const isAllowed = (exName: string): boolean => {
        const m = inferExerciseMuscle(exName);
        if (m === "cardio") return true;                      // cardio finisher
        if (m === "abs and core") return include_core;        // core only if opted in
        if (m === "unknown") return true;                     // can't classify — don't reject
        return allowed.includes(m);
      };

      const bad = dayData.exercises.filter((ex) => !isAllowed(ex.name));
      if (bad.length > 0) {
        console.warn(`[generate-day] FIX1 — ${bad.length} exercise(s) failed muscle validation for "${day_name}" (allowed: ${allowed.join(", ")}):`, bad.map((b) => `${b.name} [${inferExerciseMuscle(b.name)}]`));

        // Ask Claude for same-count replacements that hit only the allowed muscles
        const replacePrompt = `You are an expert coach fixing a workout. The day type is "${day_name}" which ONLY trains these muscle groups: ${allowed.join(", ")}${include_core ? ", and core" : ""}.

These exercises were WRONG (they target other muscle groups) and must be replaced:
${bad.map((b) => `  - ${b.name}`).join("\n")}

Available equipment: ${equipmentList}
Replace each one with a DIFFERENT exercise that trains one of the allowed muscle groups (${allowed.join(", ")}) as its PRIMARY muscle, possible with the equipment. Do not reuse any of the wrong exercises above.

Return ONLY a JSON array, same length and order as the wrong list:
[{ "name": "...", "sets": 3, "rep_range": "8-12", "rest_seconds": 60, "coaching_note": "..." }]`;

        try {
          const rawFix = await askClaude(replacePrompt);
          const replacements = JSON.parse(extractJSON(rawFix)) as PlanDay["exercises"];
          let ri = 0;
          dayData.exercises = dayData.exercises.map((ex) => {
            if (!isAllowed(ex.name) && replacements[ri]) {
              const repl = replacements[ri++];
              // Only accept the replacement if it actually passes validation
              if (isAllowed(repl.name)) {
                console.log(`[generate-day] FIX1 — replaced "${ex.name}" → "${repl.name}"`);
                return repl;
              }
            }
            return ex;
          });
          // Final filter: drop anything still invalid rather than show wrong muscle
          dayData.exercises = dayData.exercises.filter((ex) => isAllowed(ex.name));
        } catch (e) {
          console.error("[generate-day] FIX1 replacement failed, dropping bad exercises:", e);
          dayData.exercises = dayData.exercises.filter((ex) => isAllowed(ex.name));
        }
      } else {
        console.log(`[generate-day] ✓ FIX1 — all exercises match allowed muscles for "${day_name}".`);
      }
    }

    // ── FIX 2: De-duplicate exercises within the same session ────────────────
    // Claude occasionally generates the same exercise twice (e.g. Leg Press at
    // positions 1 and 3). Scan for duplicate names and replace extras with a
    // different exercise targeting the same muscle group.
    if (dayData.exercises?.length) {
      const seen = new Map<string, number>(); // normalized name → first index
      const dupeIndices: number[] = [];

      dayData.exercises.forEach((ex, i) => {
        const key = ex.name.toLowerCase().trim();
        if (seen.has(key)) {
          dupeIndices.push(i);
          console.warn(`[generate-day] DEDUP — duplicate found: "${ex.name}" at index ${i} (first seen at ${seen.get(key)})`);
        } else {
          seen.set(key, i);
        }
      });

      if (dupeIndices.length > 0) {
        const uniqueNames = dayData.exercises
          .filter((_, i) => !dupeIndices.includes(i))
          .map((ex) => ex.name);

        const dupesToReplace = dupeIndices.map((i) => dayData.exercises[i]);

        const dedupePrompt = `You are an expert coach fixing a workout that has duplicate exercises.

The workout targets: ${muscle_focus}
Available equipment: ${equipmentList}

These exercises are duplicates and must each be replaced with a UNIQUE exercise not already in the workout:
${dupesToReplace.map((ex) => `  - "${ex.name}" (targets ${inferExerciseMuscle(ex.name)} — replacement MUST target same muscle)`).join("\n")}

Do NOT suggest any of these (already in the workout):
${uniqueNames.map((n) => `  - ${n}`).join("\n")}

Rules:
1. Each replacement must target the SAME primary muscle group as the exercise it replaces.
2. Each replacement must be a genuinely different exercise.
3. Must be possible with equipment: ${equipmentList}.
4. Return ONLY a JSON array with exactly ${dupesToReplace.length} replacement(s):
[{ "name": "...", "sets": 3, "rep_range": "8-12", "rest_seconds": 60, "coaching_note": "..." }]`;

        try {
          const rawDedup = await askClaude(dedupePrompt);
          const replacements = JSON.parse(extractJSON(rawDedup)) as PlanDay["exercises"];
          let ri = 0;
          dayData.exercises = dayData.exercises.map((ex, i) => {
            if (dupeIndices.includes(i) && replacements[ri]) {
              const repl = replacements[ri++];
              console.log(`[generate-day] DEDUP — replaced duplicate "${ex.name}" → "${repl.name}"`);
              return repl;
            }
            return ex;
          });
        } catch (e) {
          console.error("[generate-day] DEDUP replacement failed, removing duplicates:", e);
          // Fallback: just drop the duplicates rather than show the same exercise twice
          dayData.exercises = dayData.exercises.filter((_, i) => !dupeIndices.includes(i));
        }
      } else {
        console.log(`[generate-day] ✓ DEDUP — no duplicate exercises found.`);
      }
    }

    return NextResponse.json(dayData);
  } catch (err) {
    console.error("generate-day error:", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}

function getDurationGuidance(minutes: number, targetCount?: number): string {
  // If we have a user-specific rolling average, override the count part but keep the style guidance
  if (targetCount && targetCount >= 3) {
    const style = minutes <= 30 ? "compound movements only, no isolation"
      : minutes <= 45 ? "2-3 compounds + isolation moves"
      : minutes <= 60 ? "mix of compound and isolation work"
      : "compounds, isolation, and accessories";
    return `Generate exactly ${targetCount} lifting exercises (${style}). This is based on the user's personal average completion rate from past sessions — match it precisely.`;
  }
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
