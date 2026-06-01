// ── Shared TypeScript types used across the entire application ───────────────

export type ExperienceLevel = "beginner" | "intermediate" | "advanced";
export type Goal = "strength" | "hypertrophy" | "endurance";
export type SplitType =
  | "ppl_3"        // Push/Pull/Legs — 3 days/week
  | "ppl_6"        // Push/Pull/Legs — 6 days/week
  | "upper_lower"  // Upper/Lower — 4 days/week
  | "full_body"    // Full Body — 3 days/week
  | "bro_split"    // Bro Split (chest/back/shoulders/arms/legs) — 5 days/week
  | "ppl_ul"       // PPL + Upper/Lower hybrid — 5 days/week
  | "no_split"     // No structured split — ad-hoc free sessions
  | "cardio_only"; // Cardio-focused — no lifting plan

// ── Database row types ────────────────────────────────────────────────────────

export interface Profile {
  user_id: string;
  name: string;
  experience_level: ExperienceLevel;
  goal: Goal;
  created_at: string;
}

export interface Gym {
  id: string;
  name: string;
  address?: string;
}

export interface UserGym {
  id: string;
  user_id: string;
  gym_id: string;
  equipment_list: string[];
  created_at: string;
  gym?: Gym;
}

export interface WorkoutPlan {
  id: string;
  user_id: string;
  split_type: SplitType;
  plan_data: PlanData;
  is_active: boolean;
  created_at: string;
}

export interface WorkoutSession {
  id: string;
  user_id: string;
  plan_day: string;
  started_at: string;
  completed_at?: string;
}

export interface ExerciseLog {
  id: string;
  session_id: string;
  exercise_name: string;
  sets_completed: number;
  reps_per_set: number[];
  weight_per_set: number[];
  notes?: string;
  logged_at: string;
}

export interface PlanSuggestion {
  id: string;
  user_id: string;
  suggested_plan: PlanData;
  reason: string;
  accepted?: boolean;
  created_at: string;
}

// ── AI-generated plan shape ───────────────────────────────────────────────────
// This is the JSON Claude returns and what we store in workout_plans.plan_data.

export interface Exercise {
  name: string;
  sets: number;
  rep_range: string;   // e.g. "8-12" or "5"
  rest_seconds: number;
  coaching_note: string;
}

export interface PlanDay {
  day_name: string;        // e.g. "Push Day A" or "Monday"
  muscle_focus: string;    // e.g. "Chest, Shoulders, Triceps"
  exercises: Exercise[];
}

export interface PlanData {
  days: PlanDay[];
  split_explanation?: string; // Optional overview from Claude
}

// ── API request/response types ────────────────────────────────────────────────

export interface GeneratePlanRequest {
  equipment: string[];
  experience_level: ExperienceLevel;
  goal: Goal;
  split_type: SplitType;
}

export interface SuggestVariationRequest {
  current_plan: PlanData;
  recent_logs: ExerciseLog[];  // Last 4 weeks
  experience_level: ExperienceLevel;
  goal: Goal;
}

export interface SuggestVariationResponse {
  suggested_plan: PlanData;
  reason: string;
  changes: string[];  // e.g. ["Replaced barbell curl with hammer curl on Day 3"]
}

// ── Equipment master list ─────────────────────────────────────────────────────
// Used in the gym setup UI. Add new items here to extend.

export const EQUIPMENT_OPTIONS = [
  { id: "barbell", label: "Barbell" },
  { id: "dumbbells", label: "Dumbbells" },
  { id: "cable_machine", label: "Cable Machine" },
  { id: "smith_machine", label: "Smith Machine" },
  { id: "leg_press", label: "Leg Press" },
  { id: "pull_up_bar", label: "Pull-Up Bar" },
  { id: "resistance_bands", label: "Resistance Bands" },
  { id: "kettlebells", label: "Kettlebells" },
  { id: "ez_bar", label: "EZ Bar" },
  { id: "dip_bars", label: "Dip Bars" },
  { id: "lat_pulldown", label: "Lat Pulldown Machine" },
  { id: "leg_curl", label: "Leg Curl Machine" },
  { id: "leg_extension", label: "Leg Extension Machine" },
  { id: "chest_press_machine", label: "Chest Press Machine" },
  { id: "shoulder_press_machine", label: "Shoulder Press Machine" },
  { id: "pec_deck", label: "Pec Deck / Chest Fly Machine" },
  { id: "seated_row", label: "Seated Row Machine" },
  { id: "hyperextension", label: "Hyperextension Bench" },
  { id: "ab_wheel", label: "Ab Wheel" },
  { id: "battle_ropes", label: "Battle Ropes" },
] as const;

export const SPLIT_OPTIONS: { id: SplitType; label: string; days: number; description?: string }[] = [
  { id: "full_body", label: "Full Body", days: 3 },
  { id: "upper_lower", label: "Upper / Lower", days: 4 },
  { id: "ppl_3", label: "Push / Pull / Legs (3 days)", days: 3 },
  { id: "ppl_6", label: "Push / Pull / Legs (6 days)", days: 6 },
  { id: "bro_split", label: "Bro Split", days: 5 },
  { id: "ppl_ul", label: "PPL + Upper/Lower Hybrid", days: 5 },
];

// Non-plan workout styles — shown separately from structured splits
export const FLEXIBLE_STYLE_OPTIONS: { id: "no_split" | "cardio_only"; label: string; description: string; emoji: string }[] = [
  { id: "no_split", label: "No Split", description: "No structured plan — log free sessions whenever you want", emoji: "🎯" },
  { id: "cardio_only", label: "Cardio Only", description: "Cardio-focused training — log runs, swims, rides, and more", emoji: "🏃" },
];
