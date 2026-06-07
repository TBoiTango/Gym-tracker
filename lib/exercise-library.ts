// Static exercise library for the Quick Add "Other" modal.
// Each entry lists the equipment IDs it needs (must match EQUIPMENT_OPTIONS ids).
// An empty `equipment` array means bodyweight / no equipment required.

export interface LibraryExercise {
  name: string;
  equipment: string[]; // any-of: exercise is available if user has at least one
  defaultSets: number;
  defaultReps: string;
}

export type LibraryMuscle =
  | "chest" | "back" | "shoulders" | "biceps" | "triceps" | "legs" | "abs and core";

export const MUSCLE_LABELS: { id: LibraryMuscle; label: string }[] = [
  { id: "chest", label: "Chest" },
  { id: "back", label: "Back" },
  { id: "shoulders", label: "Shoulders" },
  { id: "biceps", label: "Biceps" },
  { id: "triceps", label: "Triceps" },
  { id: "legs", label: "Legs" },
  { id: "abs and core", label: "Core" },
];

export const EXERCISE_LIBRARY: Record<LibraryMuscle, LibraryExercise[]> = {
  chest: [
    { name: "Barbell Bench Press", equipment: ["barbell"], defaultSets: 4, defaultReps: "6-10" },
    { name: "Incline Barbell Bench Press", equipment: ["barbell"], defaultSets: 4, defaultReps: "8-10" },
    { name: "Dumbbell Bench Press", equipment: ["dumbbells"], defaultSets: 4, defaultReps: "8-12" },
    { name: "Incline Dumbbell Press", equipment: ["dumbbells"], defaultSets: 3, defaultReps: "8-12" },
    { name: "Dumbbell Fly", equipment: ["dumbbells"], defaultSets: 3, defaultReps: "12-15" },
    { name: "Cable Crossover", equipment: ["cable_machine"], defaultSets: 3, defaultReps: "12-15" },
    { name: "Low Cable Fly", equipment: ["cable_machine"], defaultSets: 3, defaultReps: "12-15" },
    { name: "Pec Deck Fly", equipment: ["pec_deck"], defaultSets: 3, defaultReps: "12-15" },
    { name: "Machine Chest Press", equipment: ["chest_press_machine"], defaultSets: 3, defaultReps: "10-12" },
    { name: "Smith Machine Bench Press", equipment: ["smith_machine"], defaultSets: 4, defaultReps: "8-10" },
    { name: "Push-Up", equipment: [], defaultSets: 3, defaultReps: "12-20" },
    { name: "Decline Push-Up", equipment: [], defaultSets: 3, defaultReps: "12-20" },
    { name: "Chest Dip", equipment: ["dip_bars"], defaultSets: 3, defaultReps: "8-12" },
    { name: "Resistance Band Chest Press", equipment: ["resistance_bands"], defaultSets: 3, defaultReps: "12-15" },
    { name: "Svend Press", equipment: ["dumbbells"], defaultSets: 3, defaultReps: "12-15" },
  ],
  back: [
    { name: "Pull-Up", equipment: ["pull_up_bar"], defaultSets: 4, defaultReps: "6-12" },
    { name: "Chin-Up", equipment: ["pull_up_bar"], defaultSets: 3, defaultReps: "6-12" },
    { name: "Lat Pulldown", equipment: ["lat_pulldown"], defaultSets: 4, defaultReps: "10-12" },
    { name: "Barbell Bent-Over Row", equipment: ["barbell"], defaultSets: 4, defaultReps: "8-10" },
    { name: "Pendlay Row", equipment: ["barbell"], defaultSets: 4, defaultReps: "6-8" },
    { name: "Single-Arm Dumbbell Row", equipment: ["dumbbells"], defaultSets: 3, defaultReps: "10-12" },
    { name: "Chest-Supported Dumbbell Row", equipment: ["dumbbells"], defaultSets: 3, defaultReps: "10-12" },
    { name: "Seated Cable Row", equipment: ["seated_row", "cable_machine"], defaultSets: 4, defaultReps: "10-12" },
    { name: "Wide-Grip Cable Row", equipment: ["cable_machine"], defaultSets: 3, defaultReps: "12-15" },
    { name: "Straight-Arm Cable Pulldown", equipment: ["cable_machine"], defaultSets: 3, defaultReps: "12-15" },
    { name: "Dumbbell Pullover", equipment: ["dumbbells"], defaultSets: 3, defaultReps: "12-15" },
    { name: "T-Bar Row", equipment: ["barbell"], defaultSets: 4, defaultReps: "8-10" },
    { name: "Inverted Row", equipment: [], defaultSets: 3, defaultReps: "10-15" },
    { name: "Barbell Shrug", equipment: ["barbell"], defaultSets: 3, defaultReps: "12-15" },
    { name: "Deadlift", equipment: ["barbell"], defaultSets: 3, defaultReps: "5-8" },
  ],
  shoulders: [
    { name: "Overhead Barbell Press", equipment: ["barbell"], defaultSets: 4, defaultReps: "6-10" },
    { name: "Seated Dumbbell Shoulder Press", equipment: ["dumbbells"], defaultSets: 4, defaultReps: "8-12" },
    { name: "Arnold Press", equipment: ["dumbbells"], defaultSets: 3, defaultReps: "10-12" },
    { name: "Dumbbell Lateral Raise", equipment: ["dumbbells"], defaultSets: 4, defaultReps: "12-15" },
    { name: "Cable Lateral Raise", equipment: ["cable_machine"], defaultSets: 3, defaultReps: "12-15" },
    { name: "Dumbbell Front Raise", equipment: ["dumbbells"], defaultSets: 3, defaultReps: "12-15" },
    { name: "Cable Face Pull", equipment: ["cable_machine"], defaultSets: 3, defaultReps: "15-20" },
    { name: "Reverse Pec Deck", equipment: ["pec_deck"], defaultSets: 3, defaultReps: "12-15" },
    { name: "Dumbbell Rear Delt Fly", equipment: ["dumbbells"], defaultSets: 3, defaultReps: "12-15" },
    { name: "Machine Shoulder Press", equipment: ["shoulder_press_machine"], defaultSets: 3, defaultReps: "10-12" },
    { name: "Smith Machine Overhead Press", equipment: ["smith_machine"], defaultSets: 4, defaultReps: "8-10" },
    { name: "Barbell Upright Row", equipment: ["barbell"], defaultSets: 3, defaultReps: "10-12" },
    { name: "Resistance Band Lateral Raise", equipment: ["resistance_bands"], defaultSets: 3, defaultReps: "15-20" },
    { name: "Pike Push-Up", equipment: [], defaultSets: 3, defaultReps: "8-15" },
    { name: "Kettlebell Push Press", equipment: ["kettlebells"], defaultSets: 3, defaultReps: "8-10" },
  ],
  biceps: [
    { name: "Barbell Curl", equipment: ["barbell"], defaultSets: 3, defaultReps: "8-12" },
    { name: "EZ-Bar Curl", equipment: ["ez_bar"], defaultSets: 3, defaultReps: "8-12" },
    { name: "Dumbbell Curl", equipment: ["dumbbells"], defaultSets: 3, defaultReps: "10-12" },
    { name: "Hammer Curl", equipment: ["dumbbells"], defaultSets: 3, defaultReps: "10-12" },
    { name: "Incline Dumbbell Curl", equipment: ["dumbbells"], defaultSets: 3, defaultReps: "10-12" },
    { name: "Concentration Curl", equipment: ["dumbbells"], defaultSets: 3, defaultReps: "12-15" },
    { name: "Cable Curl", equipment: ["cable_machine"], defaultSets: 3, defaultReps: "12-15" },
    { name: "Cable Rope Hammer Curl", equipment: ["cable_machine"], defaultSets: 3, defaultReps: "12-15" },
    { name: "Preacher Curl", equipment: ["ez_bar", "barbell"], defaultSets: 3, defaultReps: "10-12" },
    { name: "Machine Preacher Curl", equipment: ["cable_machine"], defaultSets: 3, defaultReps: "10-12" },
    { name: "Spider Curl", equipment: ["dumbbells"], defaultSets: 3, defaultReps: "12-15" },
    { name: "Chin-Up", equipment: ["pull_up_bar"], defaultSets: 3, defaultReps: "6-10" },
    { name: "Resistance Band Curl", equipment: ["resistance_bands"], defaultSets: 3, defaultReps: "15-20" },
    { name: "Reverse Barbell Curl", equipment: ["barbell", "ez_bar"], defaultSets: 3, defaultReps: "10-12" },
    { name: "Zottman Curl", equipment: ["dumbbells"], defaultSets: 3, defaultReps: "10-12" },
  ],
  triceps: [
    { name: "Close-Grip Bench Press", equipment: ["barbell"], defaultSets: 3, defaultReps: "8-10" },
    { name: "Cable Tricep Pushdown", equipment: ["cable_machine"], defaultSets: 3, defaultReps: "12-15" },
    { name: "Rope Pushdown", equipment: ["cable_machine"], defaultSets: 3, defaultReps: "12-15" },
    { name: "Overhead Cable Extension", equipment: ["cable_machine"], defaultSets: 3, defaultReps: "12-15" },
    { name: "Skull Crusher", equipment: ["ez_bar", "barbell"], defaultSets: 3, defaultReps: "10-12" },
    { name: "Dumbbell Overhead Extension", equipment: ["dumbbells"], defaultSets: 3, defaultReps: "10-12" },
    { name: "Dumbbell Tricep Kickback", equipment: ["dumbbells"], defaultSets: 3, defaultReps: "12-15" },
    { name: "Tricep Dip", equipment: ["dip_bars"], defaultSets: 3, defaultReps: "8-12" },
    { name: "Bench Dip", equipment: [], defaultSets: 3, defaultReps: "10-15" },
    { name: "Diamond Push-Up", equipment: [], defaultSets: 3, defaultReps: "10-20" },
    { name: "JM Press", equipment: ["barbell", "ez_bar"], defaultSets: 3, defaultReps: "8-10" },
    { name: "Single-Arm Cable Pushdown", equipment: ["cable_machine"], defaultSets: 3, defaultReps: "12-15" },
    { name: "Resistance Band Pushdown", equipment: ["resistance_bands"], defaultSets: 3, defaultReps: "15-20" },
    { name: "Kettlebell Overhead Extension", equipment: ["kettlebells"], defaultSets: 3, defaultReps: "10-12" },
    { name: "Smith Machine Close-Grip Press", equipment: ["smith_machine"], defaultSets: 3, defaultReps: "8-10" },
  ],
  legs: [
    { name: "Barbell Back Squat", equipment: ["barbell"], defaultSets: 4, defaultReps: "6-10" },
    { name: "Front Squat", equipment: ["barbell"], defaultSets: 4, defaultReps: "6-8" },
    { name: "Leg Press", equipment: ["leg_press"], defaultSets: 4, defaultReps: "10-15" },
    { name: "Romanian Deadlift", equipment: ["barbell", "dumbbells"], defaultSets: 4, defaultReps: "8-10" },
    { name: "Bulgarian Split Squat", equipment: ["dumbbells"], defaultSets: 3, defaultReps: "8-12" },
    { name: "Walking Lunge", equipment: ["dumbbells"], defaultSets: 3, defaultReps: "10-12" },
    { name: "Goblet Squat", equipment: ["dumbbells", "kettlebells"], defaultSets: 3, defaultReps: "10-15" },
    { name: "Leg Curl", equipment: ["leg_curl"], defaultSets: 3, defaultReps: "10-15" },
    { name: "Leg Extension", equipment: ["leg_extension"], defaultSets: 3, defaultReps: "12-15" },
    { name: "Hip Thrust", equipment: ["barbell"], defaultSets: 4, defaultReps: "8-12" },
    { name: "Standing Calf Raise", equipment: ["dumbbells", "smith_machine"], defaultSets: 4, defaultReps: "12-20" },
    { name: "Seated Calf Raise", equipment: ["dumbbells"], defaultSets: 4, defaultReps: "15-20" },
    { name: "Smith Machine Squat", equipment: ["smith_machine"], defaultSets: 4, defaultReps: "8-12" },
    { name: "Step-Up", equipment: ["dumbbells"], defaultSets: 3, defaultReps: "10-12" },
    { name: "Bodyweight Squat", equipment: [], defaultSets: 3, defaultReps: "15-25" },
    { name: "Nordic Hamstring Curl", equipment: [], defaultSets: 3, defaultReps: "6-10" },
  ],
  "abs and core": [
    { name: "Hanging Leg Raise", equipment: ["pull_up_bar"], defaultSets: 3, defaultReps: "10-15" },
    { name: "Cable Crunch", equipment: ["cable_machine"], defaultSets: 3, defaultReps: "12-15" },
    { name: "Plank", equipment: [], defaultSets: 3, defaultReps: "30-60s" },
    { name: "Side Plank", equipment: [], defaultSets: 3, defaultReps: "30-45s" },
    { name: "Dead Bug", equipment: [], defaultSets: 3, defaultReps: "10 each side" },
    { name: "Bicycle Crunch", equipment: [], defaultSets: 3, defaultReps: "15-20" },
    { name: "Russian Twist", equipment: ["dumbbells", "kettlebells"], defaultSets: 3, defaultReps: "20 total" },
    { name: "Pallof Press", equipment: ["cable_machine", "resistance_bands"], defaultSets: 3, defaultReps: "10 each side" },
    { name: "Cable Woodchop", equipment: ["cable_machine"], defaultSets: 3, defaultReps: "12 each side" },
    { name: "Lying Leg Raise", equipment: [], defaultSets: 3, defaultReps: "12-15" },
    { name: "V-Up", equipment: [], defaultSets: 3, defaultReps: "10-15" },
    { name: "Hollow Body Hold", equipment: [], defaultSets: 3, defaultReps: "20-40s" },
    { name: "Mountain Climber", equipment: [], defaultSets: 3, defaultReps: "20-30" },
    { name: "Weighted Decline Sit-Up", equipment: ["dumbbells"], defaultSets: 3, defaultReps: "12-15" },
    { name: "Copenhagen Plank", equipment: [], defaultSets: 3, defaultReps: "20-30s" },
  ],
};

// Filter a muscle group's exercises by the user's available equipment.
// Bodyweight exercises (empty equipment) always pass.
export function exercisesForEquipment(muscle: LibraryMuscle, userEquipment: string[]): LibraryExercise[] {
  const owned = new Set(userEquipment);
  return EXERCISE_LIBRARY[muscle].filter(
    (ex) => ex.equipment.length === 0 || ex.equipment.some((e) => owned.has(e))
  );
}
