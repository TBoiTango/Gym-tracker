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
