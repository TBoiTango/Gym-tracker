/**
 * Single source of truth for exercise type classification.
 * Used by ExerciseCard, session summary, health checks, and Playwright tests.
 *
 * RULES (in priority order):
 *  1. If the name contains a strength equipment or movement keyword → STRENGTH, never cardio.
 *  2. If the name matches a known cardio activity → CARDIO.
 *  3. If the name matches a whole-word cardio verb → CARDIO.
 *  4. Otherwise → STRENGTH (bodyweight / unrecognised → treated as strength).
 */

// ── Cardio overrides (checked FIRST — unambiguous cardio activities) ─────────
// These take priority even if a strength keyword also appears in the name
// e.g. "Rowing Machine Intervals" contains "machine" but is definitely cardio.

const CARDIO_OVERRIDES = [
  "rowing machine", "treadmill", "stationary bike", "spin bike",
  "elliptical", "stair climber", "stairmaster", "step mill",
  "jump rope", "skip rope", "battle ropes", "sled push", "sled pull",
  "ski erg", "air bike", "assault bike",
  "swimming", "running", "jogging", "cycling",
];

// ── Strength signals (take priority over everything except CARDIO_OVERRIDES) ──

const STRENGTH_EQUIPMENT = [
  "barbell", "dumbbell", "cable", "machine", "smith", "ez bar", "ez-bar",
  "trap bar", "hex bar", "kettlebell", "resistance band", "band",
];

const STRENGTH_MOVEMENTS = [
  "bench press", "squat", "deadlift", "lunge", "press",
  "curl", "extension", "raise", "shrug", "dip",
  "push-up", "push up", "pushup",
  "pull-up", "pull up", "pullup",
  "chin-up", "chin up", "chinup",
  "row",           // catches: Bent-Over Row, Cable Row, Pendlay Row, Seated Row …
  "pendlay", "romanian", "nordic", "bulgarian",
  "rdl", "hack", "incline", "decline",
];

// ── Cardio activities (only matched after strength signals are ruled out) ─────

/** Exact phrase matches — all must be complete activity names, not movement words. */
const CARDIO_ACTIVITIES = [
  "treadmill", "rowing machine", "stationary bike", "spin bike",
  "elliptical", "stair climber", "stairmaster", "step mill",
  "jump rope", "jump rope", "skip rope", "swimming pool",
  "battle ropes", "sled push", "sled pull", "ski erg", "air bike",
  "assault bike", "cardio", "hiit",
];

/** Whole-word verb check — e.g. "run" but NOT "barbell row". */
const CARDIO_VERBS = ["run", "jog", "bike", "swim", "walk", "sprint", "cycle"];

// ── Bodyweight signals (for volume calculation — not used for cardio/strength) ─

const BODYWEIGHT_SIGNALS = [
  "pull-up", "pull up", "pullup", "chin-up", "chin up", "chinup",
  "dip", "push-up", "push up", "pushup", "bodyweight", "body weight",
  "hanging", "inverted row", "muscle-up", "muscle up",
  "pistol squat", "nordic", "glute bridge", "hip thrust",
  "plank", "dead bug", "ab wheel", "leg raise", "sit-up", "sit up",
  "crunch", "mountain climber", "burpee",
];

// ── Treadmill-specific (gets the interval UI) ─────────────────────────────────

const TREADMILL_SIGNALS = [
  "treadmill",
];

// ── Public functions ──────────────────────────────────────────────────────────

export function isStrengthExercise(name: string): boolean {
  return !isCardioExercise(name);
}

export function isCardioExercise(name: string): boolean {
  const lower = name.toLowerCase();

  // 1. Unambiguous cardio activities — checked first, nothing overrides these
  if (CARDIO_OVERRIDES.some((k) => lower.includes(k))) return true;

  // 2. Strength equipment → never cardio
  if (STRENGTH_EQUIPMENT.some((k) => lower.includes(k))) return false;

  // 3. Strength movement → never cardio
  if (STRENGTH_MOVEMENTS.some((k) => lower.includes(k))) return false;

  // 4. Other cardio activity names
  if (CARDIO_ACTIVITIES.some((k) => lower.includes(k))) return true;

  // 5. Whole-word cardio verb (e.g. "run", "jog", "bike", "swim")
  return CARDIO_VERBS.some((k) =>
    new RegExp(`(^|[^a-z])${k}([^a-z]|$)`).test(lower)
  );
}

export function isTreadmillExercise(name: string): boolean {
  const lower = name.toLowerCase();
  return TREADMILL_SIGNALS.some((k) => lower.includes(k));
}

export function isBodyweightExercise(name: string): boolean {
  const lower = name.toLowerCase();
  return BODYWEIGHT_SIGNALS.some((k) => lower.includes(k));
}

// ── Muscle group inference ────────────────────────────────────────────────────
// Returns a canonical primary muscle group for an exercise name, or "unknown".
export type MuscleGroup =
  | "chest" | "back" | "shoulders" | "biceps" | "triceps"
  | "legs" | "abs and core" | "cardio" | "unknown";

export function inferExerciseMuscle(name: string): MuscleGroup {
  const n = name.toLowerCase();
  if (isCardioExercise(name)) return "cardio";
  // Core first — broad
  if (/\bab\b|abdominal|core|crunch|sit.?up|leg raise|oblique|wheel|roller|russian twist|hollow|dead ?bug|bird.?dog|pallof|woodchop|copenhagen|plank|dragon flag|v-?up|toe touch|hanging knee/.test(n))
    return "abs and core";
  if (/chest|bench press|incline press|decline press|\bfly\b|flye|pec|push.?up|chest press|chest dip/.test(n))
    return "chest";
  if (/tricep|skull|pushdown|overhead extension|kickback|close.?grip bench|jm press/.test(n))
    return "triceps";
  if (/bicep|preacher|hammer curl|concentration curl|spider curl|chin.?up/.test(n))
    return "biceps";
  if (/shoulder|delt|lateral raise|front raise|rear raise|face pull|upright row|overhead press|military press|arnold press|shrug/.test(n))
    return "shoulders";
  if (/\bpress\b/.test(n) && !/bench|incline|decline|chest|pec|leg/.test(n))
    return "shoulders";
  if (/back|bent.?over|\brow\b|pendlay|lat\b|pulldown|pull.?down|pull.?up|deadlift|rhomboid|t-bar|seal row/.test(n))
    return "back";
  if (/squat|leg press|lunge|quad|hamstring|glute|hip thrust|rdl|romanian|leg curl|leg ext|calf|nordic|step.?up|bulgarian|good morning/.test(n))
    return "legs";
  if (/\bcurl\b/.test(n)) return "biceps"; // generic curl after leg curl ruled out
  if (/\bdip\b/.test(n)) return "triceps";
  return "unknown";
}

// Canonical day categories. "upper" allows ALL upper-body muscle groups —
// an Upper day must never be narrowed down to a chest day or back day just
// because its muscle_focus string mentions those muscles.
export type DayCategory = "push" | "pull" | "legs" | "upper" | "other";

// Classify a workout day. Checks day_name first (authoritative), then falls
// back to muscle_focus. IMPORTANT ordering: "upper" — and any focus that spans
// both chest AND back — is detected BEFORE the single chest/back checks, so an
// Upper day with focus "Chest, Back, Shoulders & Arms" is treated as upper,
// not as a chest day.
export function dayCategory(dayName: string, muscleFocus = ""): DayCategory {
  for (const raw of [dayName, muscleFocus]) {
    const n = (raw || "").toLowerCase();
    if (!n) continue;
    if (n.includes("upper")) return "upper";
    if (n.includes("chest") && n.includes("back")) return "upper";
    if (n.includes("push")) return "push";
    if (n.includes("pull")) return "pull";
    if (n.includes("leg") || n.includes("lower")) return "legs";
    if (n.includes("chest")) return "push";
    if (n.includes("back")) return "pull";
  }
  return "other"; // unknown / full body — no restriction
}

// Allowed muscle groups for a given day type. Empty array = allow anything
// (unknown/full-body days). Core is handled separately (allowed when opted in).
export function allowedMusclesForDay(dayName: string, muscleFocus = ""): MuscleGroup[] {
  switch (dayCategory(dayName, muscleFocus)) {
    case "push":  return ["chest", "shoulders", "triceps"];
    case "pull":  return ["back", "biceps", "shoulders"]; // shoulders allows rear delts
    case "legs":  return ["legs"];
    case "upper": return ["chest", "back", "shoulders", "biceps", "triceps"];
    default:      return [];
  }
}

/**
 * Smoke-test the classifier against known exercises.
 * Returns a list of failures — empty array means all pass.
 * Called by /api/health on every deploy.
 */
export function runClassifierTests(): { exercise: string; expected: string; got: string }[] {
  const cases: { name: string; expectedCardio: boolean }[] = [
    // Must be STRENGTH
    { name: "Barbell Pendlay Row",         expectedCardio: false },
    { name: "Seated Cable Row",            expectedCardio: false },
    { name: "Dumbbell Bent-Over Row",      expectedCardio: false },
    { name: "Barbell Bench Press",         expectedCardio: false },
    { name: "Cable Chest Fly",             expectedCardio: false },
    { name: "EZ Bar Curl",                 expectedCardio: false },
    { name: "Smith Machine Squat",         expectedCardio: false },
    { name: "Resistance Band Pull-Apart",  expectedCardio: false },
    { name: "Kettlebell Swing",            expectedCardio: false },
    { name: "Incline Dumbbell Press",      expectedCardio: false },
    { name: "Romanian Deadlift",           expectedCardio: false },
    { name: "Nordic Hamstring Curl",       expectedCardio: false },
    { name: "Pull-Up",                     expectedCardio: false },
    { name: "Dip",                         expectedCardio: false },
    { name: "Plank",                       expectedCardio: false },
    { name: "Dead Bug",                    expectedCardio: false },
    { name: "Ab Wheel Rollout",            expectedCardio: false },
    // Must be CARDIO
    { name: "Rowing Machine Intervals",    expectedCardio: true  },
    { name: "Treadmill Walk",              expectedCardio: true  },
    { name: "Stationary Bike",             expectedCardio: true  },
    { name: "Jump Rope",                   expectedCardio: true  },
    { name: "Stair Climber",               expectedCardio: true  },
    { name: "Battle Ropes",                expectedCardio: true  },
    { name: "30 min Running",              expectedCardio: true  },
    { name: "HIIT Circuit",                expectedCardio: true  },
    { name: "Swimming",                    expectedCardio: true  },
  ];

  return cases
    .filter(({ name, expectedCardio }) => isCardioExercise(name) !== expectedCardio)
    .map(({ name, expectedCardio }) => ({
      exercise: name,
      expected: expectedCardio ? "cardio" : "strength",
      got: isCardioExercise(name) ? "cardio" : "strength",
    }));
}
