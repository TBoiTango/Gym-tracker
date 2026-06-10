// ─────────────────────────────────────────────────────────────────────────────
// PROGRAM BANK — Admin-curated exercise library
// These exercises are drawn from the uploaded workout programs and are used
// as a high-priority reference when generating any session.
// To add more programs, just append entries to the relevant category array.
// ─────────────────────────────────────────────────────────────────────────────

export interface BankExercise {
  name: string;
  sets: number;
  rep_range: string;
  rest_seconds: number;
  coaching_note: string;
}

// ── PUSH (Chest, Shoulders, Triceps) ─────────────────────────────────────────
export const PUSH_BANK: BankExercise[] = [
  // Chest — Compounds
  { name: "Barbell Incline Bench Press",          sets: 4, rep_range: "5-7",   rest_seconds: 90, coaching_note: "Drive elbows down and back; lower the bar to upper chest with full control." },
  { name: "Flat Barbell Bench Press",             sets: 4, rep_range: "6-8",   rest_seconds: 90, coaching_note: "Arch slightly, retract scapula, explode up and lower with a 3-sec eccentric." },
  { name: "Flat Dumbbell Press",                  sets: 3, rep_range: "8-10",  rest_seconds: 75, coaching_note: "3-second eccentric; let the dumbbells stretch the chest at the bottom." },
  { name: "Incline Dumbbell Press",               sets: 3, rep_range: "10-12", rest_seconds: 75, coaching_note: "Keep elbows at 45° and stop 2 reps short of failure for better recovery." },
  { name: "Neutral Grip Dumbbell Press",          sets: 4, rep_range: "8-10",  rest_seconds: 75, coaching_note: "Squeeze the dumbbells together throughout the movement for peak chest contraction." },
  { name: "Weighted Dips",                        sets: 3, rep_range: "8-12",  rest_seconds: 75, coaching_note: "Lean forward with chest bias; control the descent and get a full stretch at bottom." },
  { name: "Hex Press",                            sets: 4, rep_range: "6-8",   rest_seconds: 75, coaching_note: "Press dumbbells together throughout — constant inward pressure isolates the sternal chest." },

  // Chest — Isolation / Cables
  { name: "Cable Fly Low to High",                sets: 3, rep_range: "12-15", rest_seconds: 60, coaching_note: "Drive hands upward and together; 2-second squeeze at peak contraction." },
  { name: "Cable Fly High to Low",                sets: 3, rep_range: "12-15", rest_seconds: 60, coaching_note: "Slight forward lean, sweep hands down and together, full stretch at top." },
  { name: "Cable Fly Mid",                        sets: 3, rep_range: "12-15", rest_seconds: 60, coaching_note: "Keep a slight elbow bend; think hugging a tree, not pulling a weight." },
  { name: "Cable Chest Press",                    sets: 3, rep_range: "12-15", rest_seconds: 60, coaching_note: "Lean into the cable for constant tension; squeeze hard at lockout." },
  { name: "Single Arm Dumbbell Chest Fly",        sets: 4, rep_range: "10-12", rest_seconds: 60, coaching_note: "Control the arc; feel a full stretch at the bottom before contracting." },
  { name: "Incline Cable Fly",                    sets: 4, rep_range: "12-15", rest_seconds: 60, coaching_note: "Set the cable low, angle cable upward to upper chest; maintain tension throughout." },

  // Shoulders — Compounds & Press
  { name: "Overhead Dumbbell Shoulder Press",     sets: 3, rep_range: "6-8",   rest_seconds: 90, coaching_note: "Stay upright, core braced; lower to ear height and press straight up." },
  { name: "Seated Dumbbell Press",                sets: 5, rep_range: "6-8",   rest_seconds: 90, coaching_note: "Heavy and controlled; full ROM from ear height to lockout." },
  { name: "Standing Barbell Military Press",      sets: 4, rep_range: "6-8",   rest_seconds: 90, coaching_note: "Grip just outside shoulder width; core tight, slight hip extension at lockout." },
  { name: "Arnold Press",                         sets: 3, rep_range: "8-10",  rest_seconds: 75, coaching_note: "Rotate palms in as you lower; slow the descent to activate all three delt heads." },
  { name: "Smith Machine Overhead Press",         sets: 4, rep_range: "8-10",  rest_seconds: 75, coaching_note: "Use a slightly wider grip than barbell; press through the crown of the head." },

  // Shoulders — Lateral & Rear Delt
  { name: "Dumbbell Lateral Raise",               sets: 4, rep_range: "12-15", rest_seconds: 60, coaching_note: "Lead with your pinky (pinky-up cue) to pre-rotate the humerus and isolate the middle delt." },
  { name: "Cable Lateral Raise",                  sets: 3, rep_range: "15-20", rest_seconds: 60, coaching_note: "Constant tension throughout; no swinging — slow controlled raise and lower." },
  { name: "Lateral Raise Mechanical Drop Set",    sets: 3, rep_range: "12-15", rest_seconds: 60, coaching_note: "Dumbbells to failure → immediately into partials → finish on cable. No rest between." },
  { name: "Front Dumbbell Raise",                 sets: 4, rep_range: "10-12", rest_seconds: 60, coaching_note: "Underhand grip (thumbs up) to spare the AC joint; controlled and explosive motion." },
  { name: "Seated Incline Front Raise",           sets: 4, rep_range: "10-12", rest_seconds: 60, coaching_note: "Chest down on incline bench, raise bar in front — isolates anterior delt with no momentum." },
  { name: "Rear Delt Fly",                        sets: 4, rep_range: "15-20", rest_seconds: 60, coaching_note: "Chest-supported or cable; drive elbows back and out — squeeze rhomboids and rear delts." },
  { name: "Upright Barbell Row",                  sets: 4, rep_range: "8-10",  rest_seconds: 75, coaching_note: "Wide grip to protect the AC joint; drive elbows high above wrists." },
  { name: "Upright Cable Row",                    sets: 5, rep_range: "10-12", rest_seconds: 60, coaching_note: "Rope attachment; drive elbows to ear height, pause at top for a full trap and delt contraction." },
  { name: "Face Pull",                            sets: 3, rep_range: "15-20", rest_seconds: 60, coaching_note: "Pull to forehead, externally rotate at the top; great for shoulder health and rear delt." },
  { name: "Trap Shrug Dumbbell",                  sets: 4, rep_range: "10-12", rest_seconds: 60, coaching_note: "Slow eccentric; pause at the top for a full trap contraction." },

  // Triceps
  { name: "Seated Overhead Dumbbell Extension",   sets: 4, rep_range: "8-10",  rest_seconds: 75, coaching_note: "Both hands on one dumbbell; lower behind the head for a deep long-head stretch." },
  { name: "Single Arm Dumbbell Skull Crusher",    sets: 4, rep_range: "8-10",  rest_seconds: 75, coaching_note: "Isolate each arm; keep upper arm perpendicular to the bench and hinge only at the elbow." },
  { name: "Close Grip Barbell Bench Press",       sets: 4, rep_range: "6-8",   rest_seconds: 90, coaching_note: "Hands slightly inside shoulder width; tuck elbows and lower with control." },
  { name: "Kneeling Rope Pressdown",              sets: 4, rep_range: "10-12", rest_seconds: 60, coaching_note: "Kneeling position removes momentum; focus on the stretch and full lockout." },
  { name: "Overhead Rope Tricep Extension",       sets: 4, rep_range: "10-12", rest_seconds: 60, coaching_note: "Hinge forward slightly; drive the rope handles apart at full extension." },
  { name: "Reverse Grip Pressdown",               sets: 4, rep_range: "10-12", rest_seconds: 60, coaching_note: "Underhand grip activates the lateral head; slow the return for more time under tension." },
  { name: "Cable Skull Crusher",                  sets: 4, rep_range: "10-12", rest_seconds: 60, coaching_note: "Lying on bench, bar from low cable pulley; 2 sets palms up, 2 sets palms down." },
  { name: "Dumbbell Tate Press",                  sets: 4, rep_range: "10-12", rest_seconds: 60, coaching_note: "Start like a skull crusher; flare elbows out toward chest — hits medial and lateral heads." },
  { name: "V-Bar Pressdown Mechanical Drop Set",  sets: 3, rep_range: "8-8-8", rest_seconds: 60, coaching_note: "Wide grip ×8 → immediately close-grip ×8 → drop weight ×8. No rest between grips." },
  { name: "Weighted Bench Dip",                   sets: 4, rep_range: "10-12", rest_seconds: 75, coaching_note: "Keep chest upright and elbows tucked; lower until elbows hit 90° for tricep emphasis." },

  // Additional variations (Month 1/2 weekly split)
  { name: "Decline Cable Fly (Pinky to Pinky)",   sets: 4, rep_range: "8-10",  rest_seconds: 60, coaching_note: "Set cables high, sweep down and across with pinkies leading to finish — targets lower chest." },
  { name: "Single Arm Skull Crusher to Pullover Combo", sets: 3, rep_range: "8",  rest_seconds: 75, coaching_note: "Perform a skull crusher, then extend the straight arm behind the head into a pullover — compound triceps and lat stretch." },
  { name: "Cable Kickback",                       sets: 4, rep_range: "8-12",  rest_seconds: 45, coaching_note: "Hinge forward, keep upper arm pinned to your side, extend straight back and squeeze." },
  { name: "Incline Cable Overhead Tricep Extension", sets: 4, rep_range: "8-10", rest_seconds: 60, coaching_note: "Lie on an incline bench facing away from the cable; extend arms overhead for a deep long-head stretch." },
  { name: "Single Arm Behind-Neck Tricep Extension", sets: 4, rep_range: "8-10", rest_seconds: 60, coaching_note: "Isolate one arm at a time; keep the elbow high and close to the head throughout." },
  { name: "Single Arm Upright Row with Plate",    sets: 4, rep_range: "8",     rest_seconds: 60, coaching_note: "Drive the elbow up and keep the plate close to the body for trap and lateral delt emphasis." },
  { name: "Neutral Grip Front Raise (Soda Can Raise)", sets: 4, rep_range: "8", rest_seconds: 60, coaching_note: "Hold dumbbells with thumbs up like soda cans; raise straight in front with control — easy on the shoulder joint." },
  { name: "Pyramid Lateral Raise Drop Set",       sets: 1, rep_range: "6 per drop", rest_seconds: 60, coaching_note: "Start heaviest, drop weight every 6 reps with no rest until you reach the lightest dumbbells." },
  { name: "High Rope Trap Pull",                  sets: 4, rep_range: "8",     rest_seconds: 60, coaching_note: "Pull the rope toward your forehead/crown, driving elbows high to hammer the upper traps." },
  { name: "Resistance Band Tricep 21s",           sets: 3, rep_range: "21",    rest_seconds: 60, coaching_note: "Anchor a band overhead: 7 bottom-half reps, 7 top-half reps, 7 full reps with no rest between." },
];

// ── PULL (Back, Biceps) ───────────────────────────────────────────────────────
export const PULL_BANK: BankExercise[] = [
  // Back — Vertical Pull
  { name: "Weighted Pull-Up",                     sets: 4, rep_range: "6-8",   rest_seconds: 90, coaching_note: "Full hang at the bottom, chin over bar at top; dead stop between reps." },
  { name: "Wide Grip Lat Pulldown",               sets: 4, rep_range: "10-12", rest_seconds: 75, coaching_note: "Lean back slightly, drive elbows down and back; squeeze lats hard at the bottom." },
  { name: "V-Grip Lat Pulldown",                  sets: 4, rep_range: "10-12", rest_seconds: 75, coaching_note: "Neutral grip attachment; focus on the mid-back and lower lats." },
  { name: "Rope Lat Pulldown",                    sets: 4, rep_range: "10-12", rest_seconds: 75, coaching_note: "Pull handles apart at the bottom to hit outer lats; full stretch at top." },
  { name: "Straight Arm Lat Pressdown",           sets: 4, rep_range: "10-12", rest_seconds: 60, coaching_note: "Arms stay straight the entire way; sweep the bar down in an arc to fully isolate lats." },
  { name: "Side Lat Cable Pulldown",              sets: 4, rep_range: "10-12", rest_seconds: 60, coaching_note: "Stand perpendicular to machine; pull down with one arm and focus on the lat stretch." },

  // Back — Horizontal Pull / Rows
  { name: "Barbell Row",                          sets: 4, rep_range: "6-8",   rest_seconds: 90, coaching_note: "Strict form, flat back; pull bar toward your waist, squeeze shoulder blades at the top." },
  { name: "Underhand Barbell Row",                sets: 4, rep_range: "8-10",  rest_seconds: 75, coaching_note: "Reverse grip shifts emphasis to biceps and lower lats; full stretch at bottom." },
  { name: "Chest Supported Dumbbell Row",         sets: 4, rep_range: "8-12",  rest_seconds: 75, coaching_note: "Chest on incline bench to eliminate momentum; full stretch and hard squeeze each rep." },
  { name: "Chest Supported T-Bar Row",            sets: 3, rep_range: "10-12", rest_seconds: 75, coaching_note: "Keep chest on the pad; drive elbows back and squeeze the rhomboids at the top." },
  { name: "Single Arm Dumbbell Row",              sets: 4, rep_range: "10-12", rest_seconds: 75, coaching_note: "Brace on a bench; let the weight stretch the lat fully, then row to hip." },
  { name: "Single Arm Cable Row with Rotation",   sets: 4, rep_range: "10-12", rest_seconds: 75, coaching_note: "Slight torso rotation on each rep for full lat contraction; control the return." },
  { name: "Seated Cable Row",                     sets: 3, rep_range: "12-15", rest_seconds: 60, coaching_note: "Neutral grip, sit tall; drive elbows back past your torso and squeeze the mid-back." },

  // Back — Hinge
  { name: "Deadlift",                             sets: 5, rep_range: "4-6",   rest_seconds: 90, coaching_note: "Push the floor away; maintain a neutral spine and keep the bar close throughout." },
  { name: "Romanian Deadlift",                    sets: 4, rep_range: "8-10",  rest_seconds: 75, coaching_note: "Hinge at the hips, soft knees; feel the hamstring stretch before driving hips forward." },
  { name: "Back Extension with Barbell",          sets: 4, rep_range: "10-12", rest_seconds: 60, coaching_note: "Hold barbell or plate on chest; full extension at top, neutral spine throughout." },

  // Biceps
  { name: "Barbell Curl",                         sets: 3, rep_range: "8-10",  rest_seconds: 75, coaching_note: "Alternate close and wide grip across sets for full bicep development; no swinging." },
  { name: "EZ Bar Curl",                          sets: 3, rep_range: "8-10",  rest_seconds: 75, coaching_note: "Slightly supinated grip; controlled 2-second eccentric on every rep." },
  { name: "Incline Dumbbell Curl",                sets: 3, rep_range: "10-12", rest_seconds: 60, coaching_note: "Lie back on incline; full hang at the bottom to stretch the long head before curling." },
  { name: "Dumbbell Preacher Curl",               sets: 3, rep_range: "10-12", rest_seconds: 60, coaching_note: "3-second negative; focus on the eccentric for maximum bicep damage." },
  { name: "Crossover Cable Curl",                 sets: 4, rep_range: "12-15", rest_seconds: 60, coaching_note: "Palms face inward; cables cross slightly in front of the body for a peak contraction." },
  { name: "Standing Cable Curl",                  sets: 4, rep_range: "12-15", rest_seconds: 60, coaching_note: "Iso-hold at the top for 1 second; cable keeps tension on the bicep throughout." },
  { name: "Reverse Grip Barbell Curl",            sets: 3, rep_range: "10-12", rest_seconds: 60, coaching_note: "Overhand grip targets brachialis and forearms; keep elbows pinned to the side." },
  { name: "Zottman Curl",                         sets: 4, rep_range: "8-10",  rest_seconds: 60, coaching_note: "Curl up supinated, rotate to pronated at the top, lower overhand — hits both heads and forearms." },
  { name: "Chin-Up to Failure",                   sets: 1, rep_range: "max",   rest_seconds: 60, coaching_note: "Underhand palms-facing-you grip; use as a burnout finisher." },
  { name: "Preacher Curl Machine 21s",            sets: 3, rep_range: "21",    rest_seconds: 75, coaching_note: "7 bottom-range → 7 top-range → 7 full reps with no rest between — brutal pump set." },

  // Additional variations (Month 1/2 weekly split)
  { name: "Incline Bench Row (Heavy)",            sets: 4, rep_range: "6-8",   rest_seconds: 90, coaching_note: "Chest braced on an incline bench, row heavy with strict form — minimal momentum." },
  { name: "Back Extension Deadlift",              sets: 4, rep_range: "8",     rest_seconds: 75, coaching_note: "Hold a barbell or dumbbell against your chest on the back extension bench; full hip hinge each rep." },
  { name: "Negative Incline Dumbbell Curl",       sets: 4, rep_range: "8",     rest_seconds: 60, coaching_note: "Curl up with both arms, then lower one arm for a slow 3-second eccentric on an incline bench." },
  { name: "Single Arm Row (No Attachment)",       sets: 4, rep_range: "8",     rest_seconds: 75, coaching_note: "Grip the cable bar/handle directly with one hand; row to the hip and squeeze the lat hard." },
];

// ── LEGS (Quads, Hamstrings, Glutes, Calves) ──────────────────────────────────
export const LEGS_BANK: BankExercise[] = [
  // Quad Dominant
  { name: "Barbell Back Squat",                   sets: 4, rep_range: "6-8",   rest_seconds: 90, coaching_note: "Full depth; drive knees out and chest up. Controlled 2-sec descent." },
  { name: "Front Squat with Pause",               sets: 4, rep_range: "6-8",   rest_seconds: 90, coaching_note: "2-second pause at the bottom; elbows high, upright torso." },
  { name: "Hack Squat",                           sets: 4, rep_range: "6-8",   rest_seconds: 90, coaching_note: "Last set use a slow eccentric; full depth, feet shoulder-width." },
  { name: "Bulgarian Split Squat",                sets: 4, rep_range: "8-10",  rest_seconds: 75, coaching_note: "Rear foot elevated, drive through front heel; pause at the bottom for full glute stretch." },
  { name: "Walking Lunge",                        sets: 3, rep_range: "20 steps", rest_seconds: 75, coaching_note: "Full stride length for hip engagement; keep chest upright throughout." },
  { name: "Weighted Step-Up",                     sets: 4, rep_range: "8-10",  rest_seconds: 75, coaching_note: "Drive through the heel of the elevated foot; fully extend the hip at the top." },
  { name: "Leg Extension",                        sets: 4, rep_range: "12-15", rest_seconds: 60, coaching_note: "Pause at the top for a full quad contraction; slow the eccentric to 3 seconds." },
  { name: "Leg Press High and Narrow",            sets: 2, rep_range: "15-20", rest_seconds: 60, coaching_note: "Feet high and narrow for inner quad emphasis; go to failure on the last set." },
  { name: "Leg Press",                            sets: 4, rep_range: "10-12", rest_seconds: 75, coaching_note: "Keep heels down, drive knees forward; do not lock out at the top." },

  // Hamstring Dominant
  { name: "Romanian Deadlift",                    sets: 3, rep_range: "8-10",  rest_seconds: 75, coaching_note: "Push hips back and feel the hamstring stretch before driving hips forward." },
  { name: "Seated Leg Curl",                      sets: 3, rep_range: "12-15", rest_seconds: 60, coaching_note: "Full stretch at the top, 2-second pause at peak contraction." },
  { name: "Lying Leg Curl",                       sets: 4, rep_range: "10-12", rest_seconds: 60, coaching_note: "3-second eccentric for maximum hamstring activation; full hip extension at the start." },
  { name: "Nordic Hamstring Curl",                sets: 3, rep_range: "5-8",   rest_seconds: 90, coaching_note: "Control the descent as slowly as possible; use hands to catch yourself at the bottom." },

  // Glute Dominant
  { name: "Glute Bridge with Barbell",            sets: 3, rep_range: "10-12", rest_seconds: 75, coaching_note: "Drive through heels; 2-second pause at the top with a hard glute squeeze." },
  { name: "Hip Abduction Machine",                sets: 4, rep_range: "12-15", rest_seconds: 60, coaching_note: "Full range of motion both in and out; pause at peak contraction each direction." },

  // Calves
  { name: "Standing Calf Raise",                  sets: 4, rep_range: "12-15", rest_seconds: 60, coaching_note: "Full stretch at the bottom; 1-second pause at the top on every rep." },
  { name: "Seated Calf Raise",                    sets: 4, rep_range: "15-20", rest_seconds: 45, coaching_note: "Slow eccentric; calves grow with high volume and full ROM." },

  // Additional variations (Month 1/2 weekly split)
  { name: "Back Squat with Pause",                sets: 4, rep_range: "6-8",   rest_seconds: 90, coaching_note: "3-second pause at the bottom of every rep to kill momentum and build raw strength." },
  { name: "Front Squat (Heavy)",                  sets: 5, rep_range: "4",     rest_seconds: 120, coaching_note: "Elbows high, bar resting on front delts; brace hard and stay upright through a heavy set of low reps." },
];

// ── CORE — finishers organized by day type ───────────────────────────────────
export const PUSH_CORE: BankExercise[] = [
  { name: "Ab Wheel Rollout",                     sets: 3, rep_range: "8-12",  rest_seconds: 60, coaching_note: "Brace hard, roll out as far as you can without arching the lower back, then pull back in." },
  { name: "Decline Bench Leg Raise",              sets: 3, rep_range: "12-15", rest_seconds: 45, coaching_note: "Keep legs straight and lower under control; don't let momentum take over." },
  { name: "RKC Plank",                            sets: 3, rep_range: "20-30 sec", rest_seconds: 45, coaching_note: "Maximal full-body tension — glutes, abs, and lats squeezed as hard as possible." },
];

export const PULL_CORE: BankExercise[] = [
  { name: "Hanging Knee Raise",                   sets: 3, rep_range: "10-15", rest_seconds: 45, coaching_note: "Avoid swinging; curl the pelvis up at the top for full lower-ab engagement." },
  { name: "Single Arm Cable Row Hold",            sets: 3, rep_range: "20 sec each side", rest_seconds: 45, coaching_note: "Hold the row position at peak contraction — anti-rotation core and lat isometric." },
  { name: "Bird Dog",                             sets: 2, rep_range: "10 each side", rest_seconds: 30, coaching_note: "Extend opposite arm and leg slowly while keeping the spine completely still." },
];

export const LEGS_CORE: BankExercise[] = [
  { name: "Heavy Farmer Carry",                   sets: 4, rep_range: "40-60 ft", rest_seconds: 60, coaching_note: "Brace your core like a plank while walking; don't let the weights swing." },
  { name: "Front Rack or Goblet Carry Hold",      sets: 3, rep_range: "30-45 sec", rest_seconds: 45, coaching_note: "Hold the weight at chest height with elbows up — demands serious anti-extension core strength." },
  { name: "Weighted Plank",                       sets: 3, rep_range: "30 sec",  rest_seconds: 45, coaching_note: "Add a plate to your back; keep hips level and glutes squeezed throughout." },
];

export const UPPER_CORE: BankExercise[] = [
  { name: "Cable Crunch",                         sets: 4, rep_range: "12-15", rest_seconds: 45, coaching_note: "Crunch from the spine, not the hips — keep hips stationary and curl the ribcage down." },
  { name: "Hanging Leg Raise",                    sets: 3, rep_range: "12",    rest_seconds: 45, coaching_note: "Raise legs to at least parallel with control; avoid swinging on the bar." },
  { name: "Pallof Press",                         sets: 3, rep_range: "12 each side", rest_seconds: 45, coaching_note: "Resist the cable's pull to rotate your torso — press straight out and hold." },
];

export const ACTIVE_CORE: BankExercise[] = [
  { name: "Dead Bug",                             sets: 2, rep_range: "10 each side", rest_seconds: 30, coaching_note: "Press the lower back into the floor throughout; move opposite arm/leg slowly." },
  { name: "Side Plank",                           sets: 2, rep_range: "30 sec each side", rest_seconds: 30, coaching_note: "Stack hips and shoulders in a straight line; don't let the hips sag." },
  { name: "Light Cable Woodchopper",              sets: 2, rep_range: "12 each side", rest_seconds: 30, coaching_note: "Rotate from the core, not the arms — controlled tempo through the full diagonal." },
];

export const ATHLETIC_CORE: BankExercise[] = [
  { name: "Med Ball Slam",                        sets: 4, rep_range: "10",    rest_seconds: 45, coaching_note: "Use the whole body — reach high, then slam explosively through the hips and core." },
  { name: "Rotational Throw",                     sets: 3, rep_range: "8 each side", rest_seconds: 45, coaching_note: "Generate power from the hips and torso, not just the arms — explosive release." },
  { name: "Offset Farmer Carry",                  sets: 3, rep_range: "40 ft each side", rest_seconds: 45, coaching_note: "Carry a single heavy weight on one side; resist leaning — pure anti-lateral-flexion core work." },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Map a day name to a bank category */
export function getBankForDay(dayName: string): BankExercise[] {
  const n = dayName.toLowerCase();
  if (n.includes("push") || n.includes("chest") || n.includes("shoulder") || n.includes("tricep")) return PUSH_BANK;
  if (n.includes("pull") || n.includes("back") || n.includes("bicep")) return PULL_BANK;
  if (n.includes("leg") || n.includes("lower") || n.includes("squat")) return LEGS_BANK;
  return [];
}

/** Map a day name to a core finisher set */
export function getCoreForDay(dayName: string): BankExercise[] {
  const n = dayName.toLowerCase();
  if (n.includes("push") || n.includes("chest") || n.includes("shoulder") || n.includes("tricep")) return PUSH_CORE;
  if (n.includes("pull") || n.includes("back") || n.includes("bicep")) return PULL_CORE;
  if (n.includes("leg") || n.includes("lower") || n.includes("squat")) return LEGS_CORE;
  if (n.includes("upper") || n.includes("full body") || n.includes("full-body")) return UPPER_CORE;
  if (n.includes("active") || n.includes("recovery") || n.includes("off")) return ACTIVE_CORE;
  if (n.includes("athletic") || n.includes("conditioning")) return ATHLETIC_CORE;
  return [];
}

/**
 * Return a formatted string for the generate-day prompt listing
 * the bank exercises relevant to this session.
 *
 * IMPORTANT: this is a source of INSPIRATION, not a strict pull-from list.
 * Claude should blend these proven movements with its own generated exercises
 * to keep sessions varied and fresh — never just copy the list verbatim.
 */
export function formatBankForPrompt(dayName: string): string {
  const bank = getBankForDay(dayName);
  const core = getCoreForDay(dayName);
  if (!bank.length && !core.length) return "";

  let section = `EXERCISE REFERENCE LIBRARY — inspiration drawn from real, proven workout programs:
Use this library as a creative reference, NOT a script to copy. Treat these as a pool of high-quality, proven movements (with sets/rep ranges/rest that have worked well in practice). Blend a mix of these library exercises with your own generated exercise choices so each session feels fresh and varied — do NOT build the session entirely from this list, and do NOT use the same subset every time. Vary which library exercises you draw from across sessions, and feel free to substitute your own ideas for any movement, especially if it improves variety, equipment fit, or matches the user's history.

${bank.map((ex, i) =>
  `  ${i + 1}. ${ex.name} — ${ex.sets} sets × ${ex.rep_range} (${ex.rest_seconds}s rest)\n     Cue: ${ex.coaching_note}`
).join("\n")}`;

  if (core.length) {
    section += `\n\nOPTIONAL CORE FINISHER — if the session has time/space for a short core finisher, draw inspiration from (not limited to):
${core.map((ex, i) =>
  `  ${i + 1}. ${ex.name} — ${ex.sets} sets × ${ex.rep_range} (${ex.rest_seconds}s rest)\n     Cue: ${ex.coaching_note}`
).join("\n")}`;
  }

  return section;
}
